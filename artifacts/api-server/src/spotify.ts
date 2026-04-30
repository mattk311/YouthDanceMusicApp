import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

let spotify: SpotifyApi | null = null;

if (clientId && clientSecret) {
  spotify = SpotifyApi.withClientCredentials(clientId, clientSecret);
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumArt?: string;
  explicit: boolean;
  spotifyUrl: string;
}

export interface AutocompleteSuggestion {
  id: string;
  name: string;
  artist?: string;
  type: "track" | "artist";
}

export async function getAutocompleteSuggestions(
  query: string,
  type: "track" | "artist" = "track"
): Promise<AutocompleteSuggestion[]> {
  if (!spotify) {
    throw new Error("Spotify API not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment variables.");
  }

  if (!query || query.length < 2) {
    return [];
  }

  const results = await spotify.search(query, [type], undefined, 8);

  if (type === "track") {
    return results.tracks.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      type: "track" as const,
    }));
  } else {
    return results.artists.items.map((artist) => ({
      id: artist.id,
      name: artist.name,
      type: "artist" as const,
    }));
  }
}

export async function searchSong(
  title: string,
  artist?: string
): Promise<SpotifyTrack | null> {
  if (!spotify) {
    throw new Error("Spotify API not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to your environment variables.");
  }

  try {
    const query = artist ? `track:${title} artist:${artist}` : title;
    // Fetch up to 10 results so we can detect explicit versions of the same song
    const results = await spotify.search(query, ["track"], undefined, 10);

    if (!results.tracks.items.length) {
      return null;
    }

    const track = results.tracks.items[0];

    // Strip suffixes like "(Clean)", "[Clean Version]", "(Radio Edit)" for name comparison
    const stripCleanSuffix = (s: string) =>
      s.replace(/[\s\-–]*([\(\[](clean|clean version|radio edit|edited)[\)\]])/gi, "").trim().toLowerCase();

    const baseTrackName = stripCleanSuffix(track.name);
    const topArtistIds = new Set(track.artists.map((a) => a.id));

    // Check if any result shares the same base name + an overlapping artist and is explicit.
    // This catches cases where the first result is the clean version but an explicit one also exists.
    const hasExplicitVersion = results.tracks.items.some(
      (t) =>
        t.explicit &&
        stripCleanSuffix(t.name) === baseTrackName &&
        t.artists.some((a) => topArtistIds.has(a.id))
    );

    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a) => a.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url,
      explicit: track.explicit || hasExplicitVersion,
      spotifyUrl: track.external_urls.spotify,
    };
  } catch (error) {
    console.error("Error searching Spotify:", error);
    throw error;
  }
}
