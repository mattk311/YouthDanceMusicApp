import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
import passport from "../auth";
import { searchSong, getAutocompleteSuggestions } from "../spotify";
import { getSpotifyAuthUrl, exchangeSpotifyCode, isSpotifyConnected, getUserPlaylists, getPlaylistTracks, addTrackToPlaylist, disconnectSpotify } from "../spotifyUserClient";
import { evaluateSongForLDSChurchDance } from "../ai-evaluator";
import type { User, Song } from "@workspace/db";
import { storage } from "../storage";
import {
  publicRequestBurstLimiter,
  publicRequestPerDanceLimiter,
} from "../middlewares/rateLimits";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { z } from "zod/v4";

const FREE_DAILY_LIMIT = 5;

// Backfill missing AI fields (especially aiDanceability) on a cached song.
// Returns the song unchanged if backfill is unnecessary or AI fails.
async function backfillSongAiFields(cachedSong: Song): Promise<Song> {
  if (cachedSong.aiUnavailable || cachedSong.aiDanceability != null) {
    return cachedSong;
  }
  try {
    const evaluation = await evaluateSongForLDSChurchDance(
      cachedSong.songName,
      cachedSong.artistName,
      cachedSong.albumName || undefined,
    );
    const updated = await storage.updateSongBySearchKey(cachedSong.searchKey, {
      aiRecommendation: evaluation.recommendation,
      aiReasoning: evaluation.reasoning,
      aiConcerns: evaluation.concerns,
      aiPositives: evaluation.positives,
      aiDanceType: evaluation.danceType,
      aiIsLineDance: evaluation.isLineDance,
      aiDanceability: evaluation.danceability,
    });
    if (updated) {
      console.log(`[Backfill] Updated AI fields for: ${cachedSong.songName} - ${cachedSong.artistName} (danceability=${evaluation.danceability})`);
      return updated;
    }
  } catch (err) {
    console.error(`[Backfill] Failed for "${cachedSong.songName}":`, err);
  }
  return cachedSong;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Not authenticated" });
  }

  // Allowed deep-link redirects for mobile auth. We use exact-prefix matches
  // for production schemes and only permit Expo dev (`exp://`) URIs in
  // non-production. Restricting this is critical: this URL receives a freshly
  // minted bearer token, so an attacker controlling the redirect can steal it.
  const PROD_ALLOWED_PREFIXES = [
    "youthdancemusic://auth-callback",
    "youth-dance-music-mobile://auth-callback",
  ];

  function isAllowedMobileRedirect(redirect: string | undefined): boolean {
    if (!redirect) return false;
    if (PROD_ALLOWED_PREFIXES.some((p) => redirect === p || redirect.startsWith(p + "?"))) {
      return true;
    }
    // Permit Expo Go dev URIs only outside production (e.g. exp://host:port/--/auth-callback)
    if (process.env.NODE_ENV !== "production" && /^exp:\/\/[^/]+\/--\/auth-callback(\?|$)/.test(redirect)) {
      return true;
    }
    return false;
  }

  // Auth routes
  app.get(
    "/auth/google",
    (req, res, next) => {
      const returnTo = req.query.returnTo as string | undefined;
      const mode = req.query.mode as string | undefined;
      const redirect = req.query.redirect as string | undefined;

      if (returnTo && req.session) {
        (req.session as any).returnTo = returnTo;
      }

      if (mode === "mobile") {
        if (!isAllowedMobileRedirect(redirect)) {
          return res.status(400).send("Invalid mobile redirect URI");
        }
        if (req.session) {
          (req.session as any).mobileMode = true;
          (req.session as any).mobileRedirect = redirect;
        }
      }

      passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
    }
  );

  app.get(
    "/auth/google/callback",
    (req, res, next) => {
      passport.authenticate("google", async (err: any, user: any, info: any) => {
        // Read mobile-mode flags then immediately clear them, regardless of
        // outcome, so a failed mobile attempt can't taint a later browser sign-in.
        const mobileMode = (req.session as any)?.mobileMode === true;
        const mobileRedirect = (req.session as any)?.mobileRedirect as string | undefined;
        if (req.session) {
          delete (req.session as any).mobileMode;
          delete (req.session as any).mobileRedirect;
        }

        if (err) {
          console.error("[Auth] Google OAuth error:", err);
          return res.redirect("/?error=auth_failed");
        }
        if (!user) {
          console.error("[Auth] Google OAuth no user returned:", info);
          return res.redirect("/?error=auth_failed");
        }

        if (mobileMode && isAllowedMobileRedirect(mobileRedirect)) {
          // Mobile flow: don't create a browser session — generate a token
          // and bounce back into the native app via deep link.
          try {
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
            await storage.createMobileSession(token, (user as User).id, expiresAt);
            const url = `${mobileRedirect}?token=${encodeURIComponent(token)}`;
            return res.redirect(url);
          } catch (tokenErr) {
            console.error("[Auth] Mobile token creation error:", tokenErr);
            return res.redirect("/?error=auth_failed");
          }
        }

        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[Auth] Session login error:", loginErr);
            return res.redirect("/?error=auth_failed");
          }
          const returnTo = (req.session as any)?.returnTo || "/";
          delete (req.session as any).returnTo;
          return res.redirect(returnTo);
        });
      })(req, res, next);
    }
  );

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Mobile clients use this to revoke their bearer token. The bearerAuth
  // middleware exposes the token via req.mobileToken when authenticated.
  app.post("/api/auth/mobile-logout", async (req, res) => {
    const token = (req as any).mobileToken as string | undefined;
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      await storage.deleteMobileSession(token);
      res.json({ success: true });
    } catch (err) {
      console.error("[Auth] Mobile logout error:", err);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user as User);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Permanently delete the signed-in user's account and all associated data.
  // Works for both web (cookie session) and mobile (bearer token) clients.
  app.delete("/api/auth/account", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as User;
    const userId = user.id;

    // Best-effort: cancel any Stripe customer (also cancels active subscriptions).
    if (user.stripeCustomerId) {
      try {
        const stripe = await getUncachableStripeClient();
        await stripe.customers.del(user.stripeCustomerId);
      } catch (err) {
        req.log?.warn(
          { err, userId, stripeCustomerId: user.stripeCustomerId },
          "Failed to delete Stripe customer during account deletion",
        );
      }
    }

    try {
      await storage.deleteUserAccount(userId);
    } catch (err) {
      req.log?.error({ err, userId }, "Account deletion failed");
      return res.status(500).json({ error: "Failed to delete account" });
    }

    // Tear down whichever auth path the request came in on.
    const mobileToken = (req as any).mobileToken as string | undefined;
    if (mobileToken) {
      // Mobile session row was already removed by deleteUserAccount; nothing else to do.
      return res.json({ success: true });
    }
    req.logout((err) => {
      if (err) {
        req.log?.warn({ err, userId }, "Logout after account deletion failed");
      }
      res.json({ success: true });
    });
  });

  // Autocomplete suggestions route
  app.get("/api/songs/autocomplete", requireAuth, async (req, res) => {
    try {
      const { query, type } = req.query;

      if (!query || typeof query !== "string") {
        return res.json({ suggestions: [] });
      }

      const validType = type === "artist" ? "artist" : "track";
      const suggestions = await getAutocompleteSuggestions(query, validType);

      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting autocomplete suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // Get user usage status
  app.get("/api/usage", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const usage = await storage.getUserSearchUsage(user.id);
      res.json(usage);
    } catch (error) {
      console.error("Error getting usage:", error);
      res.status(500).json({ error: "Failed to get usage" });
    }
  });

  // Get Stripe publishable key
  app.get("/api/stripe/config", requireAuth, async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // Get subscription price
  app.get("/api/subscription/price", requireAuth, async (req, res) => {
    try {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const sqlClient = neon(connectionString);
      const db = drizzle(sqlClient);
      
      const result = await db.execute(sql`
        SELECT pr.id as price_id, pr.unit_amount, pr.currency, p.name as product_name, p.description
        FROM stripe.prices pr
        JOIN stripe.products p ON pr.product = p.id
        WHERE p.name = 'Youth Dance Music Pro' 
        AND pr.active = true 
        AND p.active = true
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Subscription not available" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error getting subscription price:", error);
      res.status(500).json({ error: "Failed to get subscription price" });
    }
  });

  // Create checkout session for subscription
  app.post("/api/subscription/checkout", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const stripe = await getUncachableStripeClient();
      
      // Get the subscription price
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        return res.status(500).json({ error: "Database not configured" });
      }
      const sqlClient = neon(connectionString);
      const db = drizzle(sqlClient);
      
      const priceResult = await db.execute(sql`
        SELECT pr.id as price_id
        FROM stripe.prices pr
        JOIN stripe.products p ON pr.product = p.id
        WHERE p.name = 'Youth Dance Music Pro' 
        AND pr.active = true 
        AND p.active = true
        ORDER BY pr.created DESC
        LIMIT 1
      `);
      
      if (priceResult.rows.length === 0) {
        return res.status(404).json({ error: "Subscription not available" });
      }
      
      const priceId = priceResult.rows[0].price_id as string;
      
      // Create or get customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user.id },
        });
        await storage.updateUser(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }
      
      // Create checkout session
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${baseUrl}/?subscription=success`,
        cancel_url: `${baseUrl}/?subscription=cancelled`,
      });
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error?.message || error);
      console.error("Full error:", JSON.stringify(error, null, 2));
      res.status(500).json({ error: error?.message || "Failed to create checkout session" });
    }
  });

  // Create customer portal session for subscription management
  app.post("/api/subscription/portal", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      
      if (!user.stripeCustomerId) {
        return res.status(400).json({ error: "No subscription found" });
      }
      
      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}`;
      
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: baseUrl,
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  // Spotify OAuth - start authorization
  app.get("/auth/spotify", requireAuth, (req, res) => {
    try {
      const user = req.user as User;
      const authUrl = getSpotifyAuthUrl(user.id);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error starting Spotify auth:", error);
      res.redirect("/?spotify_error=auth_failed");
    }
  });

  // Spotify OAuth - callback
  app.get("/auth/spotify/callback", requireAuth, async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        console.error("[Spotify OAuth] Authorization denied:", error);
        return res.redirect("/?spotify_error=denied");
      }

      const user = req.user as User;
      if (!code || typeof code !== "string" || state !== user.id) {
        return res.redirect("/?spotify_error=invalid");
      }

      await exchangeSpotifyCode(code, user.id);
      res.redirect("/?spotify_connected=true");
    } catch (error) {
      console.error("Error in Spotify callback:", error);
      res.redirect("/?spotify_error=token_failed");
    }
  });

  // Check user's Spotify connection status
  app.get("/api/spotify/status", requireAuth, async (req, res) => {
    const user = req.user as User;
    const freshUser = await storage.getUser(user.id);
    res.json({ connected: freshUser ? isSpotifyConnected(freshUser) : false });
  });

  // Disconnect Spotify
  app.post("/api/spotify/disconnect", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await disconnectSpotify(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting Spotify:", error);
      res.status(500).json({ error: "Failed to disconnect Spotify" });
    }
  });

  // Get user's Spotify playlists
  app.get("/api/spotify/playlists", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const freshUser = await storage.getUser(user.id);
      if (!freshUser || !isSpotifyConnected(freshUser)) {
        return res.status(400).json({ error: "Spotify not connected" });
      }
      const playlists = await getUserPlaylists(freshUser);
      res.json({ playlists });
    } catch (error: any) {
      console.error("Error fetching playlists:", error);
      if (error.message?.includes("expired") || error.message?.includes("reconnect")) {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch playlists" });
    }
  });

  // Get tracks for a specific playlist
  app.get("/api/spotify/playlists/:playlistId/tracks", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { playlistId } = req.params;

      const freshUser = await storage.getUser(user.id);
      if (!freshUser || !isSpotifyConnected(freshUser)) {
        return res.status(400).json({ error: "Spotify not connected" });
      }

      const tracks = await getPlaylistTracks(freshUser, playlistId);
      res.json({ tracks });
    } catch (error: any) {
      console.error("Error fetching playlist tracks:", error);
      if (error.message?.includes("expired") || error.message?.includes("reconnect")) {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch playlist tracks" });
    }
  });

  // Add track to a playlist
  app.post("/api/spotify/playlists/:playlistId/add", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const { playlistId } = req.params;
      const { trackId, position } = req.body;

      if (!trackId || typeof trackId !== "string") {
        return res.status(400).json({ error: "Track ID is required" });
      }

      let parsedPosition: number | undefined;
      if (position !== undefined && position !== null) {
        const n = Number(position);
        if (!Number.isInteger(n) || n < 0) {
          return res.status(400).json({ error: "Position must be a non-negative integer" });
        }
        parsedPosition = n;
      }

      const freshUser = await storage.getUser(user.id);
      if (!freshUser || !isSpotifyConnected(freshUser)) {
        return res.status(400).json({ error: "Spotify not connected" });
      }

      await addTrackToPlaylist(freshUser, playlistId, trackId, parsedPosition);
      res.json({ success: true, message: "Song added to playlist!" });
    } catch (error: any) {
      console.error("Error adding to playlist:", error);
      if (error.message?.includes("expired") || error.message?.includes("reconnect")) {
        return res.status(401).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to add song to playlist" });
    }
  });

  // Song search route
  app.get("/api/songs/search", requireAuth, async (req, res) => {
    try {
      const { title, artist } = req.query;
      const user = req.user as User;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      // Check usage limits for non-subscribers
      const usage = await storage.getUserSearchUsage(user.id);
      if (!usage.isSubscribed && usage.remaining <= 0) {
        return res.status(403).json({ 
          error: "Daily search limit reached",
          message: "You've used all 5 free searches for today. Subscribe for unlimited searches!",
          limitReached: true,
          usage
        });
      }

      const artistName = artist && typeof artist === "string" ? artist : "";
      const searchKey = `${title.toLowerCase().trim()}|${artistName.toLowerCase().trim()}`;

      // Check database cache first
      const cachedSongInitial = await storage.getSongBySearchKey(searchKey);

      if (cachedSongInitial) {
        console.log(`Cache hit for: ${title} - ${artistName}`);

        // Lazy backfill: re-evaluate songs cached before the danceability score existed
        const cachedSong = await backfillSongAiFields(cachedSongInitial);

        // Increment song search count
        await storage.incrementSongSearchCount(searchKey);

        // Increment search count for non-subscribers
        if (!usage.isSubscribed) {
          await storage.incrementDailySearchCount(user.id);
        }

        const updatedUsage = await storage.getUserSearchUsage(user.id);

        // Extract track ID from Spotify URL (format: https://open.spotify.com/track/TRACK_ID)
        const spotifyTrackId = cachedSong.spotifyUrl?.split('/track/')[1]?.split('?')[0] || null;

        return res.json({
          found: true,
          cached: true,
          song: {
            title: cachedSong.songName,
            artist: cachedSong.artistName,
            album: cachedSong.albumName,
            albumArt: cachedSong.albumArt,
            explicit: cachedSong.isExplicit,
            spotifyUrl: cachedSong.spotifyUrl,
            spotifyTrackId,
          },
          evaluation: cachedSong.aiUnavailable ? null : {
            appropriate: cachedSong.aiRecommendation === "approved",
            reasoning: cachedSong.aiReasoning,
            concerns: cachedSong.aiConcerns || [],
            positives: cachedSong.aiPositives || [],
            recommendation: cachedSong.aiRecommendation,
            danceType: cachedSong.aiDanceType || null,
            isLineDance: cachedSong.aiIsLineDance || false,
            danceability: cachedSong.aiDanceability ?? null,
          },
          usage: updatedUsage,
        });
      }

      console.log(`Cache miss for: ${title} - ${artistName}, fetching from Spotify...`);

      // Not in cache, search Spotify
      const track = await searchSong(title, artistName || undefined);

      if (!track) {
        return res.json({ found: false });
      }

      // Evaluate the song with AI (with graceful fallback)
      let evaluation = null;
      let aiUnavailable = false;
      try {
        evaluation = await evaluateSongForLDSChurchDance(
          track.name,
          track.artists.join(", "),
          track.album
        );
      } catch (aiError) {
        console.error("AI evaluation failed, continuing without evaluation:", aiError);
        aiUnavailable = true;
      }

      // Save to database only when lyrics were found (or when AI was unavailable due to a transient error)
      const lyricsFound = evaluation ? evaluation.lyricsFound : false;
      if (aiUnavailable || lyricsFound) {
        try {
          await storage.createSong({
            searchKey,
            songName: track.name,
            artistName: track.artists.join(", "),
            albumName: track.album || null,
            albumArt: track.albumArt || null,
            spotifyUrl: track.spotifyUrl || null,
            isExplicit: track.explicit || false,
            aiRecommendation: evaluation?.recommendation || null,
            aiReasoning: evaluation?.reasoning || null,
            aiConcerns: evaluation?.concerns || null,
            aiPositives: evaluation?.positives || null,
            aiDanceType: evaluation?.danceType || null,
            aiIsLineDance: evaluation?.isLineDance || false,
            aiDanceability: evaluation?.danceability ?? null,
            aiUnavailable,
          });
          console.log(`Saved to cache: ${track.name} - ${track.artists.join(", ")}`);
          // Increment search count for the newly created song
          await storage.incrementSongSearchCount(searchKey);
        } catch (dbError) {
          console.error("Failed to save song to database:", dbError);
        }
      } else {
        console.log(`Skipping cache for: ${track.name} - lyrics not found by AI`);
      }

      // Increment search count for non-subscribers
      if (!usage.isSubscribed) {
        await storage.incrementDailySearchCount(user.id);
      }
      
      const updatedUsage = await storage.getUserSearchUsage(user.id);

      res.json({
        found: true,
        cached: false,
        song: {
          title: track.name,
          artist: track.artists.join(", "),
          album: track.album,
          albumArt: track.albumArt,
          explicit: track.explicit,
          spotifyUrl: track.spotifyUrl,
          spotifyTrackId: track.id,
        },
        evaluation: evaluation ? {
          appropriate: evaluation.appropriate,
          reasoning: evaluation.reasoning,
          concerns: evaluation.concerns,
          positives: evaluation.positives,
          recommendation: evaluation.recommendation,
          danceType: evaluation.danceType,
          isLineDance: evaluation.isLineDance,
          danceability: evaluation.danceability,
        } : null,
        usage: updatedUsage,
      });
    } catch (error) {
      console.error("Error searching song:", error);
      res.status(500).json({ error: "Failed to search song" });
    }
  });

  // Public endpoint to search songs for dance requests (no auth required, no usage limits)
  app.get("/api/songs/search-public", async (req, res) => {
    try {
      const { title, artist } = req.query;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      const artistName = artist && typeof artist === "string" ? artist : "";
      const searchKey = `${title.toLowerCase().trim()}|${artistName.toLowerCase().trim()}`;

      const cachedSongInitial = await storage.getSongBySearchKey(searchKey);
      if (cachedSongInitial) {
        const cachedSong = await backfillSongAiFields(cachedSongInitial);
        const spotifyTrackId = cachedSong.spotifyUrl?.split('/track/')[1]?.split('?')[0] || null;
        return res.json({
          found: true,
          song: {
            title: cachedSong.songName,
            artist: cachedSong.artistName,
            album: cachedSong.albumName,
            albumArt: cachedSong.albumArt,
            explicit: cachedSong.isExplicit,
            spotifyUrl: cachedSong.spotifyUrl,
            spotifyTrackId,
          },
          evaluation: cachedSong.aiUnavailable ? null : {
            recommendation: cachedSong.aiRecommendation,
            danceType: cachedSong.aiDanceType || null,
            danceability: cachedSong.aiDanceability ?? null,
          },
        });
      }

      const track = await searchSong(title, artistName || undefined);
      if (!track) {
        return res.json({ found: false });
      }

      let evaluation = null;
      let aiUnavailable = false;
      try {
        evaluation = await evaluateSongForLDSChurchDance(
          track.name,
          track.artists.join(", "),
          track.album
        );
      } catch (aiError) {
        console.error("AI evaluation failed:", aiError);
        aiUnavailable = true;
      }

      const lyricsFoundPublic = evaluation ? evaluation.lyricsFound : false;
      if (aiUnavailable || lyricsFoundPublic) {
        try {
          await storage.createSong({
            searchKey,
            songName: track.name,
            artistName: track.artists.join(", "),
            albumName: track.album || null,
            albumArt: track.albumArt || null,
            spotifyUrl: track.spotifyUrl || null,
            isExplicit: track.explicit || false,
            aiRecommendation: evaluation?.recommendation || null,
            aiReasoning: evaluation?.reasoning || null,
            aiConcerns: evaluation?.concerns || null,
            aiPositives: evaluation?.positives || null,
            aiDanceType: evaluation?.danceType || null,
            aiIsLineDance: evaluation?.isLineDance || false,
            aiDanceability: evaluation?.danceability ?? null,
            aiUnavailable,
          });
        } catch (dbError) {
          console.error("Failed to save song to database:", dbError);
        }
      } else {
        console.log(`Skipping cache for (public): ${track.name} - lyrics not found by AI`);
      }

      res.json({
        found: true,
        song: {
          title: track.name,
          artist: track.artists.join(", "),
          album: track.album,
          albumArt: track.albumArt,
          explicit: track.explicit,
          spotifyUrl: track.spotifyUrl,
          spotifyTrackId: track.id,
        },
        evaluation: evaluation ? {
          recommendation: evaluation.recommendation,
          danceType: evaluation.danceType,
          danceability: evaluation.danceability,
        } : null,
      });
    } catch (error) {
      console.error("Error in public song search:", error);
      res.status(500).json({ error: "Failed to search song" });
    }
  });

  // Public autocomplete for dance requests
  app.get("/api/songs/autocomplete-public", async (req, res) => {
    try {
      const { query, type } = req.query;
      if (!query || typeof query !== "string") {
        return res.json({ suggestions: [] });
      }
      const validType = type === "artist" ? "artist" : "track";
      const suggestions = await getAutocompleteSuggestions(query, validType);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting public autocomplete suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  // ===== DANCE MANAGEMENT ROUTES =====

  function requireProUser(req: any, res: any, next: any) {
    const user = req.user as User;
    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({ error: "Pro subscription required" });
    }
    next();
  }

  // Create a dance (pro users only)
  app.post("/api/dances", requireAuth, requireProUser, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        date: z.string().min(1, "Date is required"),
        startTime: z.string().min(1, "Start time is required"),
        endTime: z.string().min(1, "End time is required"),
        location: z.string().min(1, "Location is required"),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const user = req.user as User;
      const dance = await storage.createDance({
        ...parsed.data,
        creatorUserId: user.id,
        isActive: true,
      });

      res.json(dance);
    } catch (error) {
      console.error("Error creating dance:", error);
      res.status(500).json({ error: "Failed to create dance" });
    }
  });

  // List dances for current DJ
  app.get("/api/dances", requireAuth, requireProUser, async (req, res) => {
    try {
      const user = req.user as User;
      const userDances = await storage.getDancesByCreator(user.id);
      res.json(userDances);
    } catch (error) {
      console.error("Error listing dances:", error);
      res.status(500).json({ error: "Failed to list dances" });
    }
  });

  // Delete a dance (DJ only, must be owner)
  app.delete("/api/dances/:id", requireAuth, requireProUser, async (req, res) => {
    try {
      const user = req.user as User;
      const dance = await storage.getDanceById(req.params.id);
      if (!dance) {
        return res.status(404).json({ error: "Dance not found" });
      }
      if (dance.creatorUserId !== user.id) {
        return res.status(403).json({ error: "Not authorized to delete this dance" });
      }
      await storage.deleteDance(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting dance:", error);
      res.status(500).json({ error: "Failed to delete dance" });
    }
  });

  // Get dance by code (public - for attendees)
  app.get("/api/dances/code/:code", async (req, res) => {
    try {
      const dance = await storage.getDanceByCode(req.params.code.toUpperCase());
      if (!dance) {
        return res.status(404).json({ error: "Dance not found" });
      }
      res.json({
        id: dance.id,
        code: dance.code,
        name: dance.name,
        date: dance.date,
        startTime: dance.startTime,
        endTime: dance.endTime,
        location: dance.location,
        isActive: dance.isActive,
      });
    } catch (error) {
      console.error("Error getting dance:", error);
      res.status(500).json({ error: "Failed to get dance" });
    }
  });

  // Get requests for a specific dance (DJ only)
  app.get("/api/dances/:danceId/requests", requireAuth, requireProUser, async (req, res) => {
    try {
      const user = req.user as User;
      const dance = await storage.getDanceById(req.params.danceId);
      if (!dance || dance.creatorUserId !== user.id) {
        return res.status(404).json({ error: "Dance not found" });
      }
      const requests = await storage.getDanceRequestsByDance(dance.id);
      res.json(requests);
    } catch (error) {
      console.error("Error getting dance requests:", error);
      res.status(500).json({ error: "Failed to get requests" });
    }
  });

  const MAX_REQUESTS_PER_DANCE = 3;

  // Get user's request count for a dance (requires auth)
  app.get("/api/dances/:code/my-requests", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const dance = await storage.getDanceByCode(req.params.code.toUpperCase());
      if (!dance) {
        return res.status(404).json({ error: "Dance not found" });
      }
      const count = await storage.getUserRequestCountForDance(user.id, dance.id);
      res.json({ count, remaining: Math.max(0, MAX_REQUESTS_PER_DANCE - count), limit: MAX_REQUESTS_PER_DANCE });
    } catch (error) {
      console.error("Error getting request count:", error);
      res.status(500).json({ error: "Failed to get request count" });
    }
  });

  // Submit a song request to a dance (requires auth, max 3 per dance)
  app.post("/api/dances/:code/requests", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;

      const schema = z.object({
        songTitle: z.string().min(1, "Song title is required"),
        artistName: z.string().min(1, "Artist name is required"),
        albumArt: z.string().optional(),
        spotifyUrl: z.string().optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message });
      }

      const dance = await storage.getDanceByCode(req.params.code.toUpperCase());
      if (!dance) {
        return res.status(404).json({ error: "Dance not found" });
      }

      if (!dance.isActive) {
        return res.status(400).json({ error: "This dance is no longer accepting requests" });
      }

      const currentCount = await storage.getUserRequestCountForDance(user.id, dance.id);
      if (currentCount >= MAX_REQUESTS_PER_DANCE) {
        return res.status(400).json({ error: `You can only request up to ${MAX_REQUESTS_PER_DANCE} songs per dance` });
      }

      const request = await storage.createDanceRequest({
        danceId: dance.id,
        requesterUserId: user.id,
        requesterName: user.name,
        songTitle: parsed.data.songTitle,
        artistName: parsed.data.artistName,
        albumArt: parsed.data.albumArt || null,
        spotifyUrl: parsed.data.spotifyUrl || null,
        status: "pending",
      });

      const searchKey = `${parsed.data.songTitle.toLowerCase().trim()}|${parsed.data.artistName.toLowerCase().trim()}`;
      try {
        await storage.incrementSongSearchCount(searchKey);
      } catch (err) {
        console.error("Failed to increment search count for dance request:", err);
      }

      await storage.createNotification({
        userId: dance.creatorUserId,
        type: "song_request",
        title: "New Song Request",
        message: `${user.name} requested "${parsed.data.songTitle}" by ${parsed.data.artistName} for ${dance.name}`,
        danceId: dance.id,
        requestId: request.id,
        isRead: false,
      });

      const remaining = MAX_REQUESTS_PER_DANCE - (currentCount + 1);
      res.json({ success: true, request, remaining });
    } catch (error) {
      console.error("Error submitting request:", error);
      res.status(500).json({ error: "Failed to submit request" });
    }
  });

  // Accept or reject a dance request (DJ only)
  app.patch("/api/requests/:requestId", requireAuth, requireProUser, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status must be 'accepted' or 'rejected'" });
      }

      const user = req.user as User;

      const allDances = await storage.getDancesByCreator(user.id);
      const requestId = req.params.requestId;

      let foundRequest = null;
      for (const dance of allDances) {
        const danceRequests = await storage.getDanceRequestsByDance(dance.id);
        foundRequest = danceRequests.find(r => r.id === requestId);
        if (foundRequest) break;
      }

      if (!foundRequest) {
        return res.status(404).json({ error: "Request not found or not authorized" });
      }

      const updatedRequest = await storage.updateDanceRequestStatus(requestId, status);
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating request:", error);
      res.status(500).json({ error: "Failed to update request" });
    }
  });

  // ===== NOTIFICATION ROUTES =====

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const userNotifications = await storage.getNotificationsByUser(user.id);
      res.json(userNotifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const count = await storage.getUnreadNotificationCount(user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      await storage.markAllNotificationsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });

  // Popular songs - pro subscribers only
  // Public popular songs (limited to top approved/recommended songs for the mobile app)
  app.get("/api/songs/popular-public", async (_req, res) => {
    try {
      const allSongs = await storage.getAllSongsOrderedBySearchCount();
      const filtered = allSongs
        .filter((s) => !s.aiUnavailable && s.aiRecommendation && s.aiRecommendation !== "unfit")
        .slice(0, 25)
        .map((s) => ({
          id: s.id,
          songName: s.songName,
          artistName: s.artistName,
          albumName: s.albumName,
          albumArt: s.albumArt,
          spotifyUrl: s.spotifyUrl,
          isExplicit: s.isExplicit,
          aiRecommendation: s.aiRecommendation,
          aiDanceType: s.aiDanceType,
          aiDanceability: s.aiDanceability,
          searchCount: s.searchCount,
        }));
      res.json({ songs: filtered });
    } catch (error) {
      console.error("Error getting public popular songs:", error);
      res.status(500).json({ error: "Failed to get popular songs" });
    }
  });

  // Public dance request submission (no auth required - for mobile/event use)
  // Anti-abuse: per-IP burst limiter + per-IP-per-dance cap to prevent spam
  // when bad actors rotate names to bypass the per-name cap below.
  app.post(
    "/api/dances/:code/requests-public",
    publicRequestBurstLimiter,
    publicRequestPerDanceLimiter,
    async (req, res) => {
    try {
      const schema = z.object({
        requesterName: z.string().trim().min(1, "Your name is required").max(60),
        songTitle: z.string().trim().min(1, "Song title is required").max(200),
        artistName: z.string().trim().min(1, "Artist name is required").max(200),
        albumArt: z.string().url().max(2000).optional(),
        spotifyUrl: z.string().url().max(2000).optional(),
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues ?? [];
        const msg = issues[0]?.message ?? "Invalid request";
        return res.status(400).json({ error: msg });
      }

      const dance = await storage.getDanceByCode(req.params.code.toUpperCase());
      if (!dance) {
        return res.status(404).json({ error: "Dance not found" });
      }
      if (!dance.isActive) {
        return res.status(400).json({ error: "This dance is no longer accepting requests" });
      }

      const guestUserId = `guest:${parsed.data.requesterName.toLowerCase().trim()}`;
      const currentCount = await storage.getUserRequestCountForDance(guestUserId, dance.id);
      if (currentCount >= MAX_REQUESTS_PER_DANCE) {
        return res.status(400).json({ error: `You can only request up to ${MAX_REQUESTS_PER_DANCE} songs per dance` });
      }

      const request = await storage.createDanceRequest({
        danceId: dance.id,
        requesterUserId: guestUserId,
        requesterName: parsed.data.requesterName,
        songTitle: parsed.data.songTitle,
        artistName: parsed.data.artistName,
        albumArt: parsed.data.albumArt || null,
        spotifyUrl: parsed.data.spotifyUrl || null,
        status: "pending",
      });

      const searchKey = `${parsed.data.songTitle.toLowerCase().trim()}|${parsed.data.artistName.toLowerCase().trim()}`;
      try {
        await storage.incrementSongSearchCount(searchKey);
      } catch (err) {
        console.error("Failed to increment search count for guest request:", err);
      }

      try {
        await storage.createNotification({
          userId: dance.creatorUserId,
          type: "song_request",
          title: "New Song Request",
          message: `${parsed.data.requesterName} requested "${parsed.data.songTitle}" by ${parsed.data.artistName} for ${dance.name}`,
          danceId: dance.id,
          requestId: request.id,
          isRead: false,
        });
      } catch (err) {
        console.error("Failed to create notification for guest request:", err);
      }

      const remaining = MAX_REQUESTS_PER_DANCE - (currentCount + 1);
      res.json({ success: true, request, remaining });
    } catch (error) {
      console.error("Error submitting guest request:", error);
      res.status(500).json({ error: "Failed to submit request" });
    }
  },
  );

  app.get("/api/songs/popular", requireAuth, async (req, res) => {
    try {
      const user = req.user as User;
      const usage = await storage.getUserSearchUsage(user.id);
      
      if (!usage.isSubscribed) {
        return res.status(403).json({ 
          error: "Pro subscription required",
          message: "Popular songs is a Pro feature. Subscribe to access it!",
        });
      }

      const allSongs = await storage.getAllSongsOrderedBySearchCount();
      res.json({ songs: allSongs });
    } catch (error) {
      console.error("Error getting popular songs:", error);
      res.status(500).json({ error: "Failed to get popular songs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
