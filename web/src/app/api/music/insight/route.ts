import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MusicProfileSchema } from "@/types/music";
import { SOUND_STATE_META, SONIC_ARCHETYPE_META } from "@/types/music";
import { getLlm } from "@/lib/llm";

// POST /api/music/insight — generate AI Sonic Insight
export async function POST() {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profileRow } = await supabase
    .from("music_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "spotify")
    .single();

  if (!profileRow) {
    return NextResponse.json({ error: "No music profile found." }, { status: 404 });
  }

  const parsed = MusicProfileSchema.safeParse(profileRow);
  if (!parsed.success) {
    return NextResponse.json({ error: "Profile parse error." }, { status: 500 });
  }

  const profile = parsed.data;
  const archetype = profile.sonic_archetype;
  const soundState = profile.current_sound_state;
  const archetypeMeta = archetype ? SONIC_ARCHETYPE_META[archetype] : null;
  const stateMeta = soundState ? SOUND_STATE_META[soundState] : null;

  const topGenres = profile.dominant_genres.slice(0, 5).join(", ");
  const topArtists = profile.top_artists_short
    .slice(0, 5)
    .map((a) => a.name)
    .join(", ");

  const prompt = `You are Shadow's Sonic Mirror — a psychological music analyst.
Analyze this user's listening data and generate a single, carefully worded personal insight.

Data:
- Current Sound State: ${stateMeta?.label ?? "Unknown"} (${stateMeta?.description ?? ""})
- Sonic Archetype: ${archetypeMeta?.label ?? "Unknown"} (${archetypeMeta?.description ?? ""})
- Top Genres: ${topGenres || "unknown"}
- Top Artists (recent): ${topArtists || "unknown"}
- Repeat Score: ${profile.repeat_score}/100 (how much they replay same tracks)
- Exploration Score: ${profile.exploration_score}/100 (genre diversity)
- Intensity Score: ${profile.intensity_score}/100
- Nostalgia Score: ${profile.nostalgia_score}/100

Rules:
- Be precise, careful, non-diagnostic
- Max 2 sentences
- Connect to inner state, not just music facts
- Never say "you are depressed" or make clinical diagnoses
- Tone: thoughtful, slightly poetic, grounded
- Do not mention Spotify, AI, or yourself

Good example: "Your listening pattern became more repetitive and inward this week. This may reflect a need for stability, emotional processing, or focused isolation."

Write one insight:`;

  let insight = "";
  try {
    const llm = getLlm();
    const completion = await llm.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.7,
    });
    insight = completion.choices[0]?.message?.content?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "LLM generation failed." }, { status: 500 });
  }

  // Save insight to DB
  await supabase.from("music_insights").insert({
    user_id: user.id,
    period: "weekly",
    title: "Sonic Insight",
    description: insight,
    confidence: 0.75,
    created_at: new Date().toISOString(),
  });

  // Update profile ai_summary
  await supabase
    .from("music_profiles")
    .update({ ai_summary: insight })
    .eq("user_id", user.id)
    .eq("provider", "spotify");

  return NextResponse.json({ insight });
}
