import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NBA Feed",
};

export default function FeedPage() {
  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
      data-testid="feed-page"
    >
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2" data-testid="feed-title">
          NBA Feed
        </h1>
        <p className="text-slate-600 mb-6">
          The MR NBA feed is coming in{" "}
          <strong className="text-brand-700">Phase 2</strong>. The agent pipeline and database
          layer need to be set up first.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg px-5 py-2.5 transition-colors text-sm"
            data-testid="back-to-home"
          >
            ← Back to Home
          </Link>
          <a
            href="/api/v1/health"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg px-5 py-2.5 border border-slate-300 transition-colors text-sm"
            data-testid="check-health"
          >
            Check API Health
          </a>
        </div>
      </div>
    </div>
  );
}
