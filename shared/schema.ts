import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googleId: text("google_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  dailySearchCount: integer("daily_search_count").default(0),
  lastSearchDate: date("last_search_date"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const songs = pgTable("songs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  searchKey: text("search_key").notNull().unique(),
  songName: text("song_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumName: text("album_name"),
  albumArt: text("album_art"),
  spotifyUrl: text("spotify_url"),
  isExplicit: boolean("is_explicit").default(false),
  aiRecommendation: text("ai_recommendation"),
  aiReasoning: text("ai_reasoning"),
  aiConcerns: text("ai_concerns").array(),
  aiPositives: text("ai_positives").array(),
  aiDanceType: text("ai_dance_type"),
  aiIsLineDance: boolean("ai_is_line_dance").default(false),
  aiUnavailable: boolean("ai_unavailable").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;
