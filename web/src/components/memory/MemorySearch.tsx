"use client";

import { useCallback, useState } from "react";
import { Search, ExternalLink } from "lucide-react";

type SearchResult = {
  id: string;
  text: string;
  summary: string | null;
  entry_type: string | null;
  emotion: string | null;
  created_at: string;
  score: number;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ResultCard({
  result,
  onViewEntry,
}: {
  result: SearchResult;
  onViewEntry?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-xl p-4 space-y-2 transition-colors"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-zinc-200 leading-relaxed flex-1">
          {expanded ? result.text : (result.summary ?? result.text.slice(0, 140) + (result.text.length > 140 ? "…" : ""))}
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors pt-0.5"
        >
          {expanded ? "less" : "more"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-mono">
        <span
          className="px-1.5 py-0.5 rounded"
          style={{
            background: "rgba(201,163,106,0.08)",
            color: "var(--accent-warm)",
            border: "1px solid rgba(201,163,106,0.15)",
          }}
        >
          {result.score}% match
        </span>

        {result.entry_type && (
          <span className="text-zinc-600 uppercase tracking-wider">
            {result.entry_type}
          </span>
        )}
        {result.emotion && (
          <span className="text-zinc-600">{result.emotion}</span>
        )}
        <span className="text-zinc-500 ml-auto">{formatDate(result.created_at)}</span>

        {onViewEntry && (
          <button
            onClick={() => onViewEntry(result.id)}
            className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="View original entry"
          >
            <ExternalLink size={10} />
            source
          </button>
        )}
      </div>
    </div>
  );
}

export function MemorySearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/memory/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed, limit: 8 }),
      });
      const data = (await res.json()) as { results?: SearchResult[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        return;
      }
      setResults(data.results ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query, loading]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      search();
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-zinc-600">
        Search your memory by meaning, not exact words. Shadow finds entries related to your query.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="energy, procrastination, money anxiety…"
            className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg pl-8 pr-3 py-2 text-[13px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-[rgba(201,163,106,0.3)] transition-colors"
            aria-label="Search memory"
          />
        </div>
        <button
          onClick={search}
          disabled={!query.trim() || loading}
          className="px-4 py-2 rounded-lg text-[12px] font-mono transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "rgba(201,163,106,0.1)",
            border: "1px solid rgba(201,163,106,0.25)",
            color: "var(--accent-warm)",
          }}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[var(--state-danger)]">{error}</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[100, 85, 70].map((w, i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{
                width: `${w}%`,
                background: "rgba(255,255,255,0.03)",
              }}
            />
          ))}
        </div>
      )}

      {results !== null && !loading && (
        results.length === 0 ? (
          <div className="text-center py-6 space-y-1">
            <p className="text-sm text-zinc-500">No matching memories found.</p>
            <p className="text-[11px] text-zinc-500">
              Try different words, or capture more entries to build your memory.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {results.length} results · ranked by semantic similarity
            </p>
            {results.map((r) => (
              <ResultCard key={r.id} result={r} />
            ))}
          </div>
        )
      )}

      {results === null && !loading && (
        <div className="text-center py-4">
          <p className="text-[11px] text-zinc-500">
            Shadow's memory is empty. Every thought you capture becomes a memory.{" "}
            <a href="/inbox" className="text-zinc-500 hover:text-zinc-300 underline transition-colors">
              Drop one into Inbox →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
