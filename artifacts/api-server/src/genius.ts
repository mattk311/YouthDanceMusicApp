const GENIUS_API_KEY = process.env.GENIUS_API_KEY;
const GENIUS_BASE_URL = "https://api.genius.com";

interface GeniusSearchHit {
  result: {
    id: number;
    title: string;
    primary_artist: { name: string };
    url: string;
  };
}

export async function fetchLyricsFromGenius(
  songTitle: string,
  artist: string,
): Promise<string | null> {
  if (!GENIUS_API_KEY) {
    console.warn("[Genius] GENIUS_API_KEY is not set, skipping lyrics lookup");
    return null;
  }

  try {
    const query = encodeURIComponent(`${songTitle} ${artist}`);
    const searchRes = await fetch(`${GENIUS_BASE_URL}/search?q=${query}`, {
      headers: {
        Authorization: `Bearer ${GENIUS_API_KEY}`,
      },
    });

    if (!searchRes.ok) {
      console.error(`[Genius] Search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json();
    const hits: GeniusSearchHit[] = searchData?.response?.hits ?? [];

    if (hits.length === 0) {
      console.log(`[Genius] No results for: ${songTitle} - ${artist}`);
      return null;
    }

    const titleLower = songTitle.toLowerCase();
    const artistLower = artist.toLowerCase();

    const match = hits.find((hit) => {
      const resultTitle = hit.result.title.toLowerCase();
      const resultArtist = hit.result.primary_artist.name.toLowerCase();
      return (
        resultTitle.includes(titleLower) || titleLower.includes(resultTitle)
      ) && (
        resultArtist.includes(artistLower.split(",")[0].trim()) ||
        artistLower.includes(resultArtist)
      );
    }) ?? hits[0];

    const songId = match.result.id;

    const songRes = await fetch(`${GENIUS_BASE_URL}/songs/${songId}?text_format=plain`, {
      headers: {
        Authorization: `Bearer ${GENIUS_API_KEY}`,
      },
    });

    if (!songRes.ok) {
      console.error(`[Genius] Song fetch failed: ${songRes.status}`);
      return null;
    }

    const songData = await songRes.json();
    const lyrics: string | undefined =
      songData?.response?.song?.lyrics?.plain ||
      songData?.response?.song?.description?.plain;

    if (!lyrics) {
      console.log(`[Genius] No lyrics text returned for song ID ${songId}`);
      return null;
    }

    console.log(`[Genius] Found lyrics for: ${songTitle} - ${artist}`);
    return lyrics;
  } catch (err) {
    console.error("[Genius] Error fetching lyrics:", err);
    return null;
  }
}
