import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60; // Allow 60 seconds for processing

// Initialize OpenRouter client
const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_WEBSITE_URL || "http://localhost:3000",
        "X-Title": "CopyCat Detector",
    },
});

// Grok 4.1 Fast with X search enabled via :online suffix
const GROK_MODEL = "x-ai/grok-4.1-fast:online";

// Prompt for TARGETED SEARCH (specific suspects)
const TARGETED_SEARCH_PROMPT = `You are a Twitter/X plagiarism detective. Find if the suspects copied the original tweet.
**SPEED IS CRITICAL. DO NOT SEARCH DEEPLY.**

**YOUR TASK:**
1. Extract content/date from the original tweet URL (if provided).
2. For each suspect, search their timeline using the "since:" operator.
   - Query format: "from:@username since:YYYY-MM-DD" (use original tweet date).
3. Look for 90%+ similarity matches posted AFTER the original.
4. STOP searching a suspect as soon as you find ONE strong match.

**SEARCH GUARDRAILS:**
- **Time Range:** Only check tweets posted AFTER the original tweet date (last 3-6 months max).
- **Threshold:** Ignore anything with <90% similarity.
- **Quality:** Focus on viral/successful tweets if possible, but catch any obvious copy.

**OUTPUT FORMAT (JSON ONLY):**
Respond with ONLY valid JSON:
{
  "originalTweetInfo": {
    "content": "Original content",
    "date": "YYYY-MM-DD",
    "url": "url"
  },
  "results": [
    {
      "suspect": "@username",
      "isCopycat": true/false,
      "confidence": "high/medium/low",
      "matchedTweet": {
        "content": "Copied content",
        "url": "https://twitter.com/...",
        "date": "YYYY-MM-DD",
        "similarity": "95%"
      },
      "explanation": "Brief reasoning"
    }
  ],
  "summary": "Short summary of findings"
}`;

