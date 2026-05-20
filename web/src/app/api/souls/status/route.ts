import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import {
  getOrCreateSoulState,
  checkSoulSilenceReset,
  getSoulCoreStatus,
  getSoulResetDeadline,
  formatTimeUntilReset,
  getSoulEvents,
} from "@/lib/souls/soulCore";

// ─── GET /api/souls/status ───────────────────────────────────────────────────
export async function GET() {
  if (!hasSupabase()) {
    return NextResponse.json({
      state: null,
      status: "empty",
      resetDeadline: null,
      timeUntilReset: "—",
      recentEvents: [],
      mode: "local",
    });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  // Get/create state and run silence check (side effects intentional here)
  const state = await checkSoulSilenceReset(user.id);
  const status = getSoulCoreStatus(state);
  const resetDeadline = getSoulResetDeadline(state);
  const timeUntilReset = formatTimeUntilReset(resetDeadline);
  const recentEvents = await getSoulEvents(user.id, 10);

  return NextResponse.json({
    state,
    status,
    resetDeadline: resetDeadline?.toISOString() ?? null,
    timeUntilReset,
    recentEvents,
  });
}
