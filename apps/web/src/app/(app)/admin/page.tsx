"use client";

import { useEffect, useState } from "react";
import { Shield, ToggleLeft, ToggleRight, Activity, ClipboardCheck, AlertTriangle } from "lucide-react";

type DataMode = "MOCK" | "LIVE";

type HealthMetrics = {
  runs7d: number;
  successRate: number;
  tokensUsed: number;
};

const CHECKLIST_BASE = [
  {
    id: "schema-mapping",
    label: "Schema mapping complete",
    hint: "All required CRM fields must be mapped before switching to LIVE mode",
  },
  {
    id: "crm-connector",
    label: "CRM connector test passed",
    hint: "At least one successful read from the CRM API is required",
  },
  {
    id: "dpa",
    label: "Data Processing Agreement acknowledged",
    hint: "A DPA acknowledgement from an authorized representative is required",
  },
  {
    id: "offer-catalog",
    label: "Offer catalog seeded",
    hint: null,
  },
  {
    id: "mr-account",
    label: "At least one MR account provisioned",
    hint: null,
  },
  {
    id: "audit-log",
    label: "Audit log capturing events",
    hint: null,
  },
];

const AUTO_PASS_IDS = new Set(["offer-catalog", "mr-account", "audit-log"]);

export default function AdminConsolePage() {
  const [dataMode, setDataMode] = useState<DataMode>("MOCK");
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [toggleFailures, setToggleFailures] = useState<string[]>([]);

  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/data-mode")
      .then((r) => r.json())
      .then((j) => setDataMode(j.data?.mode ?? "MOCK"))
      .catch(() => {});

    fetch("/api/v1/admin/health-metrics")
      .then((r) => r.json())
      .then((j) => setHealth(j.data ?? null))
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, []);

  async function handleToggle() {
    setToggling(true);
    setToggleError(null);
    setToggleFailures([]);

    try {
      const res = await fetch("/api/v1/admin/data-mode", { method: "POST" });
      const json = await res.json();

      if (res.ok) {
        setDataMode(json.data?.mode ?? dataMode);
      } else if (res.status === 422) {
        setToggleFailures(json.failures ?? []);
        setToggleError("Pre-flight checks failed. Resolve the issues below before switching to LIVE.");
      } else {
        setToggleError(json.error ?? "Failed to toggle DATA_MODE.");
      }
    } catch {
      setToggleError("Network error — could not reach server.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 data-testid="admin-heading" className="text-xl font-bold">
            Admin Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Operational controls — changes take effect immediately
          </p>
        </div>
      </div>

      {/* DATA_MODE Toggle */}
      <section data-testid="data-mode-section" className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              {dataMode === "LIVE" ? (
                <ToggleRight className="h-5 w-5 text-primary" />
              ) : (
                <ToggleLeft className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">DATA_MODE Toggle</h2>
              <p className="text-sm text-muted-foreground">
                Current mode:{" "}
                <span
                  data-testid="current-data-mode"
                  className={`font-semibold ${dataMode === "LIVE" ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {dataMode}
                </span>
              </p>
            </div>
          </div>
          <button
            data-testid="data-mode-toggle-btn"
            onClick={handleToggle}
            disabled={toggling}
            className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
            aria-label="Toggle DATA_MODE — runs pre-flight validation first"
          >
            {toggling
              ? "Running checks…"
              : dataMode === "MOCK"
                ? "Switch to LIVE"
                : "Switch to MOCK"}
          </button>
        </div>

        {toggleError && (
          <div
            data-testid="data-mode-error"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p>{toggleError}</p>
              {toggleFailures.length > 0 && (
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                  {toggleFailures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          A schema-mapping pre-flight check must pass before switching MOCK → LIVE
        </p>
      </section>

      {/* Production Readiness Checklist */}
      <section data-testid="production-checklist-section" className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Production Readiness Checklist</h2>
        </div>

        <div data-testid="checklist-items" className="space-y-2">
          {CHECKLIST_BASE.map((item) => {
            const status = AUTO_PASS_IDS.has(item.id) ? "pass" : "pending";
            return (
              <div
                key={item.id}
                data-testid={`checklist-item-${item.id}`}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
              >
                <span
                  className={
                    status === "pass" ? "text-emerald-600" : "text-muted-foreground"
                  }
                  aria-label={status === "pass" ? "Passed" : "Pending"}
                >
                  {status === "pass" ? "✓" : "○"}
                </span>
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.hint && status !== "pass" && (
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Agent Health Metrics */}
      <section data-testid="agent-health-section" className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Agent Health</h2>
        </div>
        <div data-testid="agent-health-metrics" className="grid gap-3 sm:grid-cols-3">
          <div data-testid="health-metric-runs" className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-2xl font-bold">
              {healthLoading ? "—" : health?.runs7d ?? "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Pipeline runs (7d)</p>
          </div>
          <div data-testid="health-metric-success-rate" className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-2xl font-bold">
              {healthLoading
                ? "—"
                : health
                  ? `${Math.round(health.successRate * 100)}%`
                  : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Success rate</p>
          </div>
          <div data-testid="health-metric-tokens" className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-2xl font-bold">
              {healthLoading
                ? "—"
                : health?.tokensUsed != null
                  ? health.tokensUsed.toLocaleString()
                  : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">LLM tokens (7d)</p>
          </div>
        </div>
      </section>

      {/* Offer Catalog Management */}
      <section data-testid="offer-catalog-section" className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Offer Catalog</h2>
          </div>
          <a
            href="/admin/offers"
            data-testid="manage-offers-link"
            className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Manage Offers →
          </a>
        </div>
        <p className="text-sm text-muted-foreground">
          Create, edit, and deactivate offers available to MRs during NBA interactions.
        </p>
      </section>
    </div>
  );
}
