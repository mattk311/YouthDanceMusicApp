import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "./auth";
import { searchSong, getAutocompleteSuggestions } from "./spotify";
import type { User } from "@shared/schema";

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

  // Song search route
  app.get("/api/songs/search", requireAuth, async (req, res) => {
    try {
      const { title, artist } = req.query;

      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "Title is required" });
      }

      const track = await searchSong(
        title,
        artist && typeof artist === "string" ? artist : undefined
      );

      if (!track) {
        return res.json({ found: false });
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
        },
      });
    } catch (error) {
      console.error("Error searching song:", error);
      res.status(500).json({ error: "Failed to search song" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
