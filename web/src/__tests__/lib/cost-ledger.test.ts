import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase server client + env detection before importing the ledger.
vi.mock("server-only", () => ({}));
const rpcMock = vi.fn();
// Chainable stub for the todaysCostUsd fallback path (select().gte().eq()…).
function chainable() {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "gte", "eq", "returns"]) {
    q[m] = () => q;
  }
  (q as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    resolve({ data: [], error: null });
  return q;
}
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ rpc: rpcMock, from: () => chainable() }),
}));
vi.mock("@/lib/supabase/env", () => ({
  hasSupabase: () => true,
}));

import { reserveLlmBudget, settleLlmSpend, DEFAULT_RESERVE_USD } from "@/lib/cost-ledger";

describe("reserveLlmBudget (atomic cap, issue #4)", () => {
  beforeEach(() => rpcMock.mockReset());

  it("books the estimate when the RPC allows", async () => {
    rpcMock.mockResolvedValue({ data: [{ allowed: true, spent_usd: 0.35 }], error: null });
    const r = await reserveLlmBudget("user-1");
    expect(rpcMock).toHaveBeenCalledWith("llm_reserve_budget", {
      p_estimate: DEFAULT_RESERVE_USD,
      p_cap: expect.any(Number),
    });
    expect(r.allowed).toBe(true);
    expect(r.spentUsd).toBe(0.35);
    expect(r.reservedUsd).toBe(DEFAULT_RESERVE_USD);
  });

  it("denies with zero reservation when the cap is hit", async () => {
    rpcMock.mockResolvedValue({ data: [{ allowed: false, spent_usd: 1.5 }], error: null });
    const r = await reserveLlmBudget("user-1");
    expect(r.allowed).toBe(false);
    expect(r.reservedUsd).toBe(0);
    expect(r.spentUsd).toBe(1.5);
  });

  it("falls back to the legacy sum-check when the RPC is missing", async () => {
    // First call: reserve RPC fails (migration not applied). The fallback path
    // then reads today's cost via a table select — mock a from() chain.
    rpcMock.mockResolvedValue({ data: null, error: { message: "function llm_reserve_budget does not exist" } });
    const r = await reserveLlmBudget(null);
    // Fallback treats spend 0 (< cap) as allowed with nothing reserved.
    expect(r.allowed).toBe(true);
    expect(r.reservedUsd).toBe(0);
  });

  it("accepts a scalar (non-array) RPC payload", async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, spent_usd: 0.1 }, error: null });
    const r = await reserveLlmBudget("user-1", 0.02);
    expect(r.allowed).toBe(true);
    expect(r.reservedUsd).toBe(0.02);
  });
});

describe("settleLlmSpend", () => {
  beforeEach(() => rpcMock.mockReset());

  it("sends the delta to the settle RPC", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await settleLlmSpend(-0.04);
    expect(rpcMock).toHaveBeenCalledWith("llm_settle_spend", { p_delta: -0.04 });
  });

  it("is a no-op for a zero delta", async () => {
    await settleLlmSpend(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
