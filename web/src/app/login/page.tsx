import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { hasSupabase } from "@/lib/supabase/env";
import { safeRedirect } from "@/lib/safe-redirect";

// Top-level metadata for /login.
export const metadata = {
  title: "Sign in · Shadow",
  description: "Sign in to Shadow",
};

const ERROR_COPY: Record<string, string> = {
  missing_code: "The magic link did not include a code. Try again.",
  exchange_failed: "Could not exchange this link. It may have expired.",
};

// Sources we accept from inbound traffic (landing, marketing, etc.).
// Anything else is dropped so attackers cannot inject arbitrary copy.
const KNOWN_SOURCES = new Set([
  "landing",
  "landing-modal",
  "landing-waitlist",
  "landing-cta",
]);

const SOURCE_COPY: Record<string, string> = {
  landing: "Welcome from the landing page.",
  "landing-modal": "Welcome from the landing page.",
  "landing-waitlist": "Thanks for joining the waitlist. Sign in to continue.",
  "landing-cta": "Welcome from the landing page.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeEmail(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 320) return undefined;
  if (!EMAIL_RE.test(trimmed)) return undefined;
  return trimmed;
}

function sanitizeSource(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  return KNOWN_SOURCES.has(input) ? input : undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirect_to?: string;
    error?: string;
    email?: string;
    source?: string;
    mode?: string;
  }>;
}) {
  const sp = await searchParams;
  const redirectTo = safeRedirect(sp.redirect_to);
  const serverError = sp.error ? ERROR_COPY[sp.error] ?? sp.error : undefined;
  const envOk = hasSupabase();
  const prefillEmail = sanitizeEmail(sp.email);
  const source = sanitizeSource(sp.source);
  const sourceCopy = source ? SOURCE_COPY[source] : undefined;
  const prefillMode =
    sp.mode === "signup" || sp.mode === "magic" || sp.mode === "password"
      ? sp.mode
      : source === "landing-waitlist"
        ? "magic"
        : undefined;

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12 bg-shadow-glow">
      <div className="w-full max-w-sm">
        <header className="text-center mb-8">
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl">
            Sign in to Shadow
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            Your second memory + life analytics layer.
          </p>
        </header>

        {sourceCopy ? (
          <p
            className="rounded-md border border-[var(--accent-warm)]/30 bg-[var(--accent-warm)]/[0.04] px-3 py-2 text-[11px] text-[var(--accent-warm)] mb-5 text-center"
            role="status"
          >
            {sourceCopy}
          </p>
        ) : null}

        {!envOk ? (
          <div className="rounded-lg border border-[var(--state-warning)]/40 bg-[var(--bg-elev2)] px-4 py-3 mb-6">
            <p className="text-xs text-[var(--state-warning)] font-medium">
              Dev mode — auth disabled
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Supabase env not set. Pages run with seed-fallback data; no login required.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-3 text-[11px] text-[var(--accent-warm)] hover:underline"
            >
              Continue to dashboard →
            </Link>
          </div>
        ) : (
          <LoginForm
            redirectTo={redirectTo}
            serverError={serverError}
            prefillEmail={prefillEmail}
            prefillMode={prefillMode}
          />
        )}

        <p className="text-center text-[10px] uppercase tracking-[0.25em] text-zinc-700 mt-10">
          v0.1 · MVP
        </p>
      </div>
    </main>
  );
}
