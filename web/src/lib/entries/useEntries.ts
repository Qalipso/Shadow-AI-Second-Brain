"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { z } from "zod";
import { InboxEntrySchema, type InboxEntry } from "./types";

// Single-source-of-truth client hook for entries — now SWR-backed (issue #11).
// - hasSupabase mode → fetch from /api/entries (DB-backed, classified fields).
// - local mode → reads from listLocalEntries.
// - Refreshes on `shadow:entries:changed` window event (Composer/Orb dispatch).
//
// Multiple consumers calling the same limit (e.g. the four `useEntries(200)`
// callers) now share one cached fetch instead of each firing its own request —
// this was the concrete duplicate-fetch case that motivated adopting SWR.

import { listLocalEntries } from "./local";

type Mode = "db" | "local" | "loading";

const ResponseSchema = z.object({
  entries: z.array(InboxEntrySchema),
  mode: z.enum(["db", "local"]),
});

async function fetcher(limit: number): Promise<{ entries: InboxEntry[]; mode: "db" | "local" }> {
  const res = await fetch(`/api/entries?limit=${limit}`, { cache: "no-store" });
  if (res.status === 401) {
    // Not authed → fall back to local store. Common in dev / before sign-in.
    return { entries: listLocalEntries(limit), mode: "local" };
  }
  if (!res.ok) {
    throw new Error(`Server returned ${res.status}`);
  }
  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success || parsed.data.mode !== "db") {
    return { entries: listLocalEntries(limit), mode: "local" };
  }
  return { entries: parsed.data.entries, mode: "db" };
}

export function useEntries(limit = 50): {
  entries: InboxEntry[];
  mode: Mode;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { data, error, isLoading, mutate } = useSWR(["/api/entries", limit], ([, l]) => fetcher(l));

  useEffect(() => {
    const onChange = () => mutate();
    window.addEventListener("shadow:entries:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("shadow:entries:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [mutate]);

  const refresh = async () => {
    await mutate();
  };

  if (error) {
    return { entries: listLocalEntries(limit), mode: "local", error: (error as Error).message, refresh };
  }

  return {
    entries: data?.entries ?? [],
    mode: isLoading ? "loading" : (data?.mode ?? "local"),
    error: null,
    refresh,
  };
}
