"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { loadSettings, CADENCE_MS } from "@/lib/check-in";

type Source = { id: string; snippet: string; created_at: string };
type Msg = {
  role: "you" | "shadow";
  text: string;
  sources?: Source[];
  replyId?: string;
  feedback?: -1 | 1;
};

type OrbState = {
  lastProactiveAt: string | null;
  proactiveCountToday: number;
  proactiveDate: string | null;
  proactiveMuted: boolean;
  sessionHadProactive: boolean;
};

const SEED: Msg[] = [
  {
    role: "shadow",
    text: "I'm Shadow. Drop a thought, a task, a feeling — I'll find how it connects to the rest of your life.",
  },
];

const MAX_HISTORY = 20;
const ORB_STATE_KEY = "shadow:orb:state";
const MAX_PER_DAY = 3;

const PROACTIVE_HINTS = [
  "Your check-in from today is being analyzed. Want to see what Shadow noticed?",
  "There's an observation waiting for you. Open Shadow to see it.",
  "One question Shadow wants to ask you today.",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadOrbState(): OrbState {
  try {
    const raw = localStorage.getItem(ORB_STATE_KEY);
    return raw ? (JSON.parse(raw) as OrbState) : { lastProactiveAt: null, proactiveCountToday: 0, proactiveDate: null, proactiveMuted: false, sessionHadProactive: false };
  } catch {
    return { lastProactiveAt: null, proactiveCountToday: 0, proactiveDate: null, proactiveMuted: false, sessionHadProactive: false };
  }
}

function saveOrbState(s: OrbState) {
  try {
    localStorage.setItem(ORB_STATE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

function shouldShowProactive(state: OrbState): boolean {
  if (state.proactiveMuted) return false;
  if (state.sessionHadProactive) return false;

  // Cadence gate — respect user-configured timing from Settings → Daily ritual.
  const settings = loadSettings();
  const intervalMs = CADENCE_MS[settings.checkinCadence];
  if (!Number.isFinite(intervalMs)) return false; // "off"

  if (state.lastProactiveAt) {
    const elapsed = Date.now() - new Date(state.lastProactiveAt).getTime();
    if (elapsed < intervalMs) return false;
  }

  // Per-day hard cap still applies as a backstop, but only when the
  // cadence itself is at least daily — sub-day cadences should not be
  // capped at MAX_PER_DAY (they would defeat 15m / 1h / 4h timing).
  if (intervalMs >= CADENCE_MS["1x_day"]) {
    const today = todayStr();
    const count = state.proactiveDate === today ? state.proactiveCountToday : 0;
    if (count >= MAX_PER_DAY) return false;
  }
  return true;
}

export type ShadowOrbProps = {
  notificationCount?: number;
};

export function ShadowOrb({ notificationCount = 0 }: ShadowOrbProps) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proactiveHint, setProactiveHint] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const proactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll on new message.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  // Focus input when panel opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // ESC closes panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Proactive hint — only after 30s, max 1/session, 3/day.
  useEffect(() => {
    const state = loadOrbState();
    setMuted(state.proactiveMuted);
    if (!shouldShowProactive(state)) return;

    proactiveTimerRef.current = setTimeout(() => {
      const freshState = loadOrbState();
      if (!shouldShowProactive(freshState)) return;
      const idx = Math.floor(Math.random() * PROACTIVE_HINTS.length);
      setProactiveHint(PROACTIVE_HINTS[idx]);
      // Mark the moment of display so cadence is honoured across reloads,
      // even if the user neither clicks nor dismisses the hint.
      const today = todayStr();
      saveOrbState({
        ...freshState,
        lastProactiveAt: new Date().toISOString(),
        proactiveCountToday:
          freshState.proactiveDate === today
            ? freshState.proactiveCountToday + 1
            : 1,
        proactiveDate: today,
        sessionHadProactive: true,
      });
    }, 30_000);

    return () => {
      if (proactiveTimerRef.current) clearTimeout(proactiveTimerRef.current);
    };
  }, []);

  function dismissProactiveHint() {
    setProactiveHint(null);
    const state = loadOrbState();
    const today = todayStr();
    saveOrbState({
      ...state,
      lastProactiveAt: new Date().toISOString(),
      proactiveCountToday: state.proactiveDate === today ? state.proactiveCountToday + 1 : 1,
      proactiveDate: today,
      sessionHadProactive: true,
    });
  }

  function openFromHint() {
    const text = proactiveHint;
    dismissProactiveHint();
    if (text) {
      // Replace the seed-only state with the hint so the chat panel isn't
      // empty when the user opens from a proactive nudge.
      setMsgs((prev) => {
        const onlySeed = prev.length === 1 && prev[0] === SEED[0];
        return onlySeed
          ? [SEED[0], { role: "shadow", text }]
          : [...prev, { role: "shadow", text }];
      });
    }
    setOpen(true);
  }

  function toggleMute() {
    const state = loadOrbState();
    const next = !state.proactiveMuted;
    saveOrbState({ ...state, proactiveMuted: next });
    setMuted(next);
    setProactiveHint(null);
  }

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft("");
    setError(null);

    const userMsg: Msg = { role: "you", text };
    setMsgs((m) => [...m, userMsg]);
    setLoading(true);

    // Pass PREVIOUS messages only. buildChatMessages appends `message` itself.
    const historyForApi = msgs
      .filter((m) => !(m.role === "shadow" && m === SEED[0]))
      .slice(-MAX_HISTORY);

    try {
      const res = await fetch("/api/shadow/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyForApi }),
      });

      const data = (await res.json()) as {
        reply?: string;
        reply_id?: string;
        sources_count?: number;
        sources?: Source[];
        mode?: string;
        error?: string;
      };

      if (!res.ok || data.error) {
        const errMsg =
          res.status === 429
            ? "Daily cost cap reached. Try again tomorrow."
            : data.error ?? "Something went wrong.";
        setError(errMsg);
        setMsgs((m) => [...m, { role: "shadow", text: errMsg }]);
      } else {
        const reply = data.reply ?? "...";
        const sources = data.sources ?? [];
        setMsgs((m) => [...m, { role: "shadow", text: reply, sources, replyId: data.reply_id }]);
      }
    } catch {
      const errMsg = "Network error. Check your connection.";
      setError(errMsg);
      setMsgs((m) => [...m, { role: "shadow", text: errMsg }]);
    } finally {
      setLoading(false);
    }
  }, [draft, loading, msgs]);

  async function sendFeedback(msgIndex: number, rating: -1 | 1) {
    const msg = msgs[msgIndex];
    if (!msg || msg.role !== "shadow" || msg.feedback) return;
    setMsgs((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, feedback: rating } : m)),
    );
    try {
      await fetch("/api/shadow/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply_id: msg.replyId, rating }),
      });
    } catch {
      // Fire-and-forget — feedback failure is non-critical.
    }
  }

  const totalBadge = notificationCount;

  return (
    <>
      {/* Proactive hint bubble */}
      {proactiveHint && !open && (
        <div
          className="fixed bottom-24 right-6 z-50 max-w-[260px] rounded-xl border border-zinc-800 bg-[var(--bg-elev1)] px-4 py-3 shadow-lg"
          role="status"
        >
          <p className="text-[12px] text-zinc-300 leading-relaxed mb-2">{proactiveHint}</p>
          <div className="flex gap-2">
            <button
              onClick={dismissProactiveHint}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={openFromHint}
              className="ml-auto text-[11px] text-[var(--accent-warm)] hover:opacity-80 transition-opacity"
            >
              Open Shadow
            </button>
          </div>
        </div>
      )}

      {/* Orb button */}
      <button
        aria-label="Open Shadow assistant"
        onClick={() => { setOpen(true); setProactiveHint(null); }}
        className="orb-pulse fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full overflow-hidden hover:scale-110 transition-transform duration-300"
        style={{ boxShadow: "0 0 20px rgba(100,80,180,0.25), 0 0 60px rgba(100,80,180,0.08)" }}
      >
        <Image src="/shadow-orb.png" alt="Shadow" fill className="object-cover" priority />
        {totalBadge > 0 ? (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[var(--accent-warm)] ring-2 ring-black text-[9px] text-black font-bold flex items-center justify-center">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[var(--accent-warm)] ring-2 ring-black" />
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 backdrop-blur-sm"
            style={{ background: "rgba(6,5,14,0.62)" }}
          />
          <div
            role="dialog"
            aria-label="Shadow assistant"
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:max-w-md bg-[var(--bg-elev1)] border-l border-zinc-800 text-zinc-100 flex flex-col"
          >
            <header className="px-6 py-5 border-b border-[var(--border)] flex items-start justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-fraunces)] text-2xl">Shadow</p>
                <p className="text-xs text-zinc-500 mt-1">Your second memory. Online.</p>
              </div>
              <button
                onClick={toggleMute}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors mt-1 flex-shrink-0"
                title={muted ? "Enable proactive nudges" : "Mute proactive nudges"}
              >
                {muted ? "nudges off" : "nudges on"}
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === "you" ? "flex justify-end" : "flex flex-col gap-1.5"}>
                    <div
                      className={
                        m.role === "you"
                          ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-[var(--accent-warm)] text-black px-3 py-2 text-sm whitespace-pre-wrap"
                          : "max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2 text-sm text-zinc-200 whitespace-pre-wrap"
                      }
                    >
                      {m.text}
                    </div>
                    {m.role === "shadow" && m.sources && m.sources.length > 0 ? (
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 px-0.5">
                          memories referenced
                        </p>
                        {m.sources.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-lg border border-zinc-800 bg-[var(--bg-elev2)]/60 px-2.5 py-1.5"
                          >
                            <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                              {s.snippet}
                              {s.snippet.length >= 90 ? "…" : ""}
                            </p>
                            <p className="text-[9px] text-zinc-500 mt-0.5">
                              {new Date(s.created_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {m.role === "shadow" && m !== SEED[0] && (
                      <div className="flex items-center gap-1 max-w-[85%]">
                        <button
                          onClick={() => sendFeedback(i, 1)}
                          aria-label="Helpful"
                          title="Helpful"
                          className={`rounded px-1.5 py-0.5 text-[12px] transition-colors ${
                            m.feedback === 1
                              ? "text-green-400"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => sendFeedback(i, -1)}
                          aria-label="Not helpful"
                          title="Not helpful"
                          className={`rounded px-1.5 py-0.5 text-[12px] transition-colors ${
                            m.feedback === -1
                              ? "text-red-400"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2 text-sm text-zinc-500 italic">
                    thinking…
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="border-t border-[var(--border)] px-6 py-4 flex gap-2"
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write to Shadow…"
                disabled={loading}
                className="flex-1 rounded-md bg-[var(--bg-elev2)] border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-[var(--accent-warm)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !draft.trim()}
                className="rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {loading ? "…" : "Send"}
              </button>
            </form>

            {error && (
              <p className="px-6 pb-3 text-xs text-red-400">{error}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
