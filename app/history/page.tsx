"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useVisitorId } from "@/hooks/useVisitorId";
import Link from "next/link";

interface HistoryItem {
    id: string;
    originalText: string;
    improvedText: string;
    isThread: boolean;
    mode: string;
    createdAt: string;
}

export default function HistoryPage() {
    const visitorId = useVisitorId();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        if (!visitorId) return;

        try {
            const res = await fetch(`/api/history?visitorId=${visitorId}`);
            const data = await res.json();
            setHistory(data.history || []);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, [visitorId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const deleteItem = async (id: string) => {
        if (!visitorId) return;

        try {
            await fetch("/api/history", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, visitorId }),
            });
            setHistory(history.filter((h) => h.id !== id));
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <main className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/improver" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <span className="text-2xl">🔥</span>
                            <h1 className="text-xl font-semibold">Tweet Improver AI</h1>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/improver"
                            className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm transition-colors"
                        >
                            ← Back to Editor
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
                <div className="max-w-3xl mx-auto">
                    {/* Page Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-3xl font-semibold mb-2">Your History</h2>
                            <p className="text-muted-foreground">
                                {history.length} saved improvement{history.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button
                            onClick={fetchHistory}
                            className="text-sm text-muted-foreground hover:text-foreground px-4 py-2 border border-border rounded-lg transition-colors"
                        >
                            ↻ Refresh
                        </button>
                    </div>

                    {/* History List */}
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading your history...
                        </div>
                    ) : history.length === 0 ? (
                        <Card className="p-12 text-center bg-card border-border">
                            <p className="text-4xl mb-4">📝</p>
                            <h3 className="text-xl font-semibold mb-2">No history yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Start improving tweets to see your history here
                            </p>
                            <Link
                                href="/improver"
                                className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Start Improving Tweets
                            </Link>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {history.map((item) => (
                                <Card key={item.id} className="p-6 bg-card border-border hover:border-primary/30 transition-colors">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{item.isThread ? "🧵" : "📝"}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {item.isThread ? "Thread" : "Tweet"} • {new Date(item.createdAt).toLocaleDateString()} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => deleteItem(item.id)}
                                            className="text-muted-foreground hover:text-destructive text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>

                                    {/* Original Text */}
                                    <div className="mb-4">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Original</p>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {item.originalText}
                                        </p>
                                    </div>

                                    {/* Improved Text */}
                                    <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Improved</p>
                                        <p className="text-foreground whitespace-pre-wrap">
                                            {item.improvedText.split("\n---\n").join("\n\n---\n\n")}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-3 mt-4">
                                        <button
                                            onClick={() => copyToClipboard(item.improvedText, item.id)}
                                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {copiedId === item.id ? "✓ Copied!" : "📋 Copy"}
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
