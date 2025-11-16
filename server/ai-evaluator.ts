import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface SongEvaluation {
  appropriate: boolean;
  reasoning: string;
  concerns: string[];
  positives: string[];
  recommendation: "approved" | "not-recommended" | "review-needed";
}

export async function evaluateSongForLDSChurchDance(
  songTitle: string,
  artist: string,
  album?: string
): Promise<SongEvaluation> {
  const prompt = `You are an expert advisor helping LDS (Latter-day Saint) church leaders evaluate whether a song is appropriate for a church youth dance.

Analyze the following song and provide a detailed evaluation:
- Song Title: "${songTitle}"
- Artist: "${artist}"
${album ? `- Album: "${album}"` : ""}

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

4. **Context**: Even if some concerns exist, is this song widely considered acceptable in mainstream settings?

Provide your evaluation in the following JSON format:
{
  "appropriate": boolean (true if the song is appropriate, false if not),
  "reasoning": "A clear, balanced explanation of your decision (2-3 sentences)",
  "concerns": ["list of specific concerns found, if any"],
  "positives": ["list of positive aspects, if any"],
  "recommendation": "approved" | "not-recommended" | "review-needed"
}

Be balanced and fair in your assessment. Consider that:
- Not every artist's personal views automatically disqualify their music
- Focus primarily on the actual song content
- Use "review-needed" if there are minor concerns that church leaders should be aware of
- Be specific about concerns rather than making general statements

Provide only the JSON response, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const evaluation = JSON.parse(content) as SongEvaluation;
    
    // Validate the response has required fields
    if (
      typeof evaluation.appropriate !== "boolean" ||
      typeof evaluation.reasoning !== "string" ||
      !Array.isArray(evaluation.concerns) ||
      !Array.isArray(evaluation.positives) ||
      !["approved", "not-recommended", "review-needed"].includes(evaluation.recommendation)
    ) {
      throw new Error("Invalid evaluation format from AI");
    }

    return evaluation;
  } catch (error) {
    console.error("Error evaluating song with AI:", error);
    throw error;
  }
}
