"use client";

import { useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { HCPCard, type HCPCardData } from "@/components/feed/HCPCard";
import { HCPDetailPanel } from "@/components/feed/HCPDetailPanel";
import { HCPFeedSkeleton } from "@/components/feed/HCPCardSkeleton";
import { FeedErrorBoundary } from "@/components/layout/FeedErrorBoundary";
import { Button } from "@/components/ui/button";

export default function FeedPage() {
  const [cards, setCards] = useState<HCPCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCard, setSelectedCard] = useState<HCPCardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/hcps?limit=25");
      if (!res.ok) throw new Error("Failed to load feed");
      const json = await res.json();
      setCards(json.data ?? []);
    } catch (err) {
      setError("Failed to load the NBA feed. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  async function handleAction(
    cardId: string,
    hcpId: string,
    actionType: "SCHEDULE_VISIT" | "LOG_CALL" | "DISMISS" | "SNOOZE"
  ) {
    const res = await fetch("/api/v1/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hcp_id: hcpId, action_type: actionType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Action failed");
    }

    if (actionType === "DISMISS" || actionType === "SNOOZE") {
      setCards((prev) => prev.filter((c) => c.cardId !== cardId));
      if (selectedCard?.cardId === cardId) setSelectedCard(null);
    }
  }

  return (
    <FeedErrorBoundary>
      <div className="space-y-4">
        {/* Feed header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 data-testid="feed-heading" className="text-xl font-bold">
              Your NBA Feed
            </h1>
            {!isLoading && (
              <p className="text-sm text-muted-foreground">
                {cards.length} HCPs prioritised
              </p>
            )}
          </div>
          <Button
            data-testid="refresh-feed-btn"
            variant="outline"
            size="sm"
            isLoading={isRefreshing}
            onClick={() => loadFeed(true)}
            aria-label="Refresh NBA feed"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Loading skeleton */}
        {isLoading && <HCPFeedSkeleton count={5} />}

        {/* Error state */}
        {!isLoading && error && (
          <div
            data-testid="feed-error"
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button
              data-testid="feed-error-retry-btn"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => loadFeed()}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && cards.length === 0 && (
          <div
            data-testid="feed-empty"
            className="rounded-xl border border-dashed px-6 py-12 text-center"
          >
            <p className="font-medium">All caught up!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No HCP actions required right now.
            </p>
          </div>
        )}

        {/* NBA Cards */}
        {!isLoading && !error && cards.length > 0 && (
          <div
            data-testid="hcp-feed-list"
            className="space-y-3"
            role="list"
            aria-label="NBA feed — HCP cards sorted by priority"
          >
            {cards.map((card) => (
              <div key={card.cardId} role="listitem">
                <HCPCard
                  card={card}
                  onAction={handleAction}
                  onViewDetail={setSelectedCard}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HCP Detail Panel */}
      <HCPDetailPanel
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </FeedErrorBoundary>
  );
}
