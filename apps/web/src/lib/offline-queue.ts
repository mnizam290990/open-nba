"use client";

export type ActionType = "SCHEDULE_VISIT" | "LOG_CALL" | "DISMISS" | "SNOOZE";

export interface QueuedAction {
  id: string;
  hcpId: string;
  actionType: ActionType;
  notes?: string;
  queuedAt: number;
  attempts: number;
}

const DB_NAME = "opennba-offline";
const DB_VERSION = 1;
const STORE_NAME = "action-queue";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueAction(action: Omit<QueuedAction, "id" | "queuedAt" | "attempts">) {
  const db = await openDB();
  const item: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    queuedAt: Date.now(),
    attempts: 0,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return item.id;
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  const items = await new Promise<QueuedAction[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedAction[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeAction(id: string) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function replayQueue(
  onConflict?: (action: QueuedAction, error: unknown) => void
): Promise<{ replayed: number; failed: number }> {
  const actions = await getPendingActions();
  let replayed = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      const res = await fetch("/api/v1/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hcp_id: action.hcpId,
          action_type: action.actionType,
          notes: action.notes,
        }),
      });

      if (res.ok || res.status === 409) {
        await removeAction(action.id);
        replayed++;
      } else if (res.status === 422 || res.status === 400) {
        await removeAction(action.id);
        if (onConflict) onConflict(action, new Error(`Server rejected: ${res.status}`));
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { replayed, failed };
}
