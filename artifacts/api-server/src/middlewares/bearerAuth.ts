import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export async function bearerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return next();
  }
  try {
    const session = await storage.getValidMobileSession(token);
    if (!session) {
      return next();
    }
    const user = await storage.getUser(session.userId);
    if (!user) {
      return next();
    }
    (req as any).user = user;
    (req as any).isAuthenticated = () => true;
    (req as any).mobileToken = token;
    storage.touchMobileSession(token).catch(() => {});
  } catch (err) {
    console.error("[BearerAuth] error:", err);
  }
  next();
}
