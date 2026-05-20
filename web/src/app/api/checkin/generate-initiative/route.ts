import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLlm, hasLlm, MODELS, estimateCostUsd } from "@/lib/llm";
import { isOverDailyCap, recordLlmCall } from "@/lib/cost-ledger";

// POST /api/checkin/generate-initiative
// Called after check-in save to generate Today Initiative via AI.
// Separate route keeps POST /api/checkin fast.
export async function POST(req: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase env missing." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Read most recent check-in (supports multiple per day)
  let checkinId: string | undefined;
  try {
    const body = await req.json() as { checkin_id?: string };
    checkinId = body.checkin_id;
  } catch { /* body optional */ }

  const today = new Date().toISOString().slice(0, 10);
  let checkinQuery = supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", today)
    .order("created_at", { ascending: false })
    .limit(1);

  if (checkinId) {
    checkinQuery = supabase
      .from("daily_checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", checkinId)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  const { data: rows } = await checkinQuery;
  const checkin = rows?.[0] ?? null;

  if (!checkin) {
    return NextResponse.json({ error: "No check-in found for today." }, { status: 404 });
  }
  if (checkin.ai_processed) {
    return NextResponse.json({ message: "Already processed.", skipped: true });
  }

  // Fetch supporting context
  const [goalsRes, recentCheckinsRes, memoryRes] = await Promise.allSettled([
    supabase.from("goals").select("title, status").eq("user_id", user.id).eq("status", "active").limit(3),
    supabase.from("daily_checkins").select("date, energy, mood, today_focus").eq("user_id", user.id).order("date", { ascending: false }).limit(7),
    supabase.from("memory_items").select("title, content, memory_type").eq("user_id", user.id).in("memory_type", ["profile", "behavioral"]).limit(5),
  ]);

  const goals = goalsRes.status === "fulfilled" ? (goalsRes.value.data ?? []) : [];
  const recentCheckins = recentCheckinsRes.status === "fulfilled" ? (recentCheckinsRes.value.data ?? []) : [];
  const memories = memoryRes.status === "fulfilled" ? (memoryRes.value.data ?? []) : [];

  // Default initiative (no LLM needed for recovery/low-energy states)
  const energyLow = checkin.energy !== null && checkin.energy <= 2;
  const noisyMind = checkin.mental_noise !== null && checkin.mental_noise >= 4;

  if (!hasLlm() || await isOverDailyCap(user.id)) {
    const defaultInitiative = buildDefaultInitiative(energyLow, noisyMind, checkin);
    await saveInitiative(supabase, user.id, checkin.id, defaultInitiative);
    await supabase.from("daily_checkins").update({
      today_initiative_text: defaultInitiative.title,
      today_initiative_json: defaultInitiative,
      ai_processed: true,
      ai_processed_at: new Date().toISOString(),
    }).eq("id", checkin.id);
    return NextResponse.json({ initiative: defaultInitiative });
  }

  // Build prompt
  const systemPrompt = `You are Shadow's initiative generator. Shadow is a personal AI life operating system.
Your task: generate one focused, actionable Today Initiative based on the user's current state and context.

Rules:
- If energy <= 2 or mental_noise >= 4: recommend recovery, minimal action, or reflection
- If energy >= 4 and focus >= 3: recommend a productive action toward active goals
- Otherwise: a gentle nudge or reflection prompt
- Output ONLY valid JSON, no markdown
- Safety: NEVER use clinical language, diagnoses, or medical framing
- Keep it concise, warm, and practical

Output JSON:
{
  "title": "One-line initiative title (max 80 chars)",
  "reason": "1-2 sentences explaining why this matters now",
  "suggested_action": "One concrete, doable action (max 120 chars)",
  "initiative_type": "observation | recovery | productive_nudge | reflection_prompt | goal | habit",
  "priority": 3
}`;

  const userPrompt = buildInitiativePrompt(checkin, goals, recentCheckins, memories);

  const model = MODELS.classify; // gpt-4o-mini is sufficient
  const startedAt = Date.now();
  let tokensIn = 0, tokensOut = 0, costUsd = 0;

  try {
    const openai = getLlm();
    const resp = await openai.chat.completions.create({
      model,
      max_tokens: 400,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    tokensIn = resp.usage?.prompt_tokens ?? 0;
    tokensOut = resp.usage?.completion_tokens ?? 0;
    costUsd = estimateCostUsd(model, tokensIn, tokensOut);

    const rawText = resp.choices[0]?.message?.content ?? "{}";
    const initiative = JSON.parse(rawText);

    await recordLlmCall({ userId: user.id, task: "today_initiative", model, latencyMs: Date.now() - startedAt, tokensIn, tokensOut, costUsd, ok: true });

    await saveInitiative(supabase, user.id, checkin.id, initiative);
    await supabase.from("daily_checkins").update({
      today_initiative_text: initiative.title,
      today_initiative_json: initiative,
      ai_processed: true,
      ai_processed_at: new Date().toISOString(),
    }).eq("id", checkin.id);

    return NextResponse.json({ initiative });
  } catch (err) {
    const msg = (err as Error).message;
    await recordLlmCall({ userId: user.id, task: "today_initiative", model, latencyMs: Date.now() - startedAt, ok: false, error: msg }).catch(() => {});
    const fallback = buildDefaultInitiative(energyLow, noisyMind, checkin);
    return NextResponse.json({ initiative: fallback });
  }
}

function buildDefaultInitiative(energyLow: boolean, noisyMind: boolean, checkin: Record<string, unknown>) {
  if (energyLow) {
    return {
      title: "Protect your energy today",
      reason: "Your energy signals suggest rest matters more than output right now.",
      suggested_action: "Do one small thing, then rest. That's enough.",
      initiative_type: "recovery",
      priority: 2,
    };
  }
  if (noisyMind) {
    return {
      title: "Clear the mental queue",
      reason: "High mental noise often means unprocessed thoughts need space.",
      suggested_action: "Write down the 3 things taking the most mental space.",
      initiative_type: "reflection_prompt",
      priority: 3,
    };
  }
  const focus = checkin.today_focus as string | null;
  if (focus && focus !== "just_survive") {
    return {
      title: `Stay with your focus: ${focus.replace(/_/g, " ")}`,
      reason: "You set an intention today. One step toward it counts.",
      suggested_action: "Pick one action that fits your focus and do only that.",
      initiative_type: "productive_nudge",
      priority: 3,
    };
  }
  return {
    title: "One step forward",
    reason: "Any movement beats standing still.",
    suggested_action: "Identify one small, concrete action to take before the day ends.",
    initiative_type: "productive_nudge",
    priority: 2,
  };
}

function buildInitiativePrompt(
  checkin: Record<string, unknown>,
  goals: Array<Record<string, unknown>>,
  recentCheckins: Array<Record<string, unknown>>,
  memories: Array<Record<string, unknown>>,
): string {
  const state = [
    checkin.energy !== null ? `Energy: ${checkin.energy}/5` : null,
    checkin.mood !== null ? `Mood: ${checkin.mood} (-5 to +5)` : null,
    checkin.mental_noise !== null ? `Mental noise: ${checkin.mental_noise}/5` : null,
    checkin.body_state !== null ? `Body: ${checkin.body_state}/5` : null,
    checkin.focus !== null ? `Focus: ${checkin.focus}/5` : null,
  ].filter(Boolean).join(", ");

  const focusLine = checkin.today_focus ? `Today's focus intent: ${checkin.today_focus}` : "No focus intent set.";
  const inboxLine = checkin.inbox_dump ? `On mind: "${(checkin.inbox_dump as string).slice(0, 200)}"` : "";
  const insightLine = checkin.insight_text ? `Today's insight: "${checkin.insight_text}"` : "";
  const goalsLine = goals.length > 0 ? `Active goals: ${goals.map((g) => g.title).join(", ")}` : "No active goals.";

  const recentPattern = recentCheckins.slice(0, 5).map((c) =>
    `${c.date}: energy=${c.energy ?? "?"}, mood=${c.mood ?? "?"}`,
  ).join(" | ");

  const memoryLine = memories.slice(0, 3).map((m) => `[${m.memory_type}] ${m.title}`).join("; ");

  return [
    `Current state: ${state}`,
    focusLine,
    inboxLine,
    insightLine,
    goalsLine,
    recentCheckins.length > 1 ? `Recent pattern: ${recentPattern}` : "",
    memories.length > 0 ? `What Shadow knows: ${memoryLine}` : "",
    "\nGenerate today's initiative.",
  ].filter(Boolean).join("\n");
}

async function saveInitiative(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  checkinId: string,
  initiative: Record<string, unknown>,
) {
  try {
    await supabase.from("shadow_initiatives").insert({
      user_id: userId,
      title: initiative.title ?? "Today's initiative",
      reason: initiative.reason ?? "",
      suggested_action: initiative.suggested_action ?? null,
      initiative_type: initiative.initiative_type ?? "productive_nudge",
      priority: initiative.priority ?? 3,
      source_checkin_id: checkinId,
      status: "active",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch {
    // best-effort, non-critical
  }
}
