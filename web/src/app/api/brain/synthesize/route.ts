import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { hasLlm } from "@/lib/llm";
import { reserveLlmBudget } from "@/lib/cost-ledger";
import { checkRateLimit, getRouteConfig } from "@/lib/rate-limit";
import { synthesizeMemory } from "@/lib/ai-brain/synthesizer";

// POST /api/brain/synthesize { entry_id? }
//
// Shadow Brain memory synthesizer.
// - With entry_id  → incremental single-entry synthesis (auto-after-capture).
// - Without        → batch rebuild over recent processed entries.

const RequestSchema = z.object({
  entry_id: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }
  if (!hasLlm()) {
    return NextResponse.json({ error: "OPENAI_API_KEY missing." }, { status: 503 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // empty body is valid (batch mode)
  }
  const parsed = RequestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:brain`, getRouteConfig("classify"));
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const budget = await reserveLlmBudget(user.id);
  if (!budget.allowed) {
    return NextResponse.json(
      {
        error: "Daily LLM cost cap reached.",
        spent_usd: Number(budget.spentUsd.toFixed(4)),
        cap_usd: budget.capUsd,
      },
      { status: 429 },
    );
  }

  const result = await synthesizeMemory(user.id, { entryId: parsed.data.entry_id });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }
  return NextResponse.json(result, { status: 200 });
}
