"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";

/**
 * Track edits against an original snapshot, expose save lifecycle and an
 * onSave runner. Architecture is ready for autosave (just call markDirty + later
 * runSave from a debounced effect), but no autosave is wired by default.
 */
export function useSaveState<T extends Record<string, unknown>>(
  initial: T,
  onSave: (draft: T) => Promise<T>,
) {
  const [draft, setDraft] = useState<T>(initial);
  const [original, setOriginal] = useState<T>(initial);
  const [state, setState] = useState<SaveState>("clean");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const mounted = useRef(true);

  // Reset only when initial actually changes by value. Callers typically
  // recreate `initial` each render (e.g. `toEditable(goal)`), so referential
  // equality would loop forever — diff by content instead.
  useEffect(() => {
    if (shallowEqual(initial, original)) return;
    setDraft(initial);
    setOriginal(initial);
    setState("clean");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => () => { mounted.current = false; }, []);

  const dirty = !shallowEqual(draft, original);
  useEffect(() => {
    if (state === "saving") return;
    const next: SaveState = dirty ? "dirty" : "clean";
    if (state !== next && state !== "saved" && state !== "error") {
      setState(next);
    } else if (state === "saved" && dirty) {
      setState("dirty");
    }
  }, [dirty, state]);

  const update = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  const patch = useCallback((partial: Partial<T>) => {
    setDraft((d) => ({ ...d, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setDraft(original);
    setError(null);
    setState("clean");
  }, [original]);

  const runSave = useCallback(async () => {
    if (!dirty) return;
    setState("saving");
    setError(null);
    try {
      const next = await onSave(draft);
      if (!mounted.current) return;
      setOriginal(next);
      setDraft(next);
      setState("saved");
      setSavedAt(Date.now());
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "Save failed.");
      setState("error");
    }
  }, [draft, dirty, onSave]);

  return { draft, original, state, dirty, error, savedAt, update, patch, reset, runSave };
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    const av = a[k], bv = b[k];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
    } else if (av !== bv) return false;
  }
  return true;
}
