"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useVisitorId } from "@/hooks/useVisitorId";

type OutputMode = "auto" | "single" | "thread";

interface TweetImproverProps {
    onImproved: (result: {
        improvedText: string;
        tweets: string[];
        isThread: boolean;
        characterCount: number;
    }) => void;
    initialText?: string;
}

export function TweetImprover({ onImproved, initialText }: TweetImproverProps) {
    const visitorId = useVisitorId();
    const [inputText, setInputText] = useState(initialText || "");
    const [addEmojis, setAddEmojis] = useState(false);
    const [mode, setMode] = useState<OutputMode>("auto");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Update input when initialText changes (from history selection)
    useEffect(() => {
        if (initialText) {
            setInputText(initialText);
        }
    }, [initialText]);

    const handleImprove = async () => {
        if (!inputText.trim()) {
            setError("Please enter some text to improve");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/improve-tweet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: inputText, addEmojis, mode, visitorId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to improve tweet");
            }

            onImproved(data);

            // Saved to history automatically by the server
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    };

    const getModeHint = () => {
        if (mode === "single") return "Will create a single tweet (no limit)";
        if (mode === "thread") return "Will create a thread (multiple tweets)";
        return inputText.length > 500
            ? "Will be split into a thread"
            : "Will create a single tweet";
    };

    return (
        <Card className="p-6 bg-card border-border">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                        Paste your raw text
                    </label>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste your unformatted text here... I'll transform it into a viral tweet!"
                        className="w-full h-40 px-4 py-3 bg-input border border-border rounded-lg 
                       text-foreground placeholder:text-muted-foreground 
                       focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
                       resize-none scrollbar-thin transition-all"
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>{inputText.length} characters</span>
                        <span className="text-primary">{getModeHint()}</span>
                    </div>
                </div>

                {/* Options Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Output Mode Toggle */}
                    <div className="flex items-center bg-secondary rounded-lg p-1 border border-border">
                        {(["auto", "single", "thread"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-3 py-1.5 text-sm rounded-md transition-all capitalize
                           ${mode === m
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {m === "auto" ? "Auto" : m === "single" ? "Tweet" : "Thread"}
                            </button>
                        ))}
                    </div>

                    {/* Emoji Toggle */}
                    <button
                        onClick={() => setAddEmojis(!addEmojis)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all
                       ${addEmojis
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                            }`}
                    >
                        <span>✨</span>
                        <span className="text-sm">Add emojis</span>
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                        {error}
                    </div>
                )}

                <Button
                    onClick={handleImprove}
                    disabled={isLoading || !inputText.trim()}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Improving...
                        </div>
                    ) : (
                        "✨ Improve Tweet"
                    )}
                </Button>
            </div>
        </Card>
    );
}
