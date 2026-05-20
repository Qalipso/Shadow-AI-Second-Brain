import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getLlm, hasLlm } from "@/lib/llm";
import { LABEL_META } from "@/types/spotify";
import type { MusicLabel } from "@/types/spotify";

// POST /api/music/sonic-reflection
// Generates a careful, non-diagnostic sonic reflection.
// Input: user's confirmed labels + snapshot context + optional check-in data.
export async function POST() {
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  if (!hasLlm()) return NextResponse.json({ error: "LLM not configured." }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Load labels
  const { data: labelsData } = await supabase
    .from("music_meaning_labels")
    .select("*")
    .eq("user_id", user.id)
    .order("confirmed_at", { ascending: false });

  const labels = labelsData ?? [];
  const labelCount = labels.length;

  // Load latest snapshot
  const { data: snapshot } = await supabase
    .from("music_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Load top artists (short term) for context
  const { data: topArtistsData } = await supabase
    .from("spotify_artist_items")
    .select("name, genres, rank")
    .eq("user_id", user.id)
    .eq("period", "short_term")
    .order("rank", { ascending: true })
    .limit(8);

  // Optional: load recent check-in wheel score
  const { data: wheelScore } = await supabase
    .from("daily_wheel_scores")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // ─── Build prompt context ───────────────────────────────────────────────────

  // Group labels by item
  const labelsByItem = new Map<string, { name: string; type: string; labels: string[]; note?: string }>();
  for (const l of labels) {
    const key = `${l.item_type}:${l.item_id}`;
    const entry = labelsByItem.get(key);
    if (entry) {
      entry.labels.push(l.label);
    } else {
      labelsByItem.set(key, {
        name: l.item_name,
        type: l.item_type,
        labels: [l.label],
        note: l.user_note ?? undefined,
      });
    }
  }

  const labelLines = [...labelsByItem.values()]
    .map((item) => {
      const noteStr = item.note ? ` (note: "${item.note}")` : "";
      return `- ${item.name} [${item.type}]: ${item.labels.join(", ")}${noteStr}`;
    })
    .join("\n");

  // Circumplex analysis of confirmed labels
  const allLabelValues = labels.map((l) => l.label as MusicLabel);
  const valenceScores = allLabelValues.map((l) => {
    const v = LABEL_META[l]?.valence;
    return v === "pleasant" ? 1 : v === "unpleasant" ? -1 : 0;
  });
  const arousalScores = allLabelValues.map((l) => {
    const a = LABEL_META[l]?.arousal;
    return a === "activated" ? 1 : a === "calm" ? -1 : 0;
  });
  const avgValence = valenceScores.length ? (valenceScores as number[]).reduce((a, b) => a + b, 0) / valenceScores.length : 0;
  const avgArousal = arousalScores.length ? (arousalScores as number[]).reduce((a, b) => a + b, 0) / arousalScores.length : 0;
  const valenceTend = avgValence > 0.2 ? "pleasant" : avgValence < -0.2 ? "unpleasant" : "mixed";
  const arousalTend = avgArousal > 0.2 ? "activated" : avgArousal < -0.2 ? "calm" : "mixed";

  const topArtistLines = (topArtistsData ?? [])
    .map((a: { name: string; genres: string[]; rank: number }) =>
      `${a.rank}. ${a.name}${a.genres?.length ? ` (${a.genres.slice(0, 2).join(", ")})` : ""}`,
    )
    .join("\n");

  const dominantGenres = ((snapshot?.dominant_genres as string[]) ?? []).slice(0, 5).join(", ");
  const repeatedTracks = ((snapshot?.repeated_tracks as Array<{ name: string; artist_names: string[]; play_count: number }>) ?? [])
    .slice(0, 3)
    .map((t) => `"${t.name}" by ${t.artist_names[0] ?? "?"} (${t.play_count}x)`)
    .join(", ");
  const shift = (snapshot?.short_vs_long_shift as string) ?? "unknown";

  const checkinLines = wheelScore
    ? `Recent check-in context (self-report):
- Energy: ${wheelScore.energy ?? "—"}/10
- Emotions: ${wheelScore.emotions ?? "—"}/10
- Discipline: ${wheelScore.discipline ?? "—"}/10
- Creativity: ${wheelScore.creativity ?? "—"}/10`
    : "No recent check-in data available.";

  // Confidence: low if no labels, medium if labels confirmed, high if labels + checkin align
  const confidence =
    labelCount === 0 ? "low"
    : wheelScore && labelCount >= 3 ? "high"
    : "medium";

  // ─── System prompt ──────────────────────────────────────────────────────────

  const systemPrompt = `You are Shadow's Sonic Mirror — a careful, non-diagnostic music reflection assistant.

RULES (strictly enforced):
1. Never make hard psychological diagnoses or personality claims
2. Always hedge: "may suggest", "can reflect", "appears alongside", "this pattern", "possible meaning"
3. Never say: "you are depressed", "you are aggressive", "you have trauma", "this proves", "your music shows you are..."
4. Treat user-confirmed labels as their OWN interpretation, not objective truth
5. If no labels are confirmed, be even more cautious — base insights only on patterns, not meanings
6. All psychological frameworks (Circumplex, GEMS, STOMP) are interpretive scaffolding only
7. Always offer the user a chance to confirm or correct the reflection
8. Keep language analytical, calm, and respectful — never clinical or alarming

CIRCUMPLEX MAPPING (from user labels):
Average valence tendency: ${valenceTend} (pleasant/unpleasant)
Average arousal tendency: ${arousalTend} (activated/calm)
This is computed from the user's OWN confirmed labels — use as soft context only.

OUTPUT FORMAT (JSON, no markdown, no code blocks):
{
  "title": "string (2-4 words, evocative not diagnostic)",
  "summary": "string (2-3 sentences, careful hedged language, grounded in confirmed labels)",
  "patterns": ["string", "string", "string"] (3 observations: start with objective fact, then hedged interpretation),
  "possible_meanings": ["string", "string"] (2 possible meanings, clearly stated as possibilities not facts),
  "linked_life_areas": ["string"] (1-4 from: Energy, Emotions, Creativity, Discipline, Relationships, Meaning, Career, Recovery),
  "confidence": "${confidence}",
  "user_question": "string (1 open question for the user to confirm, correct or deepen)"
}`;

  const userPrompt = `User data:

CONFIRMED LABELS (${labelCount} total):
${labelLines || "No labels confirmed yet."}

TOP ARTISTS — last 4 weeks:
${topArtistLines || "No data."}

DOMINANT GENRES: ${dominantGenres || "unknown"}
REPEATED TRACKS: ${repeatedTracks || "none"}
LISTENING SHIFT (short vs long term): ${shift}

${checkinLines}

Generate the reflection now. Return only valid JSON.`;

  let reflectionJson: {
    title: string;
    summary: string;
    patterns: string[];
    possible_meanings: string[];
    linked_life_areas: string[];
    confidence: string;
    user_question: string;
  };

  try {
    const llm = getLlm();
    const completion = await llm.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.65,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    reflectionJson = JSON.parse(raw);
  } catch (e) {
    console.error("[sonic-reflection] LLM:", (e as Error).message);
    return NextResponse.json({ error: "Reflection generation failed." }, { status: 500 });
  }

  // Save to DB
  const { data: saved, error: saveErr } = await supabase
    .from("sonic_reflections")
    .insert({
      user_id: user.id,
      title: reflectionJson.title ?? null,
      summary: reflectionJson.summary ?? null,
      patterns: reflectionJson.patterns ?? [],
      possible_meanings: reflectionJson.possible_meanings ?? [],
      linked_life_areas: reflectionJson.linked_life_areas ?? [],
      confidence: reflectionJson.confidence ?? confidence,
      user_question: reflectionJson.user_question ?? null,
      input_label_count: labelCount,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saveErr) console.error("[sonic-reflection] save:", saveErr.message);

  return NextResponse.json({
    reflection: { ...reflectionJson, id: saved?.id },
  });
}
