import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within limit", () => {
    const key = `test-user-1:route-${Date.now()}`;
    const config = { limit: 5, windowSec: 60 };
    const result = checkRateLimit(key, config);
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks when limit is exceeded", () => {
    const key = `test-user-2:route-${Date.now()}`;
    const config = { limit: 3, windowSec: 60 };
    checkRateLimit(key, config); // 1
    checkRateLimit(key, config); // 2
    checkRateLimit(key, config); // 3
    const result = checkRateLimit(key, config); // 4 — over limit
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("independent keys don't interfere", () => {
    const ts = Date.now();
    const key1 = `user-A:route-${ts}`;
    const key2 = `user-B:route-${ts}`;
    const config = { limit: 2, windowSec: 60 };
    checkRateLimit(key1, config);
    checkRateLimit(key1, config);
    // user-A over limit
    expect(checkRateLimit(key1, config).ok).toBe(false);
    // user-B unaffected
    expect(checkRateLimit(key2, config).ok).toBe(true);
  });

  it("remaining decrements correctly", () => {
    const key = `test-user-3:route-${Date.now()}`;
    const config = { limit: 5, windowSec: 60 };
    const r1 = checkRateLimit(key, config);
    expect(r1.remaining).toBe(4);
    const r2 = checkRateLimit(key, config);
    expect(r2.remaining).toBe(3);
  });
});