// Prompt for OPEN SEARCH (search all of X)
const OPEN_SEARCH_PROMPT = `You are a Twitter/X plagiarism detective. Find ANYONE who copied the original tweet.
**SPEED IS CRITICAL. DO NOT PAGINATE DEEPLY.**

**YOUR TASK:**
1. Extract content/date from the original tweet URL (if provided).
2. Search for unique phrases from the original text.
3. **STOP** as soon as you find **5 strong matches** or if 10 seconds pass.
4. Only return the most relevant "exact copies".

**SEARCH GUARDRAILS:**
- **MAX RESULTS:** Return maximum 5 top copycats.
- **DEPTH:** Do not look past the first page of search results.
- **FILTER:** Only finding tweets posted AFTER original date.
- **IGNORE:** Retweets, replies, and quote tweets. Find original posts.

**OUTPUT FORMAT (JSON ONLY):**
Respond with ONLY valid JSON:
{
  "originalTweetInfo": {
    "content": "Original content",
    "date": "YYYY-MM-DD",
    "url": "url"
  },
  "searchMode": "open",
  "results": [
    {
      "suspect": "@username",
      "isCopycat": true,
      "confidence": "high/medium/low",
      "matchedTweet": {
        "content": "Copied content",
        "url": "https://twitter.com/...",
        "date": "YYYY-MM-DD",
        "similarity": "95%"
      },
      "explanation": "Brief reasoning"
    }
  ],
  "summary": "Found X accounts that appear to have copied this tweet"
}

If no copycats are found anywhere on X, return an empty results array with a summary saying "No copycats found".`;

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    try {
        const { originalTweet, originalDate, tweetUrl, suspects, searchMode } = await request.json();

        // Validation
        if (!originalTweet && !tweetUrl) {
            return NextResponse.json(
                { error: "Either original tweet text or tweet URL is required" },
                { status: 400 }
            );
        }

        const isOpenSearch = searchMode === "open";

        // For targeted search, we need suspects
        if (!isOpenSearch) {
            if (!suspects || !Array.isArray(suspects) || suspects.length === 0) {
                return NextResponse.json(
                    { error: "At least one suspect handle is required for targeted search" },
                    { status: 400 }
                );
            }

            if (suspects.length > 5) {
                return NextResponse.json(
                    { error: "Maximum 5 suspects allowed" },
                    { status: 400 }
                );
            }
        }

        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: "OPENROUTER_API_KEY not configured" },
                { status: 500 }
            );
        }

        // Build the prompt based on search mode
        let prompt: string;

        if (isOpenSearch) {
            // Open search mode - search all of X
            prompt = OPEN_SEARCH_PROMPT + "\n\n---\n";

            if (tweetUrl) {
                prompt += `** ORIGINAL TWEET URL:** ${tweetUrl} \n`;
                prompt += `Please search X to find this tweet and extract its content and date.\n\n`;
            }

            if (originalTweet) {
                prompt += `** ORIGINAL TWEET CONTENT:**\n${originalTweet} \n\n`;
            }

            if (originalDate) {
                prompt += `** ORIGINAL TWEET DATE:** ${originalDate} \n\n`;
            }

            prompt += `\n-- -\n\nNow search across ALL of X for anyone who may have copied this tweet.Find up to 10 potential copycats.Remember: Output ONLY valid JSON.`;

            console.log(`[CopyCat API] Starting OPEN SEARCH across X...`);
        } else {
            // Targeted search mode - specific suspects
            const cleanedSuspects = suspects
                .map((s: string) => s.trim().replace(/^@/, ""))
                .filter((s: string) => s.length > 0);

            prompt = TARGETED_SEARCH_PROMPT + "\n\n---\n";

            if (tweetUrl) {
                prompt += `** ORIGINAL TWEET URL:** ${tweetUrl} \n`;
                prompt += `Please search X to find this tweet and extract its content and date.\n\n`;
            }

            if (originalTweet) {
                prompt += `** ORIGINAL TWEET CONTENT:**\n${originalTweet} \n\n`;
            }

            if (originalDate) {
                prompt += `** ORIGINAL TWEET DATE:** ${originalDate} \n\n`;
            }

            prompt += `** SUSPECTS TO INVESTIGATE:**\n`;
            cleanedSuspects.forEach((suspect: string, index: number) => {
                prompt += `${index + 1}.@${suspect} \n`;
            });

            prompt += `\n-- -\n\nNow search X for each suspect and determine if they copied the original tweet.Remember: Output ONLY valid JSON.`;

            console.log(`[CopyCat API] Starting TARGETED detection with ${cleanedSuspects.length} suspects...`);
        }

        // Call Grok with X search enabled
        console.log(`[CopyCat API] Sending request to OpenRouter model: ${GROK_MODEL}...`);
        const searchStartTime = Date.now();

        const completion = await openrouter.chat.completions.create({
            model: GROK_MODEL,
            messages: [{ role: "user", content: prompt }],
        });

        const searchDuration = Date.now() - searchStartTime;
        console.log(`[CopyCat API] OpenRouter/Grok search & generation completed in ${searchDuration}ms`);

        const responseText = completion.choices[0]?.message?.content?.trim();

        if (!responseText) {
            return NextResponse.json(
                { error: "No response from AI model" },
                { status: 503 }
            );
        }

        // Clean up any markdown code block wrappers
        const cleanedText = responseText
            .replace(/^```json\s */i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        try {
            const parsed = JSON.parse(cleanedText);

            // Get annotations (citations from X search)
            const annotations = completion.choices[0]?.message?.annotations || [];

            console.log(`[CopyCat API] Total request took ${Date.now() - startTime}ms`);

            return NextResponse.json({
                success: true,
                searchMode: isOpenSearch ? "open" : "targeted",
                ...parsed,
                annotations, // Include source citations
                processingTime: Date.now() - startTime,
            });
        } catch (parseError) {
            console.error("[CopyCat API] JSON parse error:", parseError);
            // Return raw text if JSON parsing fails
            return NextResponse.json({
                success: true,
                searchMode: isOpenSearch ? "open" : "targeted",
                rawResponse: cleanedText,
                parseWarning: "Response was not valid JSON, showing raw output",
                processingTime: Date.now() - startTime,
            });
        }
    } catch (error: any) {
        console.error("[CopyCat API] Error:", error);
        return NextResponse.json(
            { error: `Failed to detect copycats: ${error?.message || "Unknown error"}` },
            { status: 500 }
        );
    }
}
