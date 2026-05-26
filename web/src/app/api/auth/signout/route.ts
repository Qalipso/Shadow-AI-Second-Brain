import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase, DEMO_MODE_COOKIE } from "@/lib/supabase/env";

// POST /api/auth/signout — clears Supabase session cookies and redirects to /login.
export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;

  if (hasSupabase()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_MODE_COOKIE);

  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
