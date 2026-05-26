import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16 renamed `middleware` → `proxy`. Same semantics: runs at the edge
// for matched requests, can read/write cookies, redirect, or pass through.

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/checkin",
  "/life-circle",
  "/direction",
  "/rituals",
  "/journey",
  "/insights",
  "/labs",
  "/questions",
  "/areas",
  "/reports",
  "/goals",
  "/tasks",
  "/memory",
  "/interventions",
  "/settings",
];

const PUBLIC_AUTH_PATHS = ["/login", "/auth/callback"];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

const DEMO_MODE_COOKIE = "shadow-mode";
const DEMO_MODE_VALUE = "demo";

export async function proxy(request: NextRequest) {
  const isDemo =
    request.cookies.get(DEMO_MODE_COOKIE)?.value === DEMO_MODE_VALUE;

  const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prodKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const demoUrl = process.env.NEXT_PUBLIC_SUPABASE_DEMO_URL;
  const demoKey = process.env.NEXT_PUBLIC_SUPABASE_DEMO_ANON_KEY;

  const url = isDemo && demoUrl ? demoUrl : prodUrl;
  const anonKey = isDemo && demoKey ? demoKey : prodKey;

  // Dev mode: no Supabase → unrestricted access. Pages fall back to seed data.
  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Authed user hitting /login → bounce to /dashboard.
  if (user && pathname === "/login") {
    const target = new URL("/dashboard", request.url);
    return NextResponse.redirect(target);
  }

  // Unauthed user hitting protected route → /login with redirect_to.
  if (!user && isProtected(pathname)) {
    const target = new URL("/login", request.url);
    target.searchParams.set("redirect_to", pathname);
    return NextResponse.redirect(target);
  }

  // Auth paths or anonymous traffic to public routes → pass through.
  if (!user && !isProtected(pathname) && !isAuthPath(pathname)) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    // Match everything except Next internals + static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)",
  ],
};
