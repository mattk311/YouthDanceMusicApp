// Spotify user client using Replit connector for authenticated operations
// This allows adding songs to user's playback queue
import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;
let cachedTokens: { accessToken: string; clientId: string; refreshToken: string; expiresIn: number; expiresAt: number } | null = null;

interface TokenSet {
  accessToken: string;
  clientId: string;
  refreshToken: string;
  expiresIn: number;
}

async function getAccessToken(): Promise<TokenSet> {
  // Check if we have valid cached tokens
  if (cachedTokens && cachedTokens.expiresAt > Date.now()) {
    return {
      accessToken: cachedTokens.accessToken,
      clientId: cachedTokens.clientId,
      refreshToken: cachedTokens.refreshToken,
      expiresIn: cachedTokens.expiresIn,
    };
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Spotify user authentication not available');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  connectionSettings = data.items?.[0];
  
  if (!connectionSettings) {
    throw new Error('Spotify not connected - no connection settings found');
  }
  
  // Extract tokens from various possible locations in the response
  const oauthCreds = connectionSettings?.settings?.oauth?.credentials;
  const settings = connectionSettings?.settings;
  
  const refreshToken = oauthCreds?.refresh_token;
  const accessToken = settings?.access_token || oauthCreds?.access_token;
  const clientId = oauthCreds?.client_id;
  const expiresIn = oauthCreds?.expires_in || 3600;
  
  if (!accessToken || !clientId || !refreshToken) {
    console.error('Spotify connection missing required fields:', { 
      hasAccessToken: !!accessToken, 
      hasClientId: !!clientId, 
      hasRefreshToken: !!refreshToken 
    });
    throw new Error('Spotify not connected - missing credentials');
  }
  
  // Cache the tokens with expiry time (subtract 60 seconds for safety margin)
  cachedTokens = {
    accessToken,
    clientId,
    refreshToken,
    expiresIn,
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  };
  
  return { accessToken, clientId, refreshToken, expiresIn };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getSpotifyUserClient() {
  const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

  const spotify = SpotifyApi.withAccessToken(clientId, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn || 3600,
    refresh_token: refreshToken,
  });

  return spotify;
}

export async function addToQueue(spotifyUri: string): Promise<void> {
  const spotify = await getSpotifyUserClient();
  
  // Add track to the user's playback queue
  // The URI should be in format: spotify:track:TRACK_ID
  await spotify.player.addItemToPlaybackQueue(spotifyUri);
}

export async function isSpotifyUserConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
