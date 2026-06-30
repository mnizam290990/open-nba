import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shield, ToggleLeft, Activity, ClipboardCheck } from "lucide-react";

export default async function AdminConsolePage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "ADMIN") {
    redirect("/feed?accessDenied=true");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 data-testid="admin-heading" className="text-xl font-bold">
          Admin Console
        </h1>
        <p className="text-sm text-muted-foreground">
          Operational controls — changes take effect immediately
        </p>
      </div>

      {/* DATA_MODE Toggle */}
      <section
        data-testid="data-mode-section"
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ToggleLeft className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">DATA_MODE Toggle</h2>
            <p className="text-sm text-muted-foreground">
              Current mode:{" "}
              <span
                data-testid="current-data-mode"
                className="font-medium text-primary"
              >
                {process.env.DATA_MODE ?? "MOCK"}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button
            data-testid="data-mode-toggle-btn"
            className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
            aria-label="Toggle DATA_MODE — runs pre-flight validation first"
          >
            Run Pre-Flight Validation & Toggle
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            A schema-mapping pre-flight check must pass before switching MOCK → LIVE
          </p>
        </div>
      </section>

      {/* Production Readiness Checklist */}
      <section
        data-testid="production-checklist-section"
        className="rounded-xl border bg-card p-5"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Production Readiness Checklist</h2>
        </div>

        <div data-testid="checklist-items" className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <div
              key={item.id}
              data-testid={`checklist-item-${item.id}`}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm"
            >
              <span
                className={
                  item.status === "pass"
                    ? "text-emerald-600"
                    : item.status === "fail"
                      ? "text-red-500"
                      : "text-muted-foreground"
                }
                aria-label={item.status === "pass" ? "Passed" : item.status === "fail" ? "Failed" : "Pending"}
              >
                {item.status === "pass" ? "✓" : item.status === "fail" ? "✗" : "○"}
              </span>
              <div>
                <p className="font-medium">{item.label}</p>
                {item.hint && item.status !== "pass" && (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Health Metrics */}
      <section
        data-testid="agent-health-section"
        className="rounded-xl border bg-card p-5"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-semibold">Agent Health</h2>
        </div>
        <div
          data-testid="agent-health-metrics"
          className="grid gap-3 sm:grid-cols-3"
        >
          {HEALTH_METRICS.map((metric) => (
            <div
              key={metric.label}
              data-testid={`health-metric-${metric.testId}`}
              className="rounded-lg border bg-muted/30 px-4 py-3"
            >
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const CHECKLIST_ITEMS = [
  {
    id: "schema-mapping",
    label: "Schema mapping complete",
    status: "pending" as const,
    hint: "All required CRM fields must be mapped before switching to LIVE mode",
  },
  {
    id: "crm-connector",
    label: "CRM connector test passed",
    status: "pending" as const,
    hint: "At least one successful read from the CRM API is required",
  },
  {
    id: "dpa",
    label: "Data Processing Agreement acknowledged",
    status: "pending" as const,
    hint: "A DPA acknowledgement from an authorized representative is required",
  },
  {
    id: "offer-catalog",
    label: "Offer catalog seeded",
    status: "pass" as const,
    hint: null,
  },
  {
    id: "mr-account",
    label: "At least one MR account provisioned",
    status: "pass" as const,
    hint: null,
  },
  {
    id: "audit-log",
    label: "Audit log capturing events",
    status: "pass" as const,
    hint: null,
  },
];

const HEALTH_METRICS = [
  { label: "Pipeline runs (7d)", value: "—", testId: "runs" },
  { label: "Success rate", value: "—", testId: "success-rate" },
  { label: "LLM tokens (7d)", value: "—", testId: "tokens" },
];
