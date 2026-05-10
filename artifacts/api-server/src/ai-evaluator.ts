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
  danceability: number;
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
   - Themes that contradict LDS church teachings
   - **Drug and alcohol references — this requires DEEP analysis. Flag ANY of the following:**
     - Alcohol by any name: liquor, booze, brew, hooch, sauce, spirits, suds, the bottle, liquid courage, drinks, shots, rounds, nightcap, hair of the dog
     - Alcohol brand names or types: Jack (Jack Daniel's), JD, Henny (Hennessy), Patron, Patrón, Henny, Rémy, Rémy Martin, Jameson, Jim Beam, Crown (Crown Royal), Ciroc, Hennessy, Fireball, Bud, Budweiser, Coors, Modelo, Corona, Guinness, champagne, bubbly, rosé, wine, vino, red/white wine, sake, soju, vodka, tequila, mezcal, gin, rum, whiskey, whisky, bourbon, scotch, cognac, brandy, merlot, chardonnay, moscato, prosecco, cider, malt liquor, 40 (forty-ounce), sipping (when referring to alcohol), popping bottles, bottles in the club, ordering shots, getting lit, getting drunk, wasted, hammered, sloshed, tipsy, buzzed, blacked out, drank (used as a noun for a drink)
     - Marijuana and cannabis: weed, pot, grass, herb, bud, ganja, mary jane, reefer, dope, sticky icky, kush, OG kush, blunt, joint, spliff, J, L (el), 420, 4:20, smoke/smoking up, blazing, toking, hitting a bowl, rolling up, chronic, loud (slang for strong weed), zaza, gas (as drug slang), pack (drug slang), tree, green, flower, hash, hashish, dabs, wax, concentrate, edibles (drug context), high, stoned, baked, faded (drug context)
     - Hard drugs and pills: coke, cocaine, snow, blow, powder, white girl, white lines, nose candy, yayo, base, crack, rock, meth, crystal, ice, tina, speed, amp, uppers, ecstasy, molly, MDMA, rolls, beans, X, lean, sizzurp, purple drank, dirty sprite, promethazine, codeine, syrup, drip (drug context), Xanax, xans, bars (pill slang), percs, Percocet, perc, oxy, opioids, fetty, fentanyl, heroin, boy, smack, horse, needles/shooting up, ketamine, special K, shrooms, mushrooms, acid, LSD, tabs, trip, roll, Adderall, addy, study drug, popping pills, pill-popping
     - General drug/substance culture: getting high, getting faded, getting lit, turnt/turned up (in a substance context), altered states, chasing a high, substance-fueled, all-night party context implying drug use, references to "the plug" (drug dealer), dealing, re-up, trapping, dope game, trap, scoring, connecting
     - Euphemisms and coded language: "sipping on" (when not clearly referring to a non-alcoholic drink), "pouring up," "drink in my cup," "cup in my hand," "red cup," "solo cup," "turn up," "rolling" (can mean on ecstasy), "floating," "cloud 9" (in context), "feeling good tonight" paired with party imagery, "medicine" used as slang
   - **If ANY of the above appear — even once, even in passing — the song must be rated "not-recommended."** Do not give partial credit or approve a song that glorifies, normalizes, or casually mentions substance use.
   
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

5. **Danceability Score (1-10)**: Rate how well this song will work on a youth dance floor. This is NOT just tempo — it weighs how popular and recognizable the song is and how reliably it gets people on the dance floor at a real dance.
   - 10 = an iconic, instantly recognizable dance-floor anthem that almost always packs the floor (e.g., the kind of widely loved hit that the vast majority of youth would know and react to).
   - 7-9 = popular, well-known songs that consistently get a strong dance-floor response.
   - 4-6 = moderately known songs that some people will dance to but won't pack the floor.
   - 1-3 = obscure, unrecognizable, or low-energy songs that few people would dance to.
   - Slow songs can still score high if they are widely recognized "slow dance" staples.
   - Be honest about obscurity: if the song is not broadly recognized by mainstream youth audiences, the score must be lower regardless of tempo.

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
  "isLineDance": boolean (true only if it's a fast song commonly used for line dancing),
  "danceability": integer from 1 to 10 reflecting popularity and dance-floor appeal as described above
}

Be balanced and fair in your assessment. Consider that:
- Not every artist's personal views automatically disqualify their music
- Focus primarily on the actual song content
- Use "review-needed" if there are minor concerns that church leaders should be aware of
- Be specific about concerns rather than making general statements
- **Drugs and alcohol: apply a ZERO-TOLERANCE rule.** If the song references drugs or alcohol in ANY form — including slang, brand names, abbreviations, or euphemisms — it must be "not-recommended". This includes a single passing mention of "Jack," "sipping," "shots," "weed," "lean," or any other substance term. Do NOT approve a song simply because the reference is brief or the rest of the song is clean. Name the specific word or phrase that triggered the concern in the "concerns" list.

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
    typeof evaluation.isLineDance !== "boolean" ||
    !Number.isFinite(evaluation.danceability)
  ) {
    throw new Error("Invalid evaluation format from AI");
  }

  // Clamp danceability to a valid 1-10 integer
  evaluation.danceability = Math.max(1, Math.min(10, Math.round(evaluation.danceability)));

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
