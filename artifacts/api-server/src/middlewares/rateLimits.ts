import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request, Response } from "express";
import { pgPool } from "../pgPool";
import { PostgresRateLimitStore } from "./pgRateLimitStore";

const MAX_PUBLIC_REQUESTS_PER_DANCE = 3;

const sharedJsonHandler = (message: string): Options["handler"] => {
  return (_req: Request, res: Response) => {
    res.status(429).json({ error: message });
  };
};

const burstStore = pgPool
  ? new PostgresRateLimitStore({ pool: pgPool, bucket: "public-request-burst" })
  : undefined;

const perDanceStore = pgPool
  ? new PostgresRateLimitStore({
      pool: pgPool,
      bucket: "public-request-per-dance",
    })
  : undefined;

const publicSearchStore = pgPool
  ? new PostgresRateLimitStore({ pool: pgPool, bucket: "public-search" })
  : undefined;

const publicAutocompleteStore = pgPool
  ? new PostgresRateLimitStore({ pool: pgPool, bucket: "public-autocomplete" })
  : undefined;

// Unauthenticated song search can trigger a paid AI evaluation on a cache miss.
// Limits are per IP and sized for many attendees sharing one venue network.
export const publicSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(publicSearchStore ? { store: publicSearchStore } : {}),
  handler: sharedJsonHandler(
    "Too many song searches in a short time. Please wait a moment and try again.",
  ),
});

// Autocomplete fires on keystrokes, so it gets a higher ceiling.
export const publicAutocompleteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(publicAutocompleteStore ? { store: publicAutocompleteStore } : {}),
  handler: sharedJsonHandler(
    "Too many requests in a short time. Please wait a moment and try again.",
  ),
});

export const publicRequestBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(burstStore ? { store: burstStore } : {}),
  handler: sharedJsonHandler(
    "Too many song requests in a short time. Please wait a moment and try again.",
  ),
});

export const publicRequestPerDanceLimiter = rateLimit({
  windowMs: 12 * 60 * 60 * 1000,
  limit: MAX_PUBLIC_REQUESTS_PER_DANCE,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipFailedRequests: true,
  ...(perDanceStore ? { store: perDanceStore } : {}),
  keyGenerator: (req: Request) => {
    const ipKey = ipKeyGenerator(req.ip ?? "");
    const rawCode = req.params["code"];
    const code = (Array.isArray(rawCode) ? rawCode[0] ?? "" : rawCode ?? "").toUpperCase();
    return `${ipKey}:${code}`;
  },
  handler: sharedJsonHandler(
    `You can only request up to ${MAX_PUBLIC_REQUESTS_PER_DANCE} songs per dance from this device.`,
  ),
});
