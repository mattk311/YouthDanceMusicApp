import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("Spotify credentials not found in environment variables");
}

const spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  explicit: boolean;
  spotifyUrl: string;
}

export async function searchSong(
  title: string,
  artist?: string
): Promise<SpotifyTrack | null> {
  try {
    const query = artist ? `track:${title} artist:${artist}` : title;
    const results = await spotify.search(query, ["track"], undefined, 1);

    if (!results.tracks.items.length) {
      return null;
    }

    const track = results.tracks.items[0];

    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      explicit: track.explicit,
      spotifyUrl: track.external_urls.spotify,
    };
  } catch (error) {
    console.error("Error searching Spotify:", error);
    throw error;
  }
}
