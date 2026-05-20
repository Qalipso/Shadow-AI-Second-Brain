"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithPassword,
  signUpWithPassword,
  sendMagicLink,
  type LoginState,
} from "./actions";

const INITIAL: LoginState = null;

type Mode = "password" | "signup" | "magic";

export function LoginForm({
  redirectTo,
  serverError,
  prefillEmail,
  prefillMode,
}: {
  redirectTo: string;
  serverError?: string;
  prefillEmail?: string;
  prefillMode?: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(prefillMode ?? "password");
  const [pwState, pwAction, pwPending] = useActionState(
    signInWithPassword,
    INITIAL,
  );
  const [suState, suAction, suPending] = useActionState(
    signUpWithPassword,
    INITIAL,
  );
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, INITIAL);

  const current =
    mode === "password" ? pwState : mode === "signup" ? suState : mlState;
  const pending =
    mode === "password" ? pwPending : mode === "signup" ? suPending : mlPending;

  const action =
    mode === "password" ? pwAction : mode === "signup" ? suAction : mlAction;

  // When the action succeeds it returns `{ next: "/..." }`. Navigate client-side
  // (no server-side `redirect()` from inside useActionState → no NEXT_REDIRECT
  // bubbling up as "Unexpected response").
  useEffect(() => {
    if (current?.next) {
      router.replace(current.next);
      router.refresh();
    }
  }, [current, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirect_to" value={redirectTo} />

      <div>
        <label htmlFor="email" className="block text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={prefillEmail ?? ""}
          className="w-full rounded-md bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)]"
          placeholder="you@domain.com"
        />
      </div>

      {mode !== "magic" ? (
        <div>
          <label
            htmlFor="password"
            className="block text-[11px] uppercase tracking-[0.25em] text-zinc-500 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : 6}
            className="w-full rounded-md bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)]"
            placeholder={mode === "signup" ? "≥ 8 characters" : "your password"}
          />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--accent-warm)] text-black px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending
          ? "Working…"
          : mode === "password"
            ? "Sign in"
            : mode === "signup"
              ? "Create account"
              : "Send magic link"}
      </button>

      {(current?.error || serverError) ? (
        <p className="text-xs text-[var(--state-danger)]">
          {current?.error ?? serverError}
        </p>
      ) : null}
      {current?.info ? (
        <p className="text-xs text-[var(--state-success)]">{current.info}</p>
      ) : null}

      <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <button
          type="button"
          className="hover:text-zinc-300"
          onClick={() =>
            setMode(mode === "password" ? "signup" : "password")
          }
        >
          {mode === "password" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        <button
          type="button"
          className="hover:text-zinc-300"
          onClick={() =>
            setMode(mode === "magic" ? "password" : "magic")
          }
        >
          {mode === "magic" ? "Use password" : "Use magic link"}
        </button>
      </div>
    </form>
  );
}
