"use client";

import { useState } from "react";
import { TweetImprover } from "@/components/TweetImprover";
import { TweetPreview } from "@/components/TweetPreview";
import Link from "next/link";

export default function Home() {
  const [result, setResult] = useState<{
    improvedText: string;
    tweets: string[];
    isThread: boolean;
    characterCount: number;
  } | null>(null);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <h1 className="text-xl font-semibold">Tweet Improver AI</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/history"
              className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-colors"
            >
              📜 History
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

      {/* Main Content - Vertical Layout */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-semibold mb-3">
              Transform messy text into <span className="text-primary">viral tweets</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Paste your raw, unformatted text and watch AI craft perfectly structured,
              engaging tweets ready to post.
            </p>
          </div>

          {/* Vertical Stack Layout */}
          <div className="space-y-8">
            {/* Input Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Input
              </h3>
              <TweetImprover onImproved={setResult} />
            </div>

            {/* Output Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Output
              </h3>
              <TweetPreview
                tweets={result?.tweets || []}
                isThread={result?.isThread || false}
              />
            </div>
          </div>

          {/* Features List */}
          <div className="mt-16 grid sm:grid-cols-3 gap-6">
            {[
              { icon: "✨", title: "Auto Line Breaks", desc: "Adds strategic breaks for readability" },
              { icon: "🧵", title: "Thread Splitter", desc: "Splits long content into tweet threads" },
              { icon: "📋", title: "One-Click Copy", desc: "Copy individual tweets or full threads" },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6 rounded-lg bg-card border border-border">
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h4 className="font-semibold mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}