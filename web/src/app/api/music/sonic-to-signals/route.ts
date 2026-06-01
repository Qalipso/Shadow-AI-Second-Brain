import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// POST /api/music/sonic-to-signals
// Writes the latest sonic reflection's results into the entries table as
// signals, so they flow into Recent Signals and the memory timeline.
// Each pattern and possible meaning becomes its own signal; the classify
// pipeline then tags life area / emotion like any captured fragment.

const PREFIX = "Sonic Mirror";
const MAX_SIGNALS = 8;

export async function POST(request: NextRequest) {
  if (!hasSupabase()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Load latest reflection — the source of the signals.
  const { data: reflection } = await supabase
    .from("sonic_reflections")
    .select("id, title, summary, patterns, possible_meanings")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!reflection) {
    return NextResponse.json(
      { error: "No reflection to save. Generate one first." },
      { status: 404 },
    );
  }

  // Assemble distinct signal texts from the reflection results.
  const patterns = (reflection.patterns as string[] | null) ?? [];
  const meanings = (reflection.possible_meanings as string[] | null) ?? [];
  const summary = (reflection.summary as string | null) ?? null;

  const texts: string[] = [];
  if (summary) {
    const title = (reflection.title as string | null) ?? "Reflection";
    texts.push(`${PREFIX} — ${title}: ${summary}`);
  }
  for (const p of patterns) if (p?.trim()) texts.push(`${PREFIX} pattern: ${p.trim()}`);
  for (const m of meanings) if (m?.trim()) texts.push(`${PREFIX} possible meaning: ${m.trim()}`);

  const finalTexts = texts.slice(0, MAX_SIGNALS);
  if (finalTexts.length === 0) {
    return NextResponse.json({ error: "Reflection has no content to save." }, { status: 400 });
  }

  // Batch insert as unprocessed entries (signals).
  const rows = finalTexts.map((text) => ({
    user_id: user.id,
    raw_text: text,
    status: "unprocessed",
  }));

  const { data: inserted, error } = await supabase
    .from("entries")
    .insert(rows)
    .select("id");

  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save signals." },
      { status: 500 },
    );
  }

  // Fire-and-forget classify so each signal gets tagged (life area, emotion).
  const cookie = request.headers.get("cookie") ?? "";
  for (const row of inserted) {
    const classifyUrl = new URL("/api/classify", request.nextUrl.origin);
    fetch(classifyUrl.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ entry_id: row.id }),
    }).catch(() => {/* non-critical */});
  }

  return NextResponse.json({ saved: inserted.length });
}
