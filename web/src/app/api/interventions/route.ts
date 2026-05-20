import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { listInterventions } from "@/lib/interventions/queries";
import { InterventionType } from "@/lib/interventions/types";

// GET /api/interventions?type=&limit=
export async function GET(request: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ items: [] });

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const url = new URL(request.url);
  const typeRaw = url.searchParams.get("type");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 50);

  const typeParsed = typeRaw ? InterventionType.safeParse(typeRaw) : null;
  const items = await listInterventions(user.id, {
    limit,
    type: typeParsed?.success ? typeParsed.data : undefined,
  });
  return NextResponse.json({ items });
}
