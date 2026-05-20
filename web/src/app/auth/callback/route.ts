import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { safeRedirect } from "@/lib/safe-redirect";

// Handles magic-link / OAuth code exchange.
// Supabase redirects the user here with `?code=...&next=/dashboard`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirect(searchParams.get("next"));

  if (!hasSupabase()) {
    // Dev mode with no Supabase env — just bounce to dashboard.
    return NextResponse.redirect(new URL(next, origin));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", origin),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const target = new URL("/login", origin);
    target.searchParams.set("error", "exchange_failed");
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(new URL(next, origin));
}
