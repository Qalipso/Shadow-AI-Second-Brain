// Simple sliding-window rate limiter using in-memory Maps.
//
// Works for single-instance deployments. For production scale across
// multiple serverless instances, replace with @upstash/ratelimit:
//
//   import { Ratelimit } from "@upstash/ratelimit";
//   import { Redis } from "@upstash/redis";
//   const ratelimit = new Ratelimit({
//     redis: Redis.fromEnv(),
//     limiter: Ratelimit.slidingWindow(10, "1 m"),
//   });
//   const { success } = await ratelimit.limit(key);
//
// Required env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

type Window = { count: number; resetAt: number };

const store = new Map<string, Window>();

export type RateLimitConfig = {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
};

const DEFAULTS: Record<string, RateLimitConfig> = {
  classify:    { limit: 15, windowSec: 60 },
  chat:        { limit: 10, windowSec: 60 },
  entries:     { limit: 30, windowSec: 60 },
  embed:       { limit: 30, windowSec: 60 },
  export:      { limit: 5,  windowSec: 60 },
  delete:      { limit: 3,  windowSec: 300 },
};

export function getRouteConfig(route: string): RateLimitConfig {
  return DEFAULTS[route] ?? { limit: 20, windowSec: 60 };
}

/**
 * Check rate limit for a given key (e.g. `${userId}:${route}`).
 * Returns { ok: true } or { ok: false, retryAfter: seconds }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { ok: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  if (entry.count >= config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { ok: false, remaining: 0, retryAfter };
  }

  entry.count++;
  return { ok: true, remaining: config.limit - entry.count };
}

// Periodic cleanup to prevent unbounded growth in long-running processes.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of store.entries()) {
      if (now >= w.resetAt) store.delete(key);
    }
  }, 60_000);
}
