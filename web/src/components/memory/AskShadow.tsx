"use client";

import { useCallback, useState } from "react";

type AnswerResult = {
  answer: string;
  cited_entries: string[];
  confidence: number;
  matched: number;
};

export function AskShadow() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/memory/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      setResult(data as AnswerResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      ask();
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-zinc-600">
        Ask anything about your past captures. Shadow searches your memory.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="What was I anxious about last week?"
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elev1)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)]/40"
          disabled={loading}
        />
        <button
          type="button"
          onClick={ask}
          disabled={!query.trim() || loading}
          className="rounded-lg border border-[var(--accent-warm)]/40 bg-[var(--accent-warm)]/10 px-4 py-2 text-[11px] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20 transition-colors disabled:opacity-40"
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {result && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev2)] px-4 py-3 space-y-2">
          <p className="text-sm text-zinc-200 leading-relaxed">
            {result.answer}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span>
              {result.matched} memor{result.matched === 1 ? "y" : "ies"} searched
            </span>
            {result.confidence > 0 && (
              <span>
                confidence: {(result.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
