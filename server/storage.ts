import { type User, type InsertUser, type Song, type InsertSong, users, songs } from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getSongBySearchKey(searchKey: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  incrementDailySearchCount(userId: string): Promise<{ count: number; isNewDay: boolean }>;
  getUserSearchUsage(userId: string): Promise<{ count: number; remaining: number; isSubscribed: boolean }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private songs: Map<string, Song>;

  constructor() {
    this.users = new Map();
    this.songs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      avatar: insertUser.avatar || null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      dailySearchCount: 0,
      lastSearchDate: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getSongBySearchKey(searchKey: string): Promise<Song | undefined> {
    return this.songs.get(searchKey);
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const id = randomUUID();
    const song: Song = {
      ...insertSong,
      id,
      createdAt: new Date(),
      albumName: insertSong.albumName || null,
      albumArt: insertSong.albumArt || null,
      spotifyUrl: insertSong.spotifyUrl || null,
      isExplicit: insertSong.isExplicit || false,
      aiRecommendation: insertSong.aiRecommendation || null,
      aiReasoning: insertSong.aiReasoning || null,
      aiConcerns: insertSong.aiConcerns || null,
      aiPositives: insertSong.aiPositives || null,
      aiUnavailable: insertSong.aiUnavailable || false,
    };
    this.songs.set(insertSong.searchKey, song);
    return song;
  }

  async incrementDailySearchCount(userId: string): Promise<{ count: number; isNewDay: boolean }> {
    const user = this.users.get(userId);
    if (!user) return { count: 0, isNewDay: false };
    
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = user.lastSearchDate !== today;
    
    const newCount = isNewDay ? 1 : (user.dailySearchCount || 0) + 1;
    user.dailySearchCount = newCount;
    user.lastSearchDate = today;
    this.users.set(userId, user);
    
    return { count: newCount, isNewDay };
  }

  async getUserSearchUsage(userId: string): Promise<{ count: number; remaining: number; isSubscribed: boolean }> {
    const user = this.users.get(userId);
    if (!user) return { count: 0, remaining: 10, isSubscribed: false };
    
    const isSubscribed = user.subscriptionStatus === 'active';
    const today = new Date().toISOString().split('T')[0];
    const count = user.lastSearchDate === today ? (user.dailySearchCount || 0) : 0;
    const remaining = isSubscribed ? -1 : Math.max(0, 10 - count);
    
    return { count, remaining, isSubscribed };
  }
}

export class DbStorage implements IStorage {
  private db;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const sql = neon(connectionString);
    this.db = drizzle(sql);
    console.log("[Storage] Using Neon HTTP driver for database connection");
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db
      .insert(users)
      .values(insertUser)
      .returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async getSongBySearchKey(searchKey: string): Promise<Song | undefined> {
    const result = await this.db
      .select()
      .from(songs)
      .where(eq(songs.searchKey, searchKey));
    return result[0];
  }

  async createSong(insertSong: InsertSong): Promise<Song> {
    const result = await this.db
      .insert(songs)
      .values(insertSong)
      .returning();
    return result[0];
  }

  async incrementDailySearchCount(userId: string): Promise<{ count: number; isNewDay: boolean }> {
    const user = await this.getUser(userId);
    if (!user) return { count: 0, isNewDay: false };
    
    const today = new Date().toISOString().split('T')[0];
    const isNewDay = user.lastSearchDate !== today;
    
    const newCount = isNewDay ? 1 : (user.dailySearchCount || 0) + 1;
    
    await this.db
      .update(users)
      .set({ 
        dailySearchCount: newCount,
        lastSearchDate: today,
      })
      .where(eq(users.id, userId));
    
    return { count: newCount, isNewDay };
  }

  async getUserSearchUsage(userId: string): Promise<{ count: number; remaining: number; isSubscribed: boolean }> {
    const user = await this.getUser(userId);
    if (!user) return { count: 0, remaining: 10, isSubscribed: false };
    
    const isSubscribed = user.subscriptionStatus === 'active';
    const today = new Date().toISOString().split('T')[0];
    const count = user.lastSearchDate === today ? (user.dailySearchCount || 0) : 0;
    const remaining = isSubscribed ? -1 : Math.max(0, 10 - count);
    
    return { count, remaining, isSubscribed };
  }
}

export const storage = process.env.DATABASE_URL ? new DbStorage() : new MemStorage();
