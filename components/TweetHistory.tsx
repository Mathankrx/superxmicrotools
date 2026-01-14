"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useVisitorId } from "@/hooks/useVisitorId";

interface HistoryItem {
    id: string;
    originalText: string;
    improvedText: string;
    isThread: boolean;
    mode: string;
    createdAt: string;
}

interface TweetHistoryProps {
    onSelect: (item: HistoryItem) => void;
}

export function TweetHistory({ onSelect }: TweetHistoryProps) {
    const visitorId = useVisitorId();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    const truncate = (text: string, length: number = 60) => {
        return text.length > length ? text.slice(0, length) + "..." : text;
    };

    if (!visitorId) return null;

    return (
        <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    History
                </h3>
                <button
                    onClick={fetchHistory}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    ↻ Refresh
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                    Loading...
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                    No history yet. Start improving tweets!
                </div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                    {history.map((item) => (
                        <div
                            key={item.id}
                            className="p-3 bg-secondary/50 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors group"
                            onClick={() => onSelect(item)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground mb-1">
                                        {item.isThread ? "🧵 Thread" : "📝 Tweet"} • {new Date(item.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-sm text-foreground truncate">
                                        {truncate(item.originalText)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteItem(item.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs transition-opacity"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
