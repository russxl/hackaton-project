import { getChatLimitPerMinute } from "./auth/config";

/**
 * Fixed-window, in-memory rate limiter keyed by principal.
 *
 * This is per-instance state — adequate for a single demo server / one
 * serverless container. For multi-instance production, swap `buckets` for
 * Upstash KV / Redis (`@upstash/ratelimit`) without changing call sites.
 */

type Bucket = { count: number; windowStart: number };

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so memory doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (now - b.windowStart > WINDOW_MS) buckets.delete(key);
    }
  }, WINDOW_MS).unref?.();
}

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
};

export function rateLimit(key: string): RateLimitResult {
  const limit = getChatLimitPerMinute();
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    buckets.set(key, bucket);
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: bucket.windowStart + WINDOW_MS,
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.windowStart + WINDOW_MS,
  };
}
