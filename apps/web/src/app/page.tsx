import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "openNBA — Next Best Action for Pharma MRs",
};

const features = [
  {
    icon: "🎯",
    title: "Gap Detection",
    description:
      "Automatically flags HCPs with 60+ day visit gaps so no opportunity is missed.",
  },
  {
    icon: "🤖",
    title: "AI-Powered Context",
    description:
      "LLM-generated interaction summaries and personalized talking points before every visit.",
  },
  {
    icon: "📊",
    title: "Priority Scoring",
    description:
      "Multi-factor scoring across visit gap, prescriber tier, therapy area, and acceptance rate.",
  },
  {
    icon: "💊",
    title: "Offer Matching",
    description:
      "Rules-based eligibility engine surfaces the right offer asset for each HCP.",
  },
  {
    icon: "📱",
    title: "Mobile-First PWA",
    description:
      "Works offline. Installable on iOS and Android. No App Store review delay.",
  },
  {
    icon: "🔒",
    title: "Compliance-Ready",
    description:
      "Append-only audit log, RBAC, JWT sessions, and HCP de-identification before every LLM call.",
  },
];

const stats = [
  { value: "60+", label: "Day gap detection" },
  { value: "< 5 min", label: "Pipeline run time" },
  { value: "4–6 wks", label: "From repo to live demo" },
  { value: "$0–$30", label: "Monthly infra (Phase 0)" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-brand-700" data-testid="logo">
              openNBA
            </span>
            <span className="hidden sm:inline text-xs font-medium text-slate-500 border border-slate-200 rounded-full px-2 py-0.5">
              Phase 0 Demo
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="https://github.com/mnizam290990/open-nba"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-600 hover:text-brand-700 transition-colors"
            >
              GitHub
            </a>
            <Link
              href="/api/v1/health"
              className="text-sm text-slate-600 hover:text-brand-700 transition-colors"
            >
              API Health
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium rounded-full px-4 py-1.5 mb-6 border border-brand-200"
            data-testid="hero-badge"
          >
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            Powered by Nagarro
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6"
            data-testid="hero-title"
          >
            Next Best Action
            <br />
            <span className="text-brand-600">for Pharma MRs</span>
          </h1>

          <p
            className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed"
            data-testid="hero-description"
          >
            An open-architecture, agentic NBA platform that helps Medical Representatives
            re-engage HCPs at the right time with the right context — at a fraction of the cost
            of Pega CDH or Salesforce Marketing Cloud.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/feed"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors shadow-sm"
              data-testid="cta-view-demo"
            >
              View NBA Feed Demo
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="https://github.com/mnizam290990/open-nba"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-6 py-3 border border-slate-300 transition-colors"
              data-testid="cta-github"
            >
              View on GitHub
            </a>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-brand-700 py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <dl
              className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center"
              data-testid="stats-grid"
            >
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-3xl font-extrabold text-white">{stat.value}</dt>
                  <dd className="text-brand-200 text-sm mt-1">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything an MR needs</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              From gap detection to personalized talking points, openNBA delivers the full
              intelligence stack in a single, deployable platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="features-grid">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-brand-300 hover:shadow-md transition-all"
                data-testid={`feature-card-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-slate-900 py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-8">Built on proven open-source</h2>
            <div className="flex flex-wrap justify-center gap-3" data-testid="tech-stack">
              {[
                "Next.js 14",
                "TypeScript",
                "Tailwind CSS",
                "Python 3.12",
                "FastAPI",
                "LangGraph",
                "LangChain",
                "PostgreSQL 16",
                "Drizzle ORM",
                "Auth.js v5",
                "Turborepo",
                "Weaviate",
              ].map((tech) => (
                <span
                  key={tech}
                  className="bg-slate-800 text-slate-300 text-sm font-mono rounded-md px-3 py-1.5 border border-slate-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            openNBA runs in full MOCK mode out of the box — 500 synthetic HCPs, 18 months of
            visit history, pre-seeded 60-day gaps. No client data required.
          </p>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-8 py-3 transition-colors shadow-sm text-lg"
            data-testid="cta-bottom"
          >
            Open the NBA Feed
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            <strong className="text-slate-700">openNBA</strong> — Powered by Nagarro
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/mnizam290990/open-nba"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-brand-700 transition-colors"
            >
              GitHub
            </a>
            <Link href="/api/v1/health" className="hover:text-brand-700 transition-colors">
              Health
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
