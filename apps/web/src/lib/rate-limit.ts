/**
 * Simple in-memory rate limiter suitable for Phase 0 single-instance deployments.
 * For production multi-instance deployments, replace with a Redis/Upstash-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const PRUNE_INTERVAL_MS = 60_000;
let lastPruned = Date.now();

function prune() {
  const now = Date.now();
  if (now - lastPruned < PRUNE_INTERVAL_MS) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
  lastPruned = now;
}

export interface RateLimitOptions {
  /** Unique key identifying the subject (e.g. user ID + route) */
  key: string;
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window length in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit({
  key,
  maxRequests,
  windowSeconds,
}: RateLimitOptions): RateLimitResult {
  prune();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 1, resetAt: now + windowSeconds * 1000 };
    store.set(key, entry);
    return { allowed: true, remaining: maxRequests - 1, resetAt: entry.resetAt };
  }

  entry.count++;
  const allowed = entry.count <= maxRequests;
  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
