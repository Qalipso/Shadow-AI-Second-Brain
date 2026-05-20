import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getSoulEvents } from "@/lib/souls/soulCore";

// ─── GET /api/souls/events?limit=N ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ events: [], mode: "local" });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20;

  const events = await getSoulEvents(user.id, limit);
  return NextResponse.json({ events });
}
