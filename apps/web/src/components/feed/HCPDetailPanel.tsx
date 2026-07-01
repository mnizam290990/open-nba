"use client";

import { useEffect, useRef } from "react";
import {
  X,
  AlertTriangle,
  FileText,
  Lightbulb,
  Package,
  Calendar,
  Clock,
} from "lucide-react";
import { clsx } from "clsx";
import { Badge } from "@/components/ui/badge";
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

const URGENCY_LABELS: Record<string, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

const MOCK_TALKING_POINTS = [
  "Patient compliance data shows strong outcomes for Tier-1 prescribers in this territory — bring the 6-month adherence chart.",
  "HCP has expressed interest in the latest trial data at last regional meeting. Lead with the JAMA abstract.",
  "Practice pattern indicates seasonal prescription peaks in Q3 — timing for CME invite is optimal now.",
];

const MOCK_SUMMARY =
  "This HCP has been a consistent prescriber in the top-20% of their territory for the past 18 months. Visit frequency dropped in the last quarter; re-engagement now offers a high-ROI opportunity ahead of the Q3 seasonal peak.";

function formatLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </span>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}

export function HCPDetailPanel({ card, onClose }: HCPDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!card) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [card, onClose]);

  if (!card) return null;

  const talkingPoints =
    Array.isArray(card.talkingPoints) && card.talkingPoints.length > 0
      ? card.talkingPoints
      : MOCK_TALKING_POINTS;

  const summary = card.summary ?? MOCK_SUMMARY;
  const urgencyVariant =
    card.urgencyLevel === "HIGH" ? "high" : card.urgencyLevel === "MEDIUM" ? "medium" : "low";
  const isGapCritical = (card.daysSinceLastVisit ?? 0) >= 60;

  return (
    <>
      <div
        data-testid="detail-panel-backdrop"
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        data-testid="hcp-detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`HCP detail panel for ${card.hcp.name}`}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md animate-slide-in flex-col border-l border-border bg-card shadow-[-8px_0_30px_rgba(15,23,42,0.12)] focus:outline-none"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-card px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={urgencyVariant}>{URGENCY_LABELS[card.urgencyLevel]}</Badge>
                <Badge variant="secondary">{TIER_LABELS[card.hcp.tier]}</Badge>
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
              <h2
                data-testid="detail-panel-hcp-name"
                className="text-lg font-semibold leading-tight text-card-foreground"
              >
                {card.hcp.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatLabel(card.hcp.specialty)} · {card.hcp.territory}
              </p>
            </div>
            <button
              data-testid="detail-panel-close-btn"
              onClick={onClose}
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close HCP detail panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-medium text-foreground">
              <span className="text-xs text-muted-foreground">Score</span>
              {Math.round(Number(card.priorityScore))}
            </span>
            <span
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1",
                isGapCritical
                  ? "bg-red-50 font-medium text-red-700"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              {card.daysSinceLastVisit != null
                ? `${card.daysSinceLastVisit}d since last visit`
                : "No visit history"}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section
            data-testid="detail-summary-section"
            className="rounded-xl border border-border bg-muted/40 p-4"
          >
            <SectionHeader icon={FileText} title="Interaction Summary" />
            <p
              data-testid="detail-summary-text"
              className="text-sm leading-relaxed text-foreground"
            >
              {summary}
            </p>
          </section>

          <section data-testid="detail-talking-points-section">
            <SectionHeader icon={Lightbulb} title="Talking Points" />
            {talkingPoints.length > 0 ? (
              <ol className="list-none space-y-2.5 p-0">
                {talkingPoints.map((point, i) => (
                  <li
                    key={i}
                    data-testid={`talking-point-${i + 1}`}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p data-testid="talking-points-empty" className="text-sm text-muted-foreground">
                Talking points not available for this HCP.
              </p>
            )}
          </section>

          <section data-testid="detail-offer-section">
            <SectionHeader icon={Package} title="Recommended Offer" />
            {card.offer ? (
              <div
                data-testid="detail-offer-card"
                className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
              >
                <p className="font-medium text-foreground">{card.offer.title}</p>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                  {formatLabel(card.offer.type)}
                </p>
              </div>
            ) : (
              <p
                data-testid="detail-no-offer"
                className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground"
              >
                No offer available for this HCP at this time.
              </p>
            )}
          </section>

          <section
            data-testid="detail-scheduling-section"
            className={clsx(
              "rounded-xl border p-4",
              isGapCritical
                ? "border-amber-200 bg-amber-50"
                : "border-border bg-muted/40"
            )}
          >
            <SectionHeader icon={Calendar} title="Scheduling Suggestion" />
            <p
              data-testid="detail-scheduling-text"
              className={clsx(
                "text-sm leading-relaxed",
                isGapCritical ? "font-medium text-amber-900" : "text-foreground"
              )}
            >
              {isGapCritical
                ? `This HCP has not been visited in ${card.daysSinceLastVisit} days. Schedule a visit within the next 7 days to maintain engagement.`
                : "Visit recommended within the next 30 days based on prescriber activity."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
