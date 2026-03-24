import OpenAI from "openai";
import { fetchLyricsFromGenius } from "./genius";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface SongEvaluation {
  lyricsFound: boolean;
  appropriate: boolean;
  reasoning: string;
  concerns: string[];
  positives: string[];
  recommendation: "approved" | "not-recommended" | "review-needed";
  danceType: "fast" | "slow";
  isLineDance: boolean;
}

async function runAiEvaluation(
  songTitle: string,
  artist: string,
  album?: string,
  lyrics?: string | null,
): Promise<SongEvaluation> {
  const lyricsSection = lyrics
    ? `\n- Lyrics:\n"""\n${lyrics.slice(0, 4000)}\n"""`
    : "";

  const prompt = `You are an expert advisor helping LDS (Latter-day Saint) church leaders evaluate whether a song is appropriate for a church youth dance.

Analyze the following song and provide a detailed evaluation:
- Song Title: "${songTitle}"
- Artist: "${artist}"
${album ? `- Album: "${album}"` : ""}${lyricsSection}

Consider these specific factors:

1. **Song Lyrics Content**: Analyze if the lyrics contain or suggest:
   - Profanity or inappropriate language
   - Sexual content, innuendo, or double entendre
   - Violence or aggression
   - Drug or alcohol references
   - Themes that contradict LDS church teachings
   
2. **Artist's Public Stance**: Consider the artist's known public positions on:
   - LGBTQ+ issues and advocacy
   - Transgender issues
   - Abortion
   - Traditional marriage and family values
   - Religious topics
   - General lifestyle and public behavior
   
3. **Overall Message**: Does the song promote values consistent with LDS church standards?

4. **Dance Type**: Based on the song's tempo and rhythm:
   - Is this a fast dance song or a slow dance song?
   - If it's a fast dance song, is it commonly used as a line dance song (like the Cupid Shuffle, Cha Cha Slide, Cotton Eye Joe, etc.)?

${lyrics ? `The lyrics above were retrieved from Genius. Treat "lyricsFound" as true since lyrics have been provided.` : ""}

Provide your evaluation in the following JSON format:
{
  "lyricsFound": boolean (true if you have knowledge of this song's lyrics or lyrics were provided above, false if you do not recognize this song or cannot find its lyrics),
  "appropriate": boolean (true if the song is appropriate, false if not — use false if lyricsFound is false),
  "reasoning": "A clear, balanced explanation of your decision (2-3 sentences) — if lyricsFound is false, explain that the lyrics could not be found",
  "concerns": ["list of specific concerns found, if any"],
  "positives": ["list of positive aspects, if any"],
  "recommendation": "approved" | "not-recommended" | "review-needed" — use "review-needed" if lyricsFound is false,
  "danceType": "fast" | "slow",
  "isLineDance": boolean (true only if it's a fast song commonly used for line dancing)
}

Be balanced and fair in your assessment. Consider that:
- Not every artist's personal views automatically disqualify their music
- Focus primarily on the actual song content
- Use "review-needed" if there are minor concerns that church leaders should be aware of
- Be specific about concerns rather than making general statements
- If a song has any alcohol or drug references, it should be marked as "not-recommended"

Provide only the JSON response, no additional text.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  let content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  content = content.replaceAll("LDS", "");

  const evaluation = JSON.parse(content) as SongEvaluation;

  if (
    typeof evaluation.lyricsFound !== "boolean" ||
    typeof evaluation.appropriate !== "boolean" ||
    typeof evaluation.reasoning !== "string" ||
    !Array.isArray(evaluation.concerns) ||
    !Array.isArray(evaluation.positives) ||
    !["approved", "not-recommended", "review-needed"].includes(evaluation.recommendation) ||
    !["fast", "slow"].includes(evaluation.danceType) ||
    typeof evaluation.isLineDance !== "boolean"
  ) {
    throw new Error("Invalid evaluation format from AI");
  }

  return evaluation;
}

export async function evaluateSongForLDSChurchDance(
  songTitle: string,
  artist: string,
  album?: string,
): Promise<SongEvaluation> {
  try {
    // First attempt: let the AI evaluate using its own training knowledge
    const firstPass = await runAiEvaluation(songTitle, artist, album);

    if (firstPass.lyricsFound) {
      return firstPass;
    }

    // AI didn't recognise the lyrics — fall back to Genius
    console.log(`[AI] Lyrics not found in training data for: ${songTitle} - ${artist}. Trying Genius...`);
    const geniusLyrics = await fetchLyricsFromGenius(songTitle, artist);

    if (!geniusLyrics) {
      console.log(`[Genius] No lyrics found either, returning first-pass result`);
      return firstPass;
    }

    // Second attempt: re-evaluate with actual lyrics from Genius
    console.log(`[AI] Re-evaluating with Genius lyrics for: ${songTitle} - ${artist}`);
    const secondPass = await runAiEvaluation(songTitle, artist, album, geniusLyrics);
    return secondPass;
  } catch (error) {
    console.error("Error evaluating song with AI:", error);
    throw error;
  }
}
