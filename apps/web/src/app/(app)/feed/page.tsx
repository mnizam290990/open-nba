"use client";

import { useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { HCPCard, type HCPCardData } from "@/components/feed/HCPCard";
import { HCPDetailPanel } from "@/components/feed/HCPDetailPanel";
import { HCPFeedSkeleton } from "@/components/feed/HCPCardSkeleton";
import { FeedErrorBoundary } from "@/components/layout/FeedErrorBoundary";
import { Button } from "@/components/ui/button";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { enqueueAction, type ActionType } from "@/lib/offline-queue";

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
    } catch {
      setError("Failed to load the NBA feed. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(() => loadFeed(true), [loadFeed]);

  const { containerRef, isPulling, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: isLoading || isRefreshing,
  });

  async function handleAction(
    cardId: string,
    hcpId: string,
    actionType: ActionType
  ) {
    if (!navigator.onLine) {
      if (actionType === "DISMISS" || actionType === "SNOOZE" || actionType === "LOG_CALL") {
        await enqueueAction({ hcpId, actionType });
        if (actionType === "DISMISS" || actionType === "SNOOZE") {
          setCards((prev) => prev.filter((c) => c.cardId !== cardId));
          if (selectedCard?.cardId === cardId) setSelectedCard(null);
        }
        return;
      }
    }

    const res = await fetch("/api/v1/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hcp_id: hcpId, action_type: actionType }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Action failed");
    }

    if (actionType === "DISMISS" || actionType === "SNOOZE") {
      setCards((prev) => prev.filter((c) => c.cardId !== cardId));
      if (selectedCard?.cardId === cardId) setSelectedCard(null);
    }
  }

  return (
    <FeedErrorBoundary>
      <div
        ref={containerRef}
        className="relative space-y-4 overflow-auto"
        data-testid="feed-container"
      >
        {/* Pull-to-refresh indicator */}
        {pullDistance > 0 && (
          <div
            data-testid="pull-to-refresh-indicator"
            aria-live="polite"
            style={{ height: `${Math.min(pullDistance, 60)}px` }}
            className="flex items-center justify-center text-sm text-muted-foreground transition-all"
          >
            <RefreshCw
              className={`h-5 w-5 ${isPulling ? "animate-spin text-primary" : ""}`}
            />
            <span className="ml-2">{isPulling ? "Release to refresh" : "Pull to refresh"}</span>
          </div>
        )}

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

        {isLoading && <HCPFeedSkeleton count={5} />}

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

      <HCPDetailPanel
        card={selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </FeedErrorBoundary>
  );
}
