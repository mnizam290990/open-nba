"use client";

import { useEffect, useState, useCallback } from "react";
import { replayQueue, type QueuedAction } from "@/lib/offline-queue";

interface UseOfflineQueueOptions {
  onConflict?: (action: QueuedAction, error: unknown) => void;
}

export function useOfflineQueue({ onConflict }: UseOfflineQueueOptions = {}) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const handleConflict = useCallback(
    (action: QueuedAction, error: unknown) => {
      setConflictMessage(
        `A queued action for an HCP was rejected by the server (server state was updated while offline). Server state takes priority.`
      );
      onConflict?.(action, error);
    },
    [onConflict]
  );

  useEffect(() => {
    function onOnline() {
      setIsOnline(true);
      replayQueue(handleConflict).catch(() => {});
    }

    function onOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [handleConflict]);

  return { isOnline, conflictMessage, dismissConflict: () => setConflictMessage(null) };
}
