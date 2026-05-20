"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { hasToday: boolean };

export function GenerateReportButton({ hasToday }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const generate = useCallback(
    async (force: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/reports/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to generate report.");
          return;
        }
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // Auto-generate on first visit if no today report exists
  useEffect(() => {
    if (!hasToday) generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-[10px] text-red-400 max-w-[200px] truncate">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => generate(hasToday)}
        disabled={loading}
        className="rounded-lg border border-[var(--accent-warm)]/40 bg-[var(--accent-warm)]/10 px-3 py-1.5 text-[11px] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20 transition-colors disabled:opacity-40"
      >
        {loading
          ? "Generating..."
          : hasToday
            ? "Regenerate"
            : "Generate today's report"}
      </button>
    </div>
  );
}
