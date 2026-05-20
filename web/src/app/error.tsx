"use client";

import { useEffect } from "react";

// Per-route boundary. Catches errors inside any segment under app/.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[shadow:route-error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="max-w-md text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          Route error
        </p>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">
          Something broke.
        </h2>
        <p className="text-sm text-zinc-500">
          {error.message || "Unexpected error in this view."}
        </p>
        {error.digest ? (
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            ref: {error.digest}
          </p>
        ) : null}
        <button
          onClick={() => reset()}
          className="rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-2 text-sm hover:bg-[var(--bg-elev3)]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
