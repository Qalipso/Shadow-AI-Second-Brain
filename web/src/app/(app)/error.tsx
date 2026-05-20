"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[shadow:app-error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-sm text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          App error
        </p>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">
          Something broke.
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          {error.message || "An unexpected error occurred in this view."}
        </p>
        {error.digest ? (
          <p className="text-[10px] text-zinc-700">ref: {error.digest}</p>
        ) : null}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={reset}
            className="rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-2 text-sm hover:bg-[var(--bg-elev3)] transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-2 text-sm hover:bg-[var(--bg-elev3)] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
