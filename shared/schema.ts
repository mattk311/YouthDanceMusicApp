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
  spotifyAccessToken: text("spotify_access_token"),
  spotifyRefreshToken: text("spotify_refresh_token"),
  spotifyTokenExpiresAt: timestamp("spotify_token_expires_at"),
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
  searchCount: integer("search_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSongSchema = createInsertSchema(songs).omit({
  id: true,
  createdAt: true,
});

export type InsertSong = z.infer<typeof insertSongSchema>;
export type Song = typeof songs.$inferSelect;

export const dances = pgTable("dances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location").notNull(),
  creatorUserId: varchar("creator_user_id").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDanceSchema = createInsertSchema(dances).omit({
  id: true,
  code: true,
  createdAt: true,
});

export type InsertDance = z.infer<typeof insertDanceSchema>;
export type Dance = typeof dances.$inferSelect;

export const danceRequests = pgTable("dance_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  danceId: varchar("dance_id").notNull(),
  requesterUserId: varchar("requester_user_id").notNull(),
  requesterName: text("requester_name").notNull(),
  songTitle: text("song_title").notNull(),
  artistName: text("artist_name").notNull(),
  albumArt: text("album_art"),
  spotifyUrl: text("spotify_url"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDanceRequestSchema = createInsertSchema(danceRequests).omit({
  id: true,
  createdAt: true,
});

export type InsertDanceRequest = z.infer<typeof insertDanceRequestSchema>;
export type DanceRequest = typeof danceRequests.$inferSelect;

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  danceId: varchar("dance_id"),
  requestId: varchar("request_id"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
