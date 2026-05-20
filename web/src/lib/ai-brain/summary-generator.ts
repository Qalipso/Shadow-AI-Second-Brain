import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLlm, hasLlm, MODELS } from "@/lib/llm";

export type AISummaryOutput = {
  summary_text: string;
  personality_json: object;
  values_json: object;
  communication_preferences_json: object;
  current_state_json: object;
};

const SYSTEM_PROMPT = `You are Shadow's profile analyst. Shadow is a personal life analytics assistant that helps users understand themselves better.

Generate a JSON profile summarizing what Shadow understands about this user based on their data.

Output ONLY valid JSON with this exact shape:
{
  "summary_text": "2-3 sentence narrative summary of who this person is and where they are right now",
  "core_personality": {
    "traits": ["trait1", "trait2"],
    "working_style": "...",
    "energy_pattern": "..."
  },
  "motivation_drivers": ["driver1", "driver2"],
  "communication_style": {
    "preference": "...",
    "tone": "..."
  },
  "planning_style": "...",
  "risk_zones": ["potential challenge 1", "potential challenge 2"],
  "shadow_interaction_rules": ["how Shadow should interact with this user"],
  "current_state_note": "brief note on their current phase or state",
  "data_sources_used": ["checkins", "goals", "memory", "labs"]
}

Safety rules:
- NO clinical diagnoses or medical language
- NO pathologizing — frame everything as self-observation
- Use first-person plural ("we notice") when referencing patterns
- Keep tone warm, curious, non-judgmental
- Uncertainty is OK: use "seems to", "tends to", "often"`;

type LabsResultRow = {
  scores_json: Record<string, number>;
  interpretation_json: Record<string, unknown>;
  ai_summary_text: string | null;
  labs_tests: { title: string; category: string | null } | null;
};

type CheckinRow = {
  date: string;
  energy: number | null;
  mood: number | null;
  mental_noise: number | null;
  focus: number | null;
  inbox_dump: string | null;
};

type MemoryRow = {
  title: string;
  content: string;
  memory_type: string;
  importance: number;
};

type GoalRow = {
  title: string;
  description: string | null;
  progress: number;
  why: string | null;
};

function buildUserPrompt(
  labsResults: LabsResultRow[],
  checkins: CheckinRow[],
  memoryItems: MemoryRow[],
  goals: GoalRow[],
  currentSummaryText: string | null,
): string {
  const parts: string[] = [];

  if (currentSummaryText) {
    parts.push(`Previous summary:\n${currentSummaryText}`);
  }

  if (goals.length > 0) {
    const goalLines = goals.map((g) => `- ${g.title} (${g.progress}%${g.why ? `, why: ${g.why}` : ""})`);
    parts.push(`Active goals:\n${goalLines.join("\n")}`);
  }

  if (checkins.length > 0) {
    const avgEnergy = checkins
      .filter((c) => c.energy != null)
      .reduce((acc, c) => acc + (c.energy ?? 0), 0) / Math.max(1, checkins.filter((c) => c.energy != null).length);
    const avgMood = checkins
      .filter((c) => c.mood != null)
      .reduce((acc, c) => acc + (c.mood ?? 0), 0) / Math.max(1, checkins.filter((c) => c.mood != null).length);

    parts.push(
      `Recent check-ins (${checkins.length} entries):\n` +
        `Average energy: ${avgEnergy.toFixed(1)}/5, Average mood: ${avgMood.toFixed(1)} (-5 to +5)\n` +
        checkins
          .slice(0, 5)
          .map((c) => `  ${c.date}: energy=${c.energy ?? "?"}, mood=${c.mood ?? "?"}, noise=${c.mental_noise ?? "?"}`)
          .join("\n"),
    );

    const dumpSamples = checkins
      .filter((c) => c.inbox_dump)
      .slice(0, 3)
      .map((c) => `  [${c.date}] ${(c.inbox_dump ?? "").slice(0, 200)}`);
    if (dumpSamples.length > 0) {
      parts.push(`Inbox samples:\n${dumpSamples.join("\n")}`);
    }
  }

  if (memoryItems.length > 0) {
    const memLines = memoryItems.map(
      (m) => `  [${m.memory_type}, importance ${m.importance}] ${m.title}: ${m.content.slice(0, 200)}`,
    );
    parts.push(`Stable memories:\n${memLines.join("\n")}`);
  }

  if (labsResults.length > 0) {
    const labLines = labsResults.map((r) => {
      const test = r.labs_tests;
      return `  ${test?.title ?? "Test"} (${test?.category ?? "general"}): ${r.ai_summary_text ?? JSON.stringify(r.scores_json).slice(0, 200)}`;
    });
    parts.push(`Labs results:\n${labLines.join("\n")}`);
  }

  return parts.join("\n\n") + "\n\nGenerate the profile JSON.";
}

