"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";

type ActionRecord = {
  actionId: string;
  actionType: string;
  outcome: string | null;
  notes: string | null;
  timestamp: string;
};

type HCPRecord = {
  hcpId: string;
  name: string;
  specialty: string;
  tier: string;
  territory: string;
  urgencyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  priorityScore: string | null;
  recentActions: ActionRecord[];
};

const URGENCY_COLORS: Record<string, string> = {
  HIGH: "text-red-600 bg-red-50 border-red-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  LOW: "text-green-600 bg-green-50 border-green-200",
};

function UrgencyBadge({ level }: { level: string | null }) {
  if (!level) return null;
  return (
    <span
      data-testid="urgency-badge"
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${URGENCY_COLORS[level] ?? "text-muted-foreground"}`}
    >
      {level}
    </span>
  );
}

function ActionTypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {type.replace(/_/g, " ")}
    </span>
  );
}

function HCPRow({ hcp, expanded, onToggle }: { hcp: HCPRecord; expanded: boolean; onToggle: () => void }) {
  return (
    <div data-testid="rsm-hcp-row" className="border-b last:border-b-0">
      <button
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <UrgencyBadge level={hcp.urgencyLevel} />
          <div>
            <p className="font-medium">{hcp.name}</p>
            <p className="text-xs text-muted-foreground">
              {hcp.specialty} · {hcp.tier} · {hcp.territory}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{hcp.recentActions.length > 0 ? `${hcp.recentActions.length} actions` : "No actions"}</span>
          <span className="text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div data-testid="rsm-hcp-actions" className="bg-muted/20 px-5 pb-4">
          {hcp.recentActions.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">No recorded actions for this HCP.</p>
          ) : (
            <ul className="space-y-2 pt-2">
              {hcp.recentActions.map((action) => (
                <li key={action.actionId} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                  <div className="mt-0.5">
                    {action.outcome?.toLowerCase().includes("positive") ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ActionTypeBadge type={action.actionType} />
                      {action.outcome && (
                        <span className="text-xs text-muted-foreground">{action.outcome}</span>
                      )}
                    </div>
                    {action.notes && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{action.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {new Date(action.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function RSMMRDrillDownPage() {
  const { mr_id } = useParams<{ mr_id: string }>();
  const router = useRouter();

  const [hcps, setHcps] = useState<HCPRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedHcpId, setExpandedHcpId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/rsm/mr/${mr_id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setHcps(json.data.hcps ?? []);
        else setError("Failed to load MR data.");
      })
      .catch(() => setError("Network error."))
      .finally(() => setLoading(false));
  }, [mr_id]);

  const toggleHcp = (id: string) =>
    setExpandedHcpId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          data-testid="rsm-back-button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted/50 transition-colors"
          aria-label="Back to team overview"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 data-testid="rsm-drilldown-heading" className="text-xl font-bold">
            MR Detail View
          </h1>
          <p className="text-sm text-muted-foreground">HCP list and action history for this representative</p>
        </div>
      </div>

      {loading && (
        <div data-testid="rsm-drilldown-loading" className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading HCP data…
        </div>
      )}

      {error && !loading && (
        <div data-testid="rsm-drilldown-error" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && hcps.length === 0 && (
        <div
          data-testid="rsm-drilldown-empty"
          className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          No HCPs found for this MR. The agent pipeline may not have run yet.
        </div>
      )}

      {!loading && !error && hcps.length > 0 && (
        <section data-testid="rsm-hcp-list" className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">
              HCPs ({hcps.length})
            </h2>
          </div>
          {hcps.map((hcp) => (
            <HCPRow
              key={hcp.hcpId}
              hcp={hcp}
              expanded={expandedHcpId === hcp.hcpId}
              onToggle={() => toggleHcp(hcp.hcpId)}
            />
          ))}
        </section>
      )}
    </div>
  );
}
