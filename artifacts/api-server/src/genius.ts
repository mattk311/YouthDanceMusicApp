import { z } from "zod";
import { logger } from "./lib/logger";

const GENIUS_API_KEY = process.env.GENIUS_API_KEY;
const GENIUS_BASE_URL = "https://api.genius.com";

const geniusSearchSchema = z.object({
  response: z.object({
    hits: z.array(z.object({
      result: z.object({
        id: z.number(),
        title: z.string(),
        primary_artist: z.object({ name: z.string() }),
      }),
    })),
  }),
});

const geniusSongSchema = z.object({
  response: z.object({
    song: z.object({
      lyrics: z.object({ plain: z.string().optional() }).optional(),
      description: z.object({ plain: z.string().optional() }).optional(),
    }),
  }),
});

export async function fetchLyricsFromGenius(
  songTitle: string,
  artist: string,
): Promise<string | null> {
  if (!GENIUS_API_KEY) {
    logger.warn("[Genius] GENIUS_API_KEY is not set, skipping lyrics lookup");
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
      logger.error({ status: searchRes.status }, "[Genius] Search failed");
      return null;
    }

    const searchData = geniusSearchSchema.parse(await searchRes.json());
    const hits = searchData.response.hits;

    if (hits.length === 0) {
      logger.debug("[Genius] No results");
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
      logger.error({ status: songRes.status }, "[Genius] Song fetch failed");
      return null;
    }

    const songData = geniusSongSchema.parse(await songRes.json());
    const lyrics: string | undefined =
      songData?.response?.song?.lyrics?.plain ||
      songData?.response?.song?.description?.plain;

    if (!lyrics) {
      logger.debug({ songId }, "[Genius] No lyrics text returned");
      return null;
    }

    logger.debug("[Genius] Found lyrics");
    return lyrics;
  } catch (err) {
    logger.error({ errorType: err instanceof Error ? err.name : "UnknownError" }, "[Genius] Error fetching lyrics");
    return null;
  }
}