function parseJsonResponse(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function regenerateAISummary(userId: string): Promise<AISummaryOutput> {
  if (!hasSupabase() || !hasLlm()) {
    throw new Error("Missing Supabase or OpenAI configuration.");
  }

  const [labsRes, checkinsRes, memoryRes, goalsRes, currentSummaryRes] = await Promise.all([
    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("labs_results")
          .select("scores_json, interpretation_json, ai_summary_text, labs_tests(title, category)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("daily_checkins")
          .select("date, energy, mood, mental_noise, focus, inbox_dump")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(14),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("memory_items")
          .select("title, content, memory_type, importance")
          .eq("user_id", userId)
          .in("memory_type", ["profile", "behavioral", "insight"])
          .order("importance", { ascending: false })
          .limit(10),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("goals")
          .select("title, description, progress, why")
          .eq("user_id", userId)
          .eq("status", "active"),
      )
      .catch(() => ({ data: [] })),

    createSupabaseServerClient()
      .then((sb) =>
        sb
          .from("profile_ai_summary")
          .select("summary_text")
          .eq("user_id", userId)
          .single(),
      )
      .catch(() => ({ data: null })),
  ]);

  const labsResults = ((labsRes.data ?? []) as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    const rawLabs = row.labs_tests;
    const labsTests = Array.isArray(rawLabs) ? (rawLabs[0] as { title: string; category: string | null } | undefined) ?? null : (rawLabs as { title: string; category: string | null } | null);
    return {
      scores_json: row.scores_json as Record<string, number>,
      interpretation_json: row.interpretation_json as Record<string, unknown>,
      ai_summary_text: (row.ai_summary_text as string | null) ?? null,
      labs_tests: labsTests,
    } satisfies LabsResultRow;
  });
  const checkins = (checkinsRes.data ?? []) as CheckinRow[];
  const memoryItems = (memoryRes.data ?? []) as MemoryRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const currentSummaryText =
    (currentSummaryRes.data as { summary_text?: string | null } | null)?.summary_text ?? null;

  const openai = getLlm();
  const model = MODELS.daily_report;

  const resp = await openai.chat.completions.create({
    model,
    max_tokens: 1200,
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt(labsResults, checkins, memoryItems, goals, currentSummaryText),
      },
    ],
  });

  const raw = resp.choices[0]?.message?.content ?? "{}";
  const parsed = parseJsonResponse(raw);

  if (!parsed) {
    throw new Error("AI summary generation returned non-JSON response.");
  }

  const summaryText = typeof parsed.summary_text === "string" ? parsed.summary_text : "Profile generated.";
  const corePersonality = typeof parsed.core_personality === "object" && parsed.core_personality !== null
    ? parsed.core_personality
    : {};
  const motivationDrivers = Array.isArray(parsed.motivation_drivers) ? parsed.motivation_drivers : [];
  const communicationStyle = typeof parsed.communication_style === "object" && parsed.communication_style !== null
    ? parsed.communication_style
    : {};
  const planningStyle = typeof parsed.planning_style === "string" ? parsed.planning_style : "";
  const riskZones = Array.isArray(parsed.risk_zones) ? parsed.risk_zones : [];
  const shadowRules = Array.isArray(parsed.shadow_interaction_rules) ? parsed.shadow_interaction_rules : [];
  const currentStateNote = typeof parsed.current_state_note === "string" ? parsed.current_state_note : "";
  const dataSources = Array.isArray(parsed.data_sources_used) ? parsed.data_sources_used : [];

  return {
    summary_text: summaryText,
    personality_json: { ...corePersonality, motivation_drivers: motivationDrivers, planning_style: planningStyle, risk_zones: riskZones },
    values_json: { shadow_interaction_rules: shadowRules, data_sources_used: dataSources },
    communication_preferences_json: communicationStyle as object,
    current_state_json: { current_state_note: currentStateNote },
  };
}
