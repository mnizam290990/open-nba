import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

export default async function RSMDashboardPage() {
  const session = await auth();
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole === "MR") {
    redirect("/feed?accessDenied=true");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 data-testid="rsm-dashboard-heading" className="text-xl font-bold">
          Team Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          NBA compliance and territory overview
        </p>
      </div>

      {/* Compliance Metric */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          data-testid="compliance-rate-card"
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p
                data-testid="compliance-rate-value"
                className="text-2xl font-bold"
              >
                —
              </p>
              <p className="text-sm text-muted-foreground">NBA Compliance Rate</p>
            </div>
          </div>
        </div>

        <div
          data-testid="escalations-card"
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p
                data-testid="escalations-value"
                className="text-2xl font-bold"
              >
                —
              </p>
              <p className="text-sm text-muted-foreground">48h Escalations</p>
            </div>
          </div>
        </div>

        <div
          data-testid="team-size-card"
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p
                data-testid="team-size-value"
                className="text-2xl font-bold"
              >
                —
              </p>
              <p className="text-sm text-muted-foreground">Team Members</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Table */}
      <section
        data-testid="team-table-section"
        className="rounded-xl border bg-card"
      >
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold">MR Overview</h2>
        </div>
        <div
          data-testid="team-table-body"
          className="px-5 py-4 text-center text-sm text-muted-foreground"
        >
          Team data will appear here once the agent pipeline has run.
        </div>
      </section>
    </div>
  );
}
