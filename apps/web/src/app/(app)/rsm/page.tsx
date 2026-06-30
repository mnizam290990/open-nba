"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, AlertTriangle, ChevronRight } from "lucide-react";

type MRRow = {
  mrId: string;
  name: string;
  territory: string;
  lastActivityAt: string | null;
};

type ComplianceData = {
  complianceRate: number;
  totalCards: number;
  actedCards: number;
  escalations: number;
};

function StatCard({
  testId,
  icon,
  value,
  label,
  iconClass,
}: {
  testId: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  iconClass: string;
}) {
  return (
    <div data-testid={testId} className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function RSMDashboardPage() {
  const router = useRouter();

  const [team, setTeam] = useState<MRRow[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/rsm/team").then((r) => r.json()),
      fetch("/api/v1/rsm/compliance").then((r) => r.json()),
    ])
      .then(([teamJson, complianceJson]) => {
        setTeam(teamJson.data?.data ?? []);
        setCompliance(complianceJson.data ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const compliancePct =
    compliance
      ? `${Math.round(compliance.complianceRate * 100)}%`
      : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 data-testid="rsm-dashboard-heading" className="text-xl font-bold">
          Team Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">NBA compliance and territory overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          testId="compliance-rate-card"
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          iconClass="bg-primary/10"
          value={loading ? "—" : compliancePct}
          label="NBA Compliance Rate"
        />
        <StatCard
          testId="escalations-card"
          icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          iconClass="bg-red-500/10"
          value={loading ? "—" : String(compliance?.escalations ?? "—")}
          label="48h Escalations"
        />
        <StatCard
          testId="team-size-card"
          icon={<Users className="h-5 w-5 text-primary" />}
          iconClass="bg-primary/10"
          value={loading ? "—" : String(team.length)}
          label="Team Members"
        />
      </div>

      <section data-testid="team-table-section" className="rounded-xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">MR Overview</h2>
        </div>

        {loading && (
          <div
            data-testid="team-table-body"
            className="px-5 py-8 text-center text-sm text-muted-foreground"
          >
            Loading team data…
          </div>
        )}

        {!loading && team.length === 0 && (
          <div
            data-testid="team-table-body"
            className="px-5 py-8 text-center text-sm text-muted-foreground"
          >
            Team data will appear here once the agent pipeline has run.
          </div>
        )}

        {!loading && team.length > 0 && (
          <ul data-testid="team-table-body">
            {team.map((mr) => (
              <li key={mr.mrId} className="border-b last:border-b-0">
                <button
                  data-testid="rsm-mr-row"
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() => router.push(`/rsm/mr/${mr.mrId}`)}
                  aria-label={`View details for ${mr.name}`}
                >
                  <div>
                    <p className="font-medium">{mr.name}</p>
                    <p className="text-xs text-muted-foreground">{mr.territory}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {mr.lastActivityAt
                        ? `Last active ${new Date(mr.lastActivityAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                        : "No activity recorded"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
