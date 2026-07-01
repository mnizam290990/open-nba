"use client";

import { useState } from "react";
import { Calendar, Phone, X, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export interface HCPCardData {
  cardId: string;
  hcpId: string;
  priorityScore: number;
  urgencyLevel: "HIGH" | "MEDIUM" | "LOW";
  daysSinceLastVisit: number | null;
  isPartiallyEnriched: boolean;
  summary?: string | null;
  talkingPoints?: string[];
  hcp: {
    name: string;
    specialty: string;
    territory: string;
    tier: "TIER_1" | "TIER_2" | "TIER_3";
    npi?: string | null;
  };
  offer?: {
    title: string;
    type: string;
  } | null;
}

interface HCPCardProps {
  card: HCPCardData;
  onAction: (cardId: string, hcpId: string, actionType: "SCHEDULE_VISIT" | "LOG_CALL" | "DISMISS" | "SNOOZE") => Promise<void>;
  onViewDetail: (card: HCPCardData) => void;
}

const URGENCY_LABELS: Record<string, string> = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
};

const TIER_LABELS: Record<string, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
};

export function HCPCard({ card, onAction, onViewDetail }: HCPCardProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const urgencyVariant = card.urgencyLevel === "HIGH" ? "high" : card.urgencyLevel === "MEDIUM" ? "medium" : "low";

  async function handleAction(actionType: "SCHEDULE_VISIT" | "LOG_CALL" | "DISMISS" | "SNOOZE") {
    setLoadingAction(actionType);
    try {
      await onAction(card.cardId, card.hcpId, actionType);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <article
      data-testid="hcp-card"
      data-card-id={card.cardId}
      aria-label={`${card.hcp.name}, ${card.urgencyLevel} priority, ${card.hcp.specialty}`}
      className={clsx(
        "rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        card.urgencyLevel === "HIGH" && "border-red-200 dark:border-red-900/40",
        card.urgencyLevel === "MEDIUM" && "border-amber-200 dark:border-amber-900/40",
        card.urgencyLevel === "LOW" && "border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              data-testid="urgency-badge"
              variant={urgencyVariant}
              aria-label={`Urgency: ${URGENCY_LABELS[card.urgencyLevel]}`}
            >
              {URGENCY_LABELS[card.urgencyLevel]}
            </Badge>

            <Badge
              data-testid="tier-badge"
              variant="secondary"
              aria-label={`Prescriber ${TIER_LABELS[card.hcp.tier]}`}
            >
              {TIER_LABELS[card.hcp.tier]}
            </Badge>

            {card.isPartiallyEnriched && (
              <Badge
                data-testid="partially-enriched-badge"
                variant="partial"
                aria-label="Partially enriched — some data unavailable"
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Partial data
              </Badge>
            )}
          </div>

          <button
            data-testid="hcp-name-btn"
            onClick={() => onViewDetail(card)}
            className="group mt-1 flex items-center gap-1 text-left"
            aria-label={`View details for ${card.hcp.name}`}
          >
            <h3 className="font-semibold text-card-foreground group-hover:text-primary">
              {card.hcp.name}
            </h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
          </button>

          <p className="mt-0.5 text-sm text-muted-foreground">
            {card.hcp.specialty.charAt(0) + card.hcp.specialty.slice(1).toLowerCase()} ·{" "}
            {card.hcp.territory}
          </p>
        </div>

        {/* Score */}
        <div
          data-testid="priority-score"
          className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted"
          aria-label={`Priority score: ${Math.round(Number(card.priorityScore))}`}
        >
          <span className="text-sm font-bold text-card-foreground">
            {Math.round(Number(card.priorityScore))}
          </span>
          <span className="text-[10px] text-muted-foreground">score</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span
          data-testid="days-since-visit"
          className={clsx(
            "flex items-center gap-1",
            (card.daysSinceLastVisit ?? 0) >= 60 && "font-medium text-red-600 dark:text-red-400"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {card.daysSinceLastVisit != null
            ? `${card.daysSinceLastVisit}d since last visit`
            : "No visit history"}
        </span>

        {card.offer && (
          <span data-testid="offer-badge" className="flex items-center gap-1 truncate text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            {card.offer.title}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          data-testid="schedule-visit-btn"
          size="sm"
          variant="default"
          isLoading={loadingAction === "SCHEDULE_VISIT"}
          onClick={() => handleAction("SCHEDULE_VISIT")}
          aria-label={`Schedule visit with ${card.hcp.name}`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Schedule Visit
        </Button>

        <Button
          data-testid="log-call-btn"
          size="sm"
          variant="outline"
          isLoading={loadingAction === "LOG_CALL"}
          onClick={() => handleAction("LOG_CALL")}
          aria-label={`Log call with ${card.hcp.name}`}
        >
          <Phone className="h-3.5 w-3.5" />
          Log Call
        </Button>

        <Button
          data-testid="snooze-btn"
          size="sm"
          variant="outline"
          isLoading={loadingAction === "SNOOZE"}
          onClick={() => handleAction("SNOOZE")}
          aria-label={`Snooze ${card.hcp.name} for 7 days`}
        >
          <Clock className="h-3.5 w-3.5" />
          Snooze (7d)
        </Button>

        <Button
          data-testid="dismiss-btn"
          size="sm"
          variant="ghost"
          isLoading={loadingAction === "DISMISS"}
          onClick={() => handleAction("DISMISS")}
          className="text-muted-foreground hover:text-destructive"
          aria-label={`Dismiss ${card.hcp.name} from feed`}
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </div>
    </article>
  );
}
