"use client";

import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";

interface OfflineBannerProps {
  conflictMessage?: string | null;
  onDismissConflict?: () => void;
}

export function OfflineBanner({ conflictMessage, onDismissConflict }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div
          data-testid="offline-banner"
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
        >
          <WifiOff className="h-4 w-4" />
          You&apos;re offline — showing cached data
        </div>
      )}

      {conflictMessage && (
        <div
          data-testid="offline-conflict-banner"
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-between gap-2 bg-orange-500 px-4 py-2 text-sm font-medium text-white"
        >
          <span>{conflictMessage}</span>
          {onDismissConflict && (
            <button
              onClick={onDismissConflict}
              aria-label="Dismiss conflict notification"
              className="rounded p-0.5 hover:bg-orange-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
