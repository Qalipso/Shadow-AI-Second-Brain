"use client";

import { useEffect } from "react";

export default function AreasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[shadow:areas-error]", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[40vh] grid place-items-center p-8">
      <div className="max-w-sm text-center space-y-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">Map error</p>
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl">
          Could not load your Map.
        </h2>
        <p className="text-sm text-zinc-500">
          {error.message || "Failed to fetch life areas. Check your connection and retry."}
        </p>
        <button
          onClick={reset}
          className="rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-2 text-sm hover:bg-[var(--bg-elev3)] transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
