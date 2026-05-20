"use client";
import { useEffect, useState, useCallback } from "react";
import type { ClientState } from "./types";

const KEY = "shadow.interventions.state";

function readLs(): ClientState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ClientState) : {};
  } catch {
    return {};
  }
}

function writeLs(state: ClientState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("shadow:intervention-state", { detail: state }));
  } catch {
    /* ignore */
  }
}

export function useInterventionState() {
  const [state, setState] = useState<ClientState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readLs());
    setHydrated(true);
    const onUpdate = (e: Event) => {
      const ce = e as CustomEvent<ClientState>;
      if (ce.detail) setState(ce.detail);
    };
    window.addEventListener("shadow:intervention-state", onUpdate);
    return () => window.removeEventListener("shadow:intervention-state", onUpdate);
  }, []);

  const update = useCallback((patch: Partial<ClientState>) => {
    // Compute next via functional update, then dispatch side effect
    // OUTSIDE the updater to keep it pure (avoids cross-component
    // setState-during-render warnings under React 19 / strict mode).
    let computed: ClientState | null = null;
    setState((prev) => {
      computed = { ...prev, ...patch };
      return computed;
    });
    if (computed) writeLs(computed);
  }, []);

  const clear = useCallback(() => {
    setState({});
    writeLs({});
  }, []);

  return { state, hydrated, update, clear };
}
