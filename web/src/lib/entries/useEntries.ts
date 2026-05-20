"use client";

import { useCallback, useEffect, useState } from "react";
import type { InboxEntry } from "./types";

// Single-source-of-truth client hook for entries.
// - hasSupabase mode → fetch from /api/entries (DB-backed, classified fields).
// - local mode → reads from listLocalEntries.
// - Refreshes on `shadow:entries:changed` window event (Composer/Orb dispatch).

import { listLocalEntries } from "./local";

type Mode = "db" | "local" | "loading";

export function useEntries(limit = 50): {
  entries: InboxEntry[];
  mode: Mode;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const [mode, setMode] = useState<Mode>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/entries?limit=${limit}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        // Not authed → fall back to local store. Common in dev / before sign-in.
        setMode("local");
        setEntries(listLocalEntries(limit));
        return;
      }
      if (!res.ok) {
        setError(`Server returned ${res.status}`);
        setMode("local");
        setEntries(listLocalEntries(limit));
        return;
      }
      const data = (await res.json()) as {
        entries: InboxEntry[];
        mode: "db" | "local";
      };
      if (data.mode === "db") {
        setMode("db");
        setEntries(data.entries);
      } else {
        setMode("local");
        setEntries(listLocalEntries(limit));
      }
    } catch (e) {
      setError((e as Error).message);
      setMode("local");
      setEntries(listLocalEntries(limit));
    }
  }, [limit]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("shadow:entries:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("shadow:entries:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return { entries, mode, error, refresh };
}
