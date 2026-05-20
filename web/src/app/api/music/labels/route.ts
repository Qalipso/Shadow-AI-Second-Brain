import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { MUSIC_LABELS, MusicMeaningLabelSchema } from "@/types/spotify";
import type { MusicMeaningLabel } from "@/types/spotify";

const AddLabelSchema = z.object({
  item_type: z.enum(["artist", "track"]),
  item_id: z.string().min(1),
  item_name: z.string().min(1).max(200),
  artist_name: z.string().max(200).optional(),
  label: z.enum(MUSIC_LABELS),
  user_note: z.string().max(500).optional(),
});

const RemoveLabelSchema = z.object({
  item_type: z.enum(["artist", "track"]),
  item_id: z.string().min(1),
  label: z.enum(MUSIC_LABELS),
});

// GET /api/music/labels — fetch user's confirmed labels
export async function GET() {
  if (!hasSupabase()) return NextResponse.json({ labels: [], mode: "local" });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data } = await supabase
    .from("music_meaning_labels")
    .select("*")
    .eq("user_id", user.id)
    .order("confirmed_at", { ascending: false });

  const labels = (data ?? [])
    .map((r: unknown) => MusicMeaningLabelSchema.safeParse(r))
    .filter((p): p is { success: true; data: MusicMeaningLabel } => p.success)
    .map((p) => p.data);

  return NextResponse.json({ labels });
}

// POST /api/music/labels — add a confirmed label
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = AddLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { error } = await supabase
    .from("music_meaning_labels")
    .upsert(
      {
        user_id: user.id,
        ...parsed.data,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,item_type,item_id,label" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}

// DELETE /api/music/labels — remove a label
export async function DELETE(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = RemoveLabelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { error } = await supabase
    .from("music_meaning_labels")
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", parsed.data.item_type)
    .eq("item_id", parsed.data.item_id)
    .eq("label", parsed.data.label);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
