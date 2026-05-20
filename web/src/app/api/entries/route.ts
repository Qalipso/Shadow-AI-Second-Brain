import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  CreateEntryInputSchema,
  InboxEntrySchema,
  ListEntriesQuerySchema,
  type InboxEntry,
} from "@/lib/entries/types";

// Phase 3.1: env-aware entries API.
// - Supabase available + user authed → real DB read/write.
// - Otherwise → returns a synthetic row so the client falls back to localStorage.

type SupabaseEntryRow = {
  id: string;
  raw_text: string;
  status: string;
  created_at: string;
  summary: string | null;
  entry_type: string | null;
  emotion_primary: string | null;
  life_area_id: number | null;
  life_areas: { slug: string } | null;
};

const ENTRY_COLUMNS =
  "id, raw_text, status, created_at, summary, entry_type, emotion_primary, life_area_id, life_areas(slug)";

function toInbox(row: SupabaseEntryRow): InboxEntry {
  return {
    id: row.id,
    text: row.raw_text,
    status: (row.status as InboxEntry["status"]) ?? "unprocessed",
    createdAt: row.created_at,
    summary: row.summary,
    entryType: row.entry_type,
    lifeAreaSlug: row.life_areas?.slug ?? null,
    emotionPrimary: row.emotion_primary,
  };
}

// ─── POST /api/entries ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CreateEntryInputSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  // Dev mode → client owns persistence; just echo a synthetic row.
  if (!hasSupabase()) {
    const entry: InboxEntry = {
      id: `mock-${Date.now().toString(36)}`,
      text: parsed.data.text,
      status: "unprocessed",
      createdAt: new Date().toISOString(),
      summary: null,
      entryType: null,
      lifeAreaSlug: null,
      emotionPrimary: null,
    };
    return NextResponse.json({ entry, mode: "local" }, { status: 201 });
  }

  // Authed DB write.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      raw_text: parsed.data.text,
      status: "unprocessed",
    })
    .select(ENTRY_COLUMNS)
    .single<SupabaseEntryRow>();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed." },
      { status: 500 },
    );
  }

  const validated = InboxEntrySchema.safeParse(toInbox(data));
  if (!validated.success) {
    return NextResponse.json(
      { error: "Inserted row failed validation." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { entry: validated.data, mode: "db" },
    { status: 201 },
  );
}

// ─── GET /api/entries?limit=&offset= ──────────────────────────────────────
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsedQuery = ListEntriesQuerySchema.safeParse({
    limit: sp.get("limit") ?? undefined,
    offset: sp.get("offset") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  if (!hasSupabase()) {
    // Client uses local store; surface empty list with a hint.
    return NextResponse.json({ entries: [], mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limit, offset } = parsedQuery.data;
  const { data, error } = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<SupabaseEntryRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? [])
    .map(toInbox)
    .map((e) => InboxEntrySchema.safeParse(e))
    .filter((p): p is { success: true; data: InboxEntry } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ entries, mode: "db" });
}
