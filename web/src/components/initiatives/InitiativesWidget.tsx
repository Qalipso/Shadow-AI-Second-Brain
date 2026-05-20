"use client";

import { useEffect, useState, useCallback } from "react";
import { Brain } from "lucide-react";
import { InitiativeCard, type Initiative } from "./InitiativeCard";

type ActionType = "accept" | "dismiss" | "snooze";

export function InitiativesWidget() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const fetchInitiatives = useCallback(async () => {
    try {
      const res = await fetch("/api/initiatives?status=active&limit=3", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { initiatives?: Initiative[] };
      setInitiatives(data.initiatives ?? []);
    } catch {
      // silently fall back to empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  const handleAction = useCallback(
    async (id: string, action: ActionType) => {
      if (actingOn) return;
      setActingOn(id);

      const statusMap: Record<ActionType, string> = {
        accept: "accepted",
        dismiss: "dismissed",
        snooze: "snoozed",
      };

      try {
        const res = await fetch(`/api/initiatives/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: statusMap[action] }),
        });
        if (res.ok) {
          await fetchInitiatives();
        }
      } catch {
        // silently ignore, leave state unchanged
      } finally {
        setActingOn(null);
      }
    },
    [actingOn, fetchInitiatives],
  );

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-zinc-600" />
          <h2 className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Shadow&apos;s Observations
          </h2>
        </div>
        <div className="space-y-2">
          <div className="h-20 rounded-xl skeleton" aria-hidden />
          <div className="h-20 rounded-xl skeleton" aria-hidden />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={14} className="text-[var(--accent-warm)]" />
        <h2 className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
          Shadow&apos;s Observations
        </h2>
        {initiatives.length > 0 && (
          <span className="ml-auto text-[10px] text-zinc-600">
            {initiatives.length} active
          </span>
        )}
      </div>

      {initiatives.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-[var(--bg-elev1)] px-4 py-4 text-center">
          <p className="text-xs text-zinc-600 mb-1">No observations yet.</p>
          <p className="text-[10px] text-zinc-700 leading-relaxed">
            Complete a check-in — Shadow generates observations from your state.
          </p>
          <a
            href="/checkin"
            className="inline-block mt-3 text-[10px] px-3 py-1.5 rounded-md border border-[var(--accent-warm)]/30 text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/10"
          >
            Go to Check-in →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {initiatives.map((initiative) => (
            <div
              key={initiative.id}
              className={actingOn === initiative.id ? "opacity-60 pointer-events-none" : undefined}
            >
              <InitiativeCard initiative={initiative} onAction={handleAction} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
