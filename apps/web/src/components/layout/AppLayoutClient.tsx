"use client";

import { OfflineBanner } from "./OfflineBanner";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { conflictMessage, dismissConflict } = useOfflineQueue();

  return (
    <>
      <OfflineBanner conflictMessage={conflictMessage} onDismissConflict={dismissConflict} />
      {children}
    </>
  );
}
