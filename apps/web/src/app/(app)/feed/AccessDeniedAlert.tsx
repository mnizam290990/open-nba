"use client";

import { useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";
import { useState } from "react";

export function AccessDeniedAlert() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !searchParams.get("accessDenied")) return null;

  return (
    <div
      data-testid="access-denied-banner"
      role="alert"
      className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/30"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
        <ShieldAlert className="h-4 w-4" />
        Access Denied — you don't have permission to view that page.
      </div>
      <button
        data-testid="access-denied-close-btn"
        onClick={() => setDismissed(true)}
        className="text-red-500 hover:text-red-700"
        aria-label="Dismiss access denied alert"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
