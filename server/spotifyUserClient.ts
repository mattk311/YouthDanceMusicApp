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
    console.log('[Spotify] Using cached tokens');
    return {
      accessToken: cachedTokens.accessToken,
      clientId: cachedTokens.clientId,
      refreshToken: cachedTokens.refreshToken,
      expiresIn: cachedTokens.expiresIn,
    };
  }
  
  console.log('[Spotify] Fetching fresh tokens from connector');
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  console.log('[Spotify] Connector check - hostname:', !!hostname, 'hasToken:', !!xReplitToken);

  if (!xReplitToken || !hostname) {
    console.error('[Spotify] Missing connector environment variables:', {
      hasHostname: !!hostname,
      hasReplIdentity: !!process.env.REPL_IDENTITY,
      hasWebReplRenewal: !!process.env.WEB_REPL_RENEWAL
    });
    throw new Error('Spotify queue not available in this environment');
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
  
  console.log('[Spotify] Connector response received, has items:', !!data.items?.length);
  
  if (!connectionSettings) {
    console.error('[Spotify] No connection settings found in response');
    throw new Error('Spotify not connected - no connection settings found');
  }
  
  console.log('[Spotify] Connection settings keys:', Object.keys(connectionSettings?.settings || {}));
  
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
  console.log('[Spotify] Adding to queue:', spotifyUri);
  
  try {
    const spotify = await getSpotifyUserClient();
    
    // Add track to the user's playback queue
    // The URI should be in format: spotify:track:TRACK_ID
    await spotify.player.addItemToPlaybackQueue(spotifyUri);
    console.log('[Spotify] Successfully added to queue');
  } catch (error: any) {
    console.error('[Spotify] Error adding to queue:', error.message || error);
    
    // Re-throw with more context
    if (error?.body?.error?.reason === 'NO_ACTIVE_DEVICE') {
      throw new Error('No active device - Please open Spotify and start playing something first');
    }
    if (error?.status === 404 || error?.message?.includes('NO_ACTIVE_DEVICE')) {
      throw new Error('No active device - Please open Spotify and start playing something first');
    }
    throw error;
  }
}

export async function isSpotifyUserConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
