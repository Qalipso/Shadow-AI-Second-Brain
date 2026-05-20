import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MusicProfileSchema } from "@/types/music";

// GET /api/music/profile
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({ profile: null, mode: "local" });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data } = await supabase
    .from("music_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "spotify")
    .single();

  if (!data) {
    return NextResponse.json({ profile: null });
  }

  const parsed = MusicProfileSchema.safeParse(data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Profile parse error." }, { status: 500 });
  }

  // Strip tokens before sending to client
  const { access_token: _a, refresh_token: _r, ...safe } = parsed.data;
  return NextResponse.json({ profile: safe });
}
