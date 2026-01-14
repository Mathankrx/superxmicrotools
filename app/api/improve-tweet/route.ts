import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { tweetsHistoryTable } from "@/utils/db/schema";

export const maxDuration = 60; // Allow 60 seconds for processing

// Initialize OpenRouter client
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000",
        "X-Title": "Tweet Improver AI",
    },
});

// OpenRouter free models (fallback order)
const MODELS = [
    "moonshotai/kimi-k2:free",
    "z-ai/glm-4.5-air:free",
    "deepseek/deepseek-r1-0528:free",
];

// Prompt for SINGLE TWEET
const SINGLE_TWEET_PROMPT = `You are a professional Twitter/X content strategist. Transform the raw text into ONE perfectly structured tweet.

**CONTENT RULES:**
- Use 90-99% of wordings directly from the input to mimic original style
- Keep language simple - avoid difficult words and complex phrases  
- Write in first person ("I", "my", "me") if the input sounds like that
- NO character limit - include all key points
- NO emojis unless toggle is enabled
- NO hashtags ever

**TWEET STRUCTURE:**
Every tweet must have this HOOK → BODY → CLOSING format with line breaks:

Line 1: HOOK - Opening sentence that grabs attention
Line 2: (empty line break)
Line 3-N: BODY - Core message/insight (include all important points)
Line N+1: (empty line break)  
Line N+2: CLOSING - Strong ending statement or call-to-action

**OUTPUT FORMAT (JSON ONLY):**
Respond with ONLY valid JSON, no markdown, no code blocks:
{
  "type": "single",
  "tweet": {
    "hook": "Opening hook sentence",
    "body": "Body content here - can be multiple sentences",
    "closing": "Closing statement"
  }
}`;

// Prompt for THREAD
const THREAD_PROMPT = `You are a professional Twitter/X content strategist. Transform the raw text into a Twitter THREAD.

**TWEET COUNT RULES:**
- Input under 1000 chars: 3-4 tweets
- Input 1000-2000 chars: 4-6 tweets
- Input 2000-3000 chars: 6-8 tweets
- Input over 3000 chars: 8-10 tweets

**CONTENT RULES:**
- Use 90-99% of wordings directly from the input to mimic original style
- Keep language simple - avoid difficult words and complex phrases
- Write in first person ("I", "my", "me") if the input sounds like that
- Each tweet: 250-350 characters (max 400)
- NO emojis unless toggle is enabled
- NO hashtags ever

**THREAD STRUCTURE:**

FIRST TWEET (Hook Tweet):
- Line 1: Attention-grabbing hook
- Line 2: Body that builds interest
- Line 3: Thread indicator (end with 🧵👇 if emojis enabled, or "Thread below." if not)

MIDDLE TWEETS (2/X, 3/X, etc.):
- Line 1: Tweet number + Topic (e.g., "2/ The Key Insight")
- Line 2: Main point
- Line 3: Supporting detail or example

FINAL TWEET:
- Summarize or provide call-to-action
- No thread indicator needed

**OUTPUT FORMAT (JSON ONLY):**
Respond with ONLY valid JSON, no markdown, no code blocks:
{
  "type": "thread",
  "tweets": [
    {
      "number": 1,
      "title": "Hook",
      "hook": "Attention grabbing opener",
      "body": "Supporting sentence that builds interest",
      "closing": "Thread indicator 🧵👇"
    },
    {
      "number": 2,
      "title": "The Key Insight", 
      "hook": "2/ The Key Insight",
      "body": "Main point explained clearly",
      "closing": "Why this matters"
    }
  ],
  "totalTweets": 5
}`;

async function generateWithGemini(prompt: string): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        console.log(`[API] Trying Gemini 2.5 Flash Lite...`);
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`[API] Gemini Error (${response.status}):`, errorText);
            return null; // Fallback to OpenRouter
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            console.log(`[API] Success with Gemini 2.5 Flash Lite`);
            return text;
        }
    } catch (error) {
        console.error("[API] Gemini execution failed:", error);
    }
    return null;
}

