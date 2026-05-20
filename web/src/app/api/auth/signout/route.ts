import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";

// POST /api/auth/signout — clears Supabase session cookies and redirects to /login.
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;

  if (hasSupabase()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
