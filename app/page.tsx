"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import { useRef } from "react";

interface SuspectResult {
  suspect: string;
  isCopycat: boolean;
  confidence: "high" | "medium" | "low";
  matchedTweet: {
    content: string;
    url: string;
    date: string;
    similarity: string;
  } | null;
  explanation: string;
}

interface CopycatResponse {
  success: boolean;
  searchMode?: "open" | "targeted";
  originalTweetInfo?: {
    content: string;
    date: string;
    url?: string;
  };
  results?: SuspectResult[];
  summary?: string;
  rawResponse?: string;
  parseWarning?: string;
  error?: string;
}

type SearchMode = "targeted" | "open";

export default function CopyCatPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>("open");
  const [originalTweet, setOriginalTweet] = useState("");
  const [tweetUrl, setTweetUrl] = useState("");
  const [originalDate, setOriginalDate] = useState("");
  const [suspects, setSuspects] = useState<string[]>(["", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CopycatResponse | null>(null);
  const [error, setError] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const resultListRef = useRef<HTMLDivElement>(null);

  const updateSuspect = (index: number, value: string) => {
    const newSuspects = [...suspects];
    newSuspects[index] = value;
    setSuspects(newSuspects);
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);

    // Validation
    if (!originalTweet.trim() && !tweetUrl.trim()) {
      setError("Please provide either your original tweet text or a tweet URL");
      return;
    }

    // For targeted search, require suspects
    if (searchMode === "targeted") {
      const filledSuspects = suspects.filter((s) => s.trim().length > 0);
      if (filledSuspects.length === 0) {
        setError("Please enter at least one suspect handle");
        return;
      }
    }

    setIsLoading(true);

    try {
      const filledSuspects = suspects.filter((s) => s.trim().length > 0);

      const response = await fetch("/api/copycat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTweet: originalTweet.trim() || undefined,
          tweetUrl: tweetUrl.trim() || undefined,
          originalDate: originalDate || undefined,
          suspects: searchMode === "targeted" ? filledSuspects : undefined,
          searchMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to detect copycats");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  const generateEvidenceCard = async () => {
    if (!resultListRef.current) return;

    setIsGeneratingImage(true);
    try {
      // Wait a bit for fonts/images to load if needed
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(resultListRef.current, {
        backgroundColor: "#0a0a0a", // Dark background
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
      });

      // Create download link
      const link = document.createElement("a");
      link.download = `copycat-evidence-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate image:", err);
      setError("Failed to generate evidence card. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <h1 className="text-xl font-semibold">CopyCat Detector</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/improver"
              className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-colors"
            >
              ← Tweet Improver
            </Link>
            <Link
              href="https://superx.so/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              Try SuperX
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
              Find who <span className="text-primary">copied your tweet</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Enter your original viral tweet and we&apos;ll search X to find copycats.
            </p>
          </div>

          {/* Input Form */}
          <Card className="p-6 bg-card border-border mb-8">
            {/* Search Mode Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Search Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSearchMode("open")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${searchMode === "open"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🌐</span>
                    <span className="font-semibold">Open Search</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Search all of X for any account that copied your tweet
                  </p>
                </button>
                <button
                  onClick={() => setSearchMode("targeted")}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${searchMode === "targeted"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🎯</span>
                    <span className="font-semibold">Targeted Search</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check specific accounts (up to 5 suspects)
                  </p>
                </button>
              </div>
            </div>

            <div className="h-px bg-border my-6" />

            {/* Original Tweet Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Your Original Tweet
                <span className="text-muted-foreground font-normal ml-2">
                  (paste text or provide URL)
                </span>
              </label>
              <textarea
                value={originalTweet}
                onChange={(e) => setOriginalTweet(e.target.value)}
                placeholder="Paste your original tweet text here..."
                className="w-full h-32 p-4 bg-secondary/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-border flex-1" />
              <span className="text-muted-foreground text-sm">OR</span>
              <div className="h-px bg-border flex-1" />
            </div>

            {/* Tweet URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Tweet URL
                <span className="text-muted-foreground font-normal ml-2">
                  (we&apos;ll extract content & date)
                </span>
              </label>
              <input
                type="url"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://twitter.com/username/status/..."
                className="w-full p-4 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
              />
            </div>

            {/* Original Date (optional) */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Original Post Date
                <span className="text-muted-foreground font-normal ml-2">
                  (optional if URL provided)
                </span>
              </label>
              <input
                type="date"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
                className="w-full p-4 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Suspect Handles - Only show for targeted search */}
            {searchMode === "targeted" && (
              <>
                <div className="h-px bg-border my-6" />
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Suspect Handles
                    <span className="text-muted-foreground font-normal ml-2">
                      (up to 5 Twitter/X usernames)
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suspects.map((suspect, index) => (
                      <div key={index} className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          @
                        </span>
                        <input
                          type="text"
                          value={suspect}
                          onChange={(e) => updateSuspect(index, e.target.value)}
                          placeholder={`suspect${index + 1}`}
                          className="w-full p-4 pl-8 bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">🔄</span>
                  {searchMode === "open"
                    ? "Searching all of X..."
                    : "Searching suspects..."
                  }
                </>
              ) : (
                <>
                  {searchMode === "open" ? "🌐" : "🎯"}
                  {searchMode === "open"
                    ? " Find Copycats Anywhere"
                    : " Check Suspects"
                  }
                </>
              )}
            </button>
          </Card>

          {/* Results Section - RESTORED LIST VIEW */}
          {result && (
            <div className="space-y-6">

              {/* Summary + Download Button wrapper */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-lg border border-border">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    {result.results?.some(r => r.isCopycat) ? "🚨 Copycats Found" : "✅ No Copycats"}
                  </h3>
                  <p className="text-muted-foreground text-sm mt-1">{result.summary}</p>
                </div>

                <button
                  onClick={generateEvidenceCard}
                  disabled={isGeneratingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  {isGeneratingImage ? <span className="animate-spin">🔄</span> : <Download className="w-4 h-4" />}
                  Save Evidence
                </button>
              </div>

              {/* List of Suspects (Captured Area) */}
              <div ref={resultListRef} className="space-y-4 p-4 bg-background"> {/* Added padding/bg for clean screenshot */}
                {/* Branding for screenshot (invisible usually but captured) */}
                <div className="hidden group-hover:block text-center mb-4 opacity-50 text-xs">
                  Scan by CopyCat Detector
                </div>

                {result.results?.map((item, index) => (
                  <Card key={index} className={`p-6 border-l-4 ${item.isCopycat ? "border-l-red-500 border-red-500/20 bg-red-500/5" : "border-l-green-500 border-green-500/20 bg-green-500/5"
                    }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          {item.suspect}
                          {item.isCopycat && (
                            <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${getConfidenceColor(item.confidence)} bg-secondary`}>
                              {item.confidence} Match
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="text-2xl">
                        {item.isCopycat ? "🚫" : "✅"}
                      </div>
                    </div>

                    {/* Matched Content Block */}
                    {item.matchedTweet ? (
                      <div className="bg-secondary/50 p-4 rounded-md mb-3 text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                        {item.matchedTweet.content}
                      </div>
                    ) : (
                      <p className="text-sm text-green-500 italic mb-3">No matching content found.</p>
                    )}

                    {/* Matches details info */}
                    {item.matchedTweet && (
                      <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                        {item.matchedTweet.date && <span>📅 {item.matchedTweet.date}</span>}
                        {item.matchedTweet.similarity && <span>📊 {item.matchedTweet.similarity} Similarity</span>}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground border-t border-border/50 pt-3">
                      <span className="font-semibold">Analysis:</span> {item.explanation}
                    </p>

                    {item.matchedTweet?.url && (
                      <a
                        href={item.matchedTweet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        View their tweet ↗
                      </a>
                    )}
                  </Card>
                ))}

                {/* Footer for screenshot */}
                <div className="text-center mt-6 pt-4 border-t border-dashed border-border/30 text-xs text-muted-foreground/50">
                  Verified by Tweet Improver AI
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </main>
  );
}