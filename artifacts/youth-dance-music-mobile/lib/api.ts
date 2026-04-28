import Constants from "expo-constants";

const ENV_DOMAIN = process.env.EXPO_PUBLIC_DOMAIN;
const FALLBACK_DOMAIN = (Constants.expoConfig?.extra as any)?.apiDomain;

export const API_BASE = ENV_DOMAIN
  ? `https://${ENV_DOMAIN}`
  : FALLBACK_DOMAIN
    ? `https://${FALLBACK_DOMAIN}`
    : "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

// ---------- API response shapes ----------

export type Recommendation = "approved" | "caution" | "unfit" | string;

export interface SearchSong {
  title: string;
  artist: string;
  album?: string | null;
  albumArt?: string | null;
  explicit?: boolean | null;
  spotifyUrl?: string | null;
  spotifyTrackId?: string | null;
}

export interface SearchEvaluation {
  recommendation: Recommendation;
  danceType?: string | null;
  danceability?: number | null;
}

export interface SearchPublicResponse {
  found: boolean;
  song?: SearchSong;
  evaluation?: SearchEvaluation | null;
}

export interface PopularSong {
  id: string;
  songName: string;
  artistName: string;
  albumName: string | null;
  albumArt: string | null;
  spotifyUrl: string | null;
  isExplicit: boolean | null;
  aiRecommendation: Recommendation | null;
  aiDanceType: string | null;
  aiDanceability: number | null;
  searchCount: number;
}

export interface PopularResponse {
  songs: PopularSong[];
}

export interface DanceLookup {
  id: string;
  code: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
}

export interface SubmitGuestRequestBody {
  requesterName: string;
  songTitle: string;
  artistName: string;
  albumArt?: string;
  spotifyUrl?: string;
}

export interface SubmitGuestRequestResponse {
  success: boolean;
  remaining: number;
}
