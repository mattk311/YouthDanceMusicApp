import {
  type User,
  type InsertUser,
  type Song,
  type InsertSong,
  type Dance,
  type InsertDance,
  type DanceRequest,
  type InsertDanceRequest,
  type Notification,
  type InsertNotification,
  type MobileSession,
  users,
  songs,
  dances,
  danceRequests,
  notifications,
  mobileSessions,
} from "@workspace/db";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, sql, desc, and, inArray } from "drizzle-orm";

function generateDanceCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getSongBySearchKey(searchKey: string): Promise<Song | undefined>;
  createSong(song: InsertSong): Promise<Song>;
  updateSongBySearchKey(searchKey: string, updates: Partial<Song>): Promise<Song | undefined>;
  incrementSongSearchCount(searchKey: string): Promise<void>;
  getAllSongsOrderedBySearchCount(): Promise<Song[]>;
  incrementDailySearchCount(
    userId: string,
  ): Promise<{ count: number; isNewDay: boolean }>;
  getUserSearchUsage(
    userId: string,
  ): Promise<{ count: number; remaining: number; isSubscribed: boolean }>;

  createDance(dance: InsertDance): Promise<Dance>;
  deleteDance(id: string): Promise<void>;
  getDancesByCreator(userId: string): Promise<Dance[]>;
  getDanceByCode(code: string): Promise<Dance | undefined>;
  getDanceById(id: string): Promise<Dance | undefined>;

  createDanceRequest(request: InsertDanceRequest): Promise<DanceRequest>;
  getDanceRequestsByDance(danceId: string): Promise<DanceRequest[]>;
  getUserRequestCountForDance(userId: string, danceId: string): Promise<number>;
  updateDanceRequestStatus(id: string, status: string): Promise<DanceRequest | undefined>;

  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  createMobileSession(token: string, userId: string, expiresAt: Date): Promise<MobileSession>;
  getValidMobileSession(token: string): Promise<MobileSession | undefined>;
  touchMobileSession(token: string): Promise<void>;
  deleteMobileSession(token: string): Promise<void>;

  deleteUserAccount(userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private songs: Map<string, Song>;
  private danceMap: Map<string, Dance>;
  private danceRequestMap: Map<string, DanceRequest>;
  private notificationMap: Map<string, Notification>;

  constructor() {
    this.users = new Map();
    this.songs = new Map();
    this.danceMap = new Map();
    this.danceRequestMap = new Map();
    this.notificationMap = new Map();
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
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
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
      aiDanceType: insertSong.aiDanceType || null,
      aiIsLineDance: insertSong.aiIsLineDance || false,
      aiDanceability: insertSong.aiDanceability ?? null,
      aiUnavailable: insertSong.aiUnavailable || false,
      searchCount: 0,
    };
    this.songs.set(insertSong.searchKey, song);
    return song;
  }

  async updateSongBySearchKey(searchKey: string, updates: Partial<Song>): Promise<Song | undefined> {
    const song = this.songs.get(searchKey);
    if (!song) return undefined;
    const updated = { ...song, ...updates };
    this.songs.set(searchKey, updated);
    return updated;
  }

  async incrementSongSearchCount(searchKey: string): Promise<void> {
    const song = this.songs.get(searchKey);
    if (song) {
      song.searchCount = (song.searchCount || 0) + 1;
      this.songs.set(searchKey, song);
    }
  }

  async getAllSongsOrderedBySearchCount(): Promise<Song[]> {
    return Array.from(this.songs.values()).sort(
      (a, b) => (b.searchCount || 0) - (a.searchCount || 0),
    );
  }

  async incrementDailySearchCount(
    userId: string,
  ): Promise<{ count: number; isNewDay: boolean }> {
    const user = this.users.get(userId);
    if (!user) return { count: 0, isNewDay: false };

    const today = new Date().toISOString().split("T")[0];
    const isNewDay = user.lastSearchDate !== today;

    const newCount = isNewDay ? 1 : (user.dailySearchCount || 0) + 1;
    user.dailySearchCount = newCount;
    user.lastSearchDate = today;
    this.users.set(userId, user);

    return { count: newCount, isNewDay };
  }

  async getUserSearchUsage(
    userId: string,
  ): Promise<{ count: number; remaining: number; isSubscribed: boolean }> {
    const user = this.users.get(userId);
    if (!user) return { count: 0, remaining: 3, isSubscribed: false };

    const isSubscribed = user.subscriptionStatus === "active";
    const today = new Date().toISOString().split("T")[0];
    const count =
      user.lastSearchDate === today ? user.dailySearchCount || 0 : 0;
    const remaining = isSubscribed ? -1 : Math.max(0, 3 - count);

    return { count, remaining, isSubscribed };
  }

  async createDance(insertDance: InsertDance): Promise<Dance> {
    const id = randomUUID();
    const code = generateDanceCode();
    const dance: Dance = {
      ...insertDance,
      id,
      code,
      isActive: insertDance.isActive ?? true,
      createdAt: new Date(),
    };
    this.danceMap.set(id, dance);
    return dance;
  }

  async deleteDance(id: string): Promise<void> {
    this.danceMap.delete(id);
    for (const [reqId, req] of Array.from(this.danceRequestMap.entries())) {
      if (req.danceId === id) this.danceRequestMap.delete(reqId);
    }
  }

  async getDancesByCreator(userId: string): Promise<Dance[]> {
    return Array.from(this.danceMap.values())
      .filter((d) => d.creatorUserId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDanceByCode(code: string): Promise<Dance | undefined> {
    return Array.from(this.danceMap.values()).find((d) => d.code === code);
  }

  async getDanceById(id: string): Promise<Dance | undefined> {
    return this.danceMap.get(id);
  }

  async createDanceRequest(insertReq: InsertDanceRequest): Promise<DanceRequest> {
    const id = randomUUID();
    const req: DanceRequest = {
      ...insertReq,
      id,
      status: insertReq.status || "pending",
      albumArt: insertReq.albumArt || null,
      spotifyUrl: insertReq.spotifyUrl || null,
      createdAt: new Date(),
    };
    this.danceRequestMap.set(id, req);
    return req;
  }

  async getDanceRequestsByDance(danceId: string): Promise<DanceRequest[]> {
    return Array.from(this.danceRequestMap.values())
      .filter((r) => r.danceId === danceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserRequestCountForDance(userId: string, danceId: string): Promise<number> {
    return Array.from(this.danceRequestMap.values())
      .filter((r) => r.danceId === danceId && r.requesterUserId === userId).length;
  }

  async updateDanceRequestStatus(id: string, status: string): Promise<DanceRequest | undefined> {
    const req = this.danceRequestMap.get(id);
    if (!req) return undefined;
    req.status = status;
    this.danceRequestMap.set(id, req);
    return req;
  }

  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notif: Notification = {
      ...insertNotif,
      id,
      isRead: insertNotif.isRead ?? false,
      danceId: insertNotif.danceId || null,
      requestId: insertNotif.requestId || null,
      createdAt: new Date(),
    };
    this.notificationMap.set(id, notif);
    return notif;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notificationMap.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notificationMap.values())
      .filter((n) => n.userId === userId && !n.isRead).length;
  }

  async markNotificationRead(id: string): Promise<void> {
    const notif = this.notificationMap.get(id);
    if (notif) {
      notif.isRead = true;
      this.notificationMap.set(id, notif);
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    this.notificationMap.forEach((notif, id) => {
      if (notif.userId === userId) {
        notif.isRead = true;
        this.notificationMap.set(id, notif);
      }
    });
  }

  private mobileSessionMap: Map<string, MobileSession> = new Map();

  async createMobileSession(token: string, userId: string, expiresAt: Date): Promise<MobileSession> {
    const now = new Date();
    const session: MobileSession = { token, userId, createdAt: now, lastUsedAt: now, expiresAt };
    this.mobileSessionMap.set(token, session);
    return session;
  }

  async getValidMobileSession(token: string): Promise<MobileSession | undefined> {
    const session = this.mobileSessionMap.get(token);
    if (!session) return undefined;
    if (session.expiresAt.getTime() < Date.now()) {
      this.mobileSessionMap.delete(token);
      return undefined;
    }
    return session;
  }

  async touchMobileSession(token: string): Promise<void> {
    const session = this.mobileSessionMap.get(token);
    if (session) {
      session.lastUsedAt = new Date();
      this.mobileSessionMap.set(token, session);
    }
  }

  async deleteMobileSession(token: string): Promise<void> {
    this.mobileSessionMap.delete(token);
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Delete notifications owned by user
    for (const [id, n] of this.notificationMap) {
      if (n.userId === userId) this.notificationMap.delete(id);
    }
    // Find dances created by user, then delete requests in those dances
    const userDanceIds = new Set<string>();
    for (const [id, d] of this.danceMap) {
      if (d.creatorUserId === userId) userDanceIds.add(id);
    }
    // Delete requests submitted by user OR belonging to user's dances
    for (const [id, r] of this.danceRequestMap) {
      if (r.requesterUserId === userId || userDanceIds.has(r.danceId)) {
        this.danceRequestMap.delete(id);
      }
    }
    // Delete user's dances
    for (const id of userDanceIds) this.danceMap.delete(id);
    // Delete mobile sessions for user
    for (const [token, s] of this.mobileSessionMap) {
      if (s.userId === userId) this.mobileSessionMap.delete(token);
    }
    // Finally delete the user
    this.users.delete(userId);
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
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(
    id: string,
    updates: Partial<User>,
  ): Promise<User | undefined> {
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
    const result = await this.db.insert(songs).values(insertSong).returning();
    return result[0];
  }

  async updateSongBySearchKey(searchKey: string, updates: Partial<Song>): Promise<Song | undefined> {
    const { id, searchKey: _sk, createdAt, ...safeUpdates } = updates as any;
    if (Object.keys(safeUpdates).length === 0) return await this.getSongBySearchKey(searchKey);
    const result = await this.db
      .update(songs)
      .set(safeUpdates)
      .where(eq(songs.searchKey, searchKey))
      .returning();
    return result[0];
  }

  async incrementSongSearchCount(searchKey: string): Promise<void> {
    await this.db
      .update(songs)
      .set({ searchCount: sql`${songs.searchCount} + 1` })
      .where(eq(songs.searchKey, searchKey));
  }

  async getAllSongsOrderedBySearchCount(): Promise<Song[]> {
    return await this.db
      .select()
      .from(songs)
      .where(sql`${songs.searchCount} > 0`)
      .orderBy(sql`${songs.searchCount} DESC`);
  }

  async incrementDailySearchCount(
    userId: string,
  ): Promise<{ count: number; isNewDay: boolean }> {
    const user = await this.getUser(userId);
    if (!user) return { count: 0, isNewDay: false };

    const today = new Date().toISOString().split("T")[0];
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

  async getUserSearchUsage(
    userId: string,
  ): Promise<{ count: number; remaining: number; isSubscribed: boolean }> {
    const user = await this.getUser(userId);
    if (!user) return { count: 0, remaining: 3, isSubscribed: false };

    const isSubscribed = user.subscriptionStatus === "active";
    const today = new Date().toISOString().split("T")[0];
    const count =
      user.lastSearchDate === today ? user.dailySearchCount || 0 : 0;
    const remaining = isSubscribed ? -1 : Math.max(0, 3 - count);

    return { count, remaining, isSubscribed };
  }

  async createDance(insertDance: InsertDance): Promise<Dance> {
    const code = generateDanceCode();
    const result = await this.db.insert(dances).values({ ...insertDance, code }).returning();
    return result[0];
  }

  async deleteDance(id: string): Promise<void> {
    await this.db.delete(danceRequests).where(eq(danceRequests.danceId, id));
    await this.db.delete(dances).where(eq(dances.id, id));
  }

  async getDancesByCreator(userId: string): Promise<Dance[]> {
    return await this.db
      .select()
      .from(dances)
      .where(eq(dances.creatorUserId, userId))
      .orderBy(desc(dances.createdAt));
  }

  async getDanceByCode(code: string): Promise<Dance | undefined> {
    const result = await this.db
      .select()
      .from(dances)
      .where(eq(dances.code, code));
    return result[0];
  }

  async getDanceById(id: string): Promise<Dance | undefined> {
    const result = await this.db
      .select()
      .from(dances)
      .where(eq(dances.id, id));
    return result[0];
  }

  async createDanceRequest(insertReq: InsertDanceRequest): Promise<DanceRequest> {
    const result = await this.db.insert(danceRequests).values(insertReq).returning();
    return result[0];
  }

  async getDanceRequestsByDance(danceId: string): Promise<DanceRequest[]> {
    return await this.db
      .select()
      .from(danceRequests)
      .where(eq(danceRequests.danceId, danceId))
      .orderBy(desc(danceRequests.createdAt));
  }

  async getUserRequestCountForDance(userId: string, danceId: string): Promise<number> {
    const result = await this.db
      .select()
      .from(danceRequests)
      .where(and(eq(danceRequests.danceId, danceId), eq(danceRequests.requesterUserId, userId)));
    return result.length;
  }

  async updateDanceRequestStatus(id: string, status: string): Promise<DanceRequest | undefined> {
    const result = await this.db
      .update(danceRequests)
      .set({ status })
      .where(eq(danceRequests.id, id))
      .returning();
    return result[0];
  }

  async createNotification(insertNotif: InsertNotification): Promise<Notification> {
    const result = await this.db.insert(notifications).values(insertNotif).returning();
    return result[0];
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return Number(result[0]?.count || 0);
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  async createMobileSession(token: string, userId: string, expiresAt: Date): Promise<MobileSession> {
    const result = await this.db
      .insert(mobileSessions)
      .values({ token, userId, expiresAt })
      .returning();
    return result[0];
  }

  async getValidMobileSession(token: string): Promise<MobileSession | undefined> {
    const result = await this.db
      .select()
      .from(mobileSessions)
      .where(eq(mobileSessions.token, token))
      .limit(1);
    const session = result[0];
    if (!session) return undefined;
    if (session.expiresAt.getTime() < Date.now()) {
      await this.deleteMobileSession(token);
      return undefined;
    }
    return session;
  }

  async touchMobileSession(token: string): Promise<void> {
    await this.db
      .update(mobileSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(mobileSessions.token, token));
  }

  async deleteMobileSession(token: string): Promise<void> {
    await this.db.delete(mobileSessions).where(eq(mobileSessions.token, token));
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Order matters: child rows first, then parents.
    await this.db.delete(notifications).where(eq(notifications.userId, userId));

    // Find dances the user created so we can delete their requests too.
    const userDances = await this.db
      .select({ id: dances.id })
      .from(dances)
      .where(eq(dances.creatorUserId, userId));
    const userDanceIds = userDances.map((d) => d.id);

    // Delete requests the user made.
    await this.db
      .delete(danceRequests)
      .where(eq(danceRequests.requesterUserId, userId));

    // Delete requests on dances the user created.
    if (userDanceIds.length > 0) {
      await this.db
        .delete(danceRequests)
        .where(inArray(danceRequests.danceId, userDanceIds));
    }

    // Delete dances created by the user.
    await this.db.delete(dances).where(eq(dances.creatorUserId, userId));

    // Delete mobile sessions for the user.
    await this.db
      .delete(mobileSessions)
      .where(eq(mobileSessions.userId, userId));

    // Finally delete the user record.
    await this.db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = process.env.DATABASE_URL
  ? new DbStorage()
  : new MemStorage();
