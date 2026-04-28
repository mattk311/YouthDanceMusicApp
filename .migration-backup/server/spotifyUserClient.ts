import { storage } from "./storage";
import type { User } from "@shared/schema";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");

function getRedirectUri(): string {
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  const domain = domains[0] || "localhost:5000";
  const protocol = domain.includes("localhost") ? "http" : "https";
  return `${protocol}://${domain}/auth/spotify/callback`;
}

export function getSpotifyAuthUrl(userId: string): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) throw new Error("SPOTIFY_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    state: userId,
    show_dialog: "true",
  });

  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string, userId: string): Promise<void> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Spotify OAuth] Token exchange failed:", error);
    throw new Error("Failed to exchange Spotify authorization code");
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const existingUser = await storage.getUser(userId);
  await storage.updateUser(userId, {
    spotifyAccessToken: data.access_token,
    spotifyRefreshToken: data.refresh_token || existingUser?.spotifyRefreshToken || null,
    spotifyTokenExpiresAt: expiresAt,
  });
}

async function refreshAccessToken(user: User): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");
  if (!user.spotifyRefreshToken) throw new Error("No Spotify refresh token");

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: user.spotifyRefreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Spotify OAuth] Token refresh failed:", error);
    await storage.updateUser(user.id, {
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
    });
    throw new Error("Spotify session expired. Please reconnect your Spotify account.");
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await storage.updateUser(user.id, {
    spotifyAccessToken: data.access_token,
    spotifyRefreshToken: data.refresh_token || user.spotifyRefreshToken,
    spotifyTokenExpiresAt: expiresAt,
  });

  return data.access_token;
}

async function getValidAccessToken(user: User): Promise<string> {
  if (!user.spotifyAccessToken || !user.spotifyRefreshToken) {
    throw new Error("Spotify not connected");
  }

  const expiresAt = user.spotifyTokenExpiresAt ? new Date(user.spotifyTokenExpiresAt).getTime() : 0;
  const isExpired = Date.now() > expiresAt - 60000;

  if (isExpired) {
    return await refreshAccessToken(user);
  }

  return user.spotifyAccessToken;
}

export function isSpotifyConnected(user: User): boolean {
  return !!user.spotifyRefreshToken;
}

export async function getUserPlaylists(user: User): Promise<any[]> {
  const accessToken = await getValidAccessToken(user);

  const playlists: any[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/me/playlists?limit=50`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Spotify] Failed to fetch playlists:", errText);
      throw new Error("Failed to fetch playlists");
    }

    const body: any = await res.json();
    playlists.push(
      ...body.items.map((p: any) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.images?.[0]?.url || null,
        trackCount: p.tracks?.total || 0,
        isPublic: p.public,
      }))
    );
    url = body.next;
  }

  return playlists;
}

export async function getPlaylistTracks(user: User, playlistId: string): Promise<any[]> {
  const accessToken = await getValidAccessToken(user);

  const tracks: any[] = [];
  let url: string | null = `${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(name),album(images))),next&limit=100`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Spotify] Failed to fetch playlist tracks:", errText);
      throw new Error("Failed to fetch playlist tracks");
    }

    const body: any = await res.json();
    for (const item of body.items || []) {
      if (!item?.track) continue;
      tracks.push({
        id: item.track.id,
        name: item.track.name,
        artists: (item.track.artists || []).map((a: any) => a.name).join(", "),
        imageUrl: item.track.album?.images?.[0]?.url || null,
      });
    }
    url = body.next;
  }

  return tracks;
}

export async function addTrackToPlaylist(
  user: User,
  playlistId: string,
  trackId: string,
  position?: number,
): Promise<void> {
  const accessToken = await getValidAccessToken(user);
  const spotifyUri = `spotify:track:${trackId}`;

  const body: { uris: string[]; position?: number } = { uris: [spotifyUri] };
  if (typeof position === "number" && position >= 0) {
    body.position = position;
  }

  const response = await fetch(`${SPOTIFY_API_BASE}/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Spotify] Failed to add track to playlist:", error);
    throw new Error("Failed to add song to playlist");
  }
}

export async function disconnectSpotify(userId: string): Promise<void> {
  await storage.updateUser(userId, {
    spotifyAccessToken: null,
    spotifyRefreshToken: null,
    spotifyTokenExpiresAt: null,
  });
}
