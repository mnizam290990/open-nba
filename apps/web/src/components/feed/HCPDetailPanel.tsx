"use client";

import { useEffect, useRef } from "react";
import { X, AlertTriangle, FileText, Lightbulb, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HCPCardData } from "./HCPCard";

interface HCPDetailPanelProps {
  card: HCPCardData | null;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

const MOCK_TALKING_POINTS = [
  "Patient compliance data shows strong outcomes for Tier-1 prescribers in this territory — bring the 6-month adherence chart.",
  "HCP has expressed interest in the latest trial data at last regional meeting. Lead with the JAMA abstract.",
  "Practice pattern indicates seasonal prescription peaks in Q3 — timing for CME invite is optimal now.",
];

const MOCK_SUMMARY =
  "This HCP has been a consistent prescriber in the top-20% of their territory for the past 18 months. Visit frequency dropped in the last quarter; re-engagement now offers a high-ROI opportunity ahead of the Q3 seasonal peak.";

export function HCPDetailPanel({ card, onClose }: HCPDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!card) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [card, onClose]);

  if (!card) return null;

  const talkingPoints: string[] =
    Array.isArray((card as { talkingPoints?: unknown }).talkingPoints) &&
    (card as { talkingPoints: string[] }).talkingPoints.length > 0
      ? (card as { talkingPoints: string[] }).talkingPoints
      : MOCK_TALKING_POINTS;

  const summary = (card as { summary?: string | null }).summary ?? MOCK_SUMMARY;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="detail-panel-backdrop"
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        data-testid="hcp-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`HCP detail panel for ${card.hcp.name}`}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md animate-slide-in overflow-y-auto bg-background shadow-2xl focus:outline-none sm:border-l"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b bg-background px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 data-testid="detail-panel-hcp-name" className="text-lg font-semibold">
                {card.hcp.name}
              </h2>
              {card.isPartiallyEnriched && (
                <Badge
                  data-testid="detail-partially-enriched-badge"
                  variant="partial"
                  aria-label="Partially enriched — some AI content unavailable"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Partial data
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {card.hcp.specialty.charAt(0) + card.hcp.specialty.slice(1).toLowerCase()} ·{" "}
              {card.hcp.territory} · {TIER_LABELS[card.hcp.tier]}
            </p>
          </div>
          <button
            data-testid="detail-panel-close-btn"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close HCP detail panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* Interaction Summary */}
          <section data-testid="detail-summary-section">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Interaction Summary
              </h3>
            </div>
            <p data-testid="detail-summary-text" className="text-sm leading-relaxed">
              {summary}
            </p>
          </section>

          {/* Talking Points */}
          <section data-testid="detail-talking-points-section">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Talking Points
              </h3>
            </div>
            {talkingPoints.length > 0 ? (
              <ol className="space-y-3">
                {talkingPoints.map((point, i) => (
                  <li
                    key={i}
                    data-testid={`talking-point-${i + 1}`}
                    className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ol>
            ) : (
              <p data-testid="talking-points-empty" className="text-sm text-muted-foreground">
                Talking points not available for this HCP.
              </p>
            )}
          </section>

          {/* Recommended Offer */}
          <section data-testid="detail-offer-section">
            <div className="mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recommended Offer
              </h3>
            </div>
            {card.offer ? (
              <div
                data-testid="detail-offer-card"
                className="rounded-lg border bg-muted/30 px-4 py-3"
              >
                <p className="font-medium">{card.offer.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                  {card.offer.type.replace("_", " ").toLowerCase()}
                </p>
              </div>
            ) : (
              <p
                data-testid="detail-no-offer"
                className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground"
              >
                No offer available for this HCP at this time.
              </p>
            )}
          </section>

          {/* Scheduling Suggestion */}
          <section data-testid="detail-scheduling-section">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Scheduling Suggestion
            </h3>
            <p data-testid="detail-scheduling-text" className="text-sm">
              {card.daysSinceLastVisit != null && card.daysSinceLastVisit >= 60
                ? `This HCP has not been visited in ${card.daysSinceLastVisit} days. Schedule a visit within the next 7 days to maintain engagement.`
                : "Visit recommended within the next 30 days based on prescriber activity."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