// Try OpenRouter models with fallback
async function generateWithOpenRouter(prompt: string): Promise<string | null> {
    if (!openrouter.apiKey) return null;

    for (const model of MODELS) {
        try {
            console.log(`Trying OpenRouter model: ${model}`);
            const completion = await openrouter.chat.completions.create({
                model,
                messages: [{ role: "user", content: prompt }],
            });
            const text = completion.choices[0]?.message?.content?.trim();
            if (text) {
                console.log(`Success with: ${model}`);
                return text;
            }
        } catch (error: any) {
            console.log(`${model} failed:`, error?.message || error);
            continue;
        }
    }
    return null;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    try {
        const { text, addEmojis, mode, visitorId } = await request.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: "OPENROUTER_API_KEY not configured. Please add it to .env.local" },
                { status: 500 }
            );
        }

        // User can choose mode, or auto-detect based on length
        const isThread = mode === "thread" || (mode === "auto" && text.length > 500);
        const basePrompt = isThread ? THREAD_PROMPT : SINGLE_TWEET_PROMPT;

        const emojiInstruction = addEmojis
            ? "ADD emojis sparingly (1-2 per tweet max) at strategic points."
            : "DO NOT add any emojis at all.";

        const prompt = `${basePrompt}

${emojiInstruction}

---
RAW TEXT TO TRANSFORM:
${text}
---

Remember: Output ONLY valid JSON. No markdown, no \`\`\`, no explanations.`;

        const genStartTime = Date.now();
        console.log(`[API] Starting generation...`);

        // 1. Try Gemini First
        let responseText = await generateWithGemini(prompt);

        // 2. Fallback to OpenRouter if Gemini failed
        if (!responseText) {
            console.log(`[API] Gemini failed or skipped. Falling back to OpenRouter...`);
            responseText = await generateWithOpenRouter(prompt);
        }

        console.log(`[API] Generation took ${Date.now() - genStartTime}ms`);

        if (!responseText) {
            return NextResponse.json(
                { error: "All AI models are currently unavailable. Please try again in a moment." },
                { status: 503 }
            );
        }

        // Clean up any markdown code block wrappers
        const cleanedText = responseText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        try {
            const parsed = JSON.parse(cleanedText);

            // Format tweets for display
            let formattedTweets: string[] = [];

            if (parsed.type === "single" && parsed.tweet) {
                const { hook, body, closing } = parsed.tweet;
                formattedTweets = [`${hook}\n\n${body}\n\n${closing}`];
            } else if (parsed.type === "thread" && parsed.tweets) {
                formattedTweets = parsed.tweets.map((t: any) => {
                    return `${t.hook}\n\n${t.body}\n\n${t.closing}`;
                });
            }

            // Save to database if visitorId is present (Server-Side Saving)
            if (visitorId && formattedTweets.length > 0) {
                const dbStartTime = Date.now();
                await db.insert(tweetsHistoryTable).values({
                    visitorId,
                    originalText: text,
                    improvedText: formattedTweets.join("\n---\n"),
                    isThread: parsed.type === "thread",
                    mode: mode || 'auto',
                }).catch(err => console.error("DB Save Failed:", err));
                console.log(`[API] DB Save took ${Date.now() - dbStartTime}ms`);
            }

            console.log(`[API] Total request took ${Date.now() - startTime}ms`);

            return NextResponse.json({
                success: true,
                type: parsed.type,
                tweets: formattedTweets,
                rawData: parsed,
                isThread: parsed.type === "thread",
                characterCount: formattedTweets[0]?.length || 0,
            });
        } catch (parseError) {
            // Fallback: treat as plain text if JSON parsing fails
            console.error("JSON parse error:", parseError);
            return NextResponse.json({
                success: true,
                type: "single",
                tweets: [cleanedText],
                isThread: false,
                characterCount: cleanedText.length,
                parseWarning: "Response was not valid JSON, showing raw output",
            });
        }
    } catch (error: any) {
        console.error("Error improving tweet:", error);
        return NextResponse.json(
            { error: `Failed to improve tweet: ${error?.message || "Unknown error"}` },
            { status: 500 }
        );
    }
}
