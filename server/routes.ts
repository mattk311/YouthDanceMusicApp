import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "./auth";
import { searchSong, getAutocompleteSuggestions } from "./spotify";
import { evaluateSongForLDSChurchDance } from "./ai-evaluator";
import type { User } from "@shared/schema";
import { storage } from "./storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const FREE_DAILY_LIMIT = 10;

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  function requireAuth(req: any, res: any, next: any) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: "Not authenticated" });
  }

  // Auth routes
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/" }),
    (_req, res) => {
      res.redirect("/");
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

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user as User);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
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
          message: "You've used all 10 free searches for today. Subscribe for unlimited searches!",
          limitReached: true,
          usage
        });
      }

      const artistName = artist && typeof artist === "string" ? artist : "";
      const searchKey = `${title.toLowerCase().trim()}|${artistName.toLowerCase().trim()}`;

      // Check database cache first
      const cachedSong = await storage.getSongBySearchKey(searchKey);
      
      if (cachedSong) {
        console.log(`Cache hit for: ${title} - ${artistName}`);
        
        // Increment search count for non-subscribers
        if (!usage.isSubscribed) {
          await storage.incrementDailySearchCount(user.id);
        }
        
        const updatedUsage = await storage.getUserSearchUsage(user.id);
        
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
          },
          evaluation: cachedSong.aiUnavailable ? null : {
            appropriate: cachedSong.aiRecommendation === "approved",
            reasoning: cachedSong.aiReasoning,
            concerns: cachedSong.aiConcerns || [],
            positives: cachedSong.aiPositives || [],
            recommendation: cachedSong.aiRecommendation,
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

      // Save to database
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
          aiUnavailable,
        });
        console.log(`Saved to cache: ${track.name} - ${track.artists.join(", ")}`);
      } catch (dbError) {
        console.error("Failed to save song to database:", dbError);
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
        },
        evaluation: evaluation ? {
          appropriate: evaluation.appropriate,
          reasoning: evaluation.reasoning,
          concerns: evaluation.concerns,
          positives: evaluation.positives,
          recommendation: evaluation.recommendation,
        } : null,
        usage: updatedUsage,
      });
    } catch (error) {
      console.error("Error searching song:", error);
      res.status(500).json({ error: "Failed to search song" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
