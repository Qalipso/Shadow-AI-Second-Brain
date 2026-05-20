"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { createLocalEntry } from "@/lib/entries/local";
import type { InboxEntry } from "@/lib/entries/types";
import { useVoice } from "@/lib/useVoice";
import { useToast } from "@/components/Toast";
import { track, EVENTS } from "@/lib/telemetry";
import {
  ClassificationReveal,
  type RevealPayload,
} from "@/components/inbox/ClassificationReveal";

// Shape of the POST /api/classify success body we consume here.
// Mirrors the route response; minimal fields only.
type ClassifyResponse = {
  classification?: {
    summary?: string | null;
    entry_type?: string | null;
    life_area_slug?: string | null;
    emotion?: { primary: string; intensity: number } | null;
    extracted_task?: { title: string } | null;
  };
};

const PLACEHOLDER =
  "Write anything: a thought, task, fear, expense, food, idea, plan, emotion, or event.";

// Auto-sizes a textarea to fit content up to a max height.
function fitTextarea(el: HTMLTextAreaElement | null, max = 360) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, max)}px`;
}

const AREA_DISPLAY: Record<string, string> = {
  work: "Work", money: "Money", health: "Health", energy: "Energy",
  food: "Food", mind: "Mind", creativity: "Creativity", social: "Social",
  emotion: "Emotion", discipline: "Discipline", environment: "Environment", meaning: "Meaning",
};

export function Composer({
  onCreated,
}: {
  onCreated?: (entry: InboxEntry) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Voice: base text at moment mic was pressed + interim/final appended live.
  const voiceBaseRef = useRef<string>("");

  const { listening, supported, start: startVoice, stop: stopVoice } = useVoice({
    lang: "ru-RU",
    onTranscript: (transcript, isFinal) => {
      const base = voiceBaseRef.current;
      const sep = base.length > 0 && !base.endsWith("\n") ? " " : "";
      setText(base + sep + transcript);
      if (isFinal) {
        voiceBaseRef.current = base + sep + transcript;
      }
    },
    onError: (err) => {
      if (err === "not-allowed") {
        setError("Microphone access denied. Allow mic in browser site settings and try again.");
      } else if (err === "network") {
        setError("Voice recognition requires an internet connection.");
      } else {
        setError(`Voice error: ${err}`);
      }
    },
  });

  function toggleVoice() {
    if (listening) {
      stopVoice();
    } else {
      voiceBaseRef.current = text;
      setError(null);
      startVoice();
    }
  }

  // Prefill from sessionStorage (set by dashboard InboxShortcut).
  useEffect(() => {
    try {
      const seed = sessionStorage.getItem("shadow:inbox:prefill");
      if (seed) {
        setText(seed);
        sessionStorage.removeItem("shadow:inbox:prefill");
        requestAnimationFrame(() => {
          fitTextarea(taRef.current);
          taRef.current?.focus();
          const len = seed.length;
          try {
            taRef.current?.setSelectionRange(len, len);
          } catch {
            // ignore
          }
        });
      } else {
        taRef.current?.focus();
      }
    } catch {
      // sessionStorage disabled — fine.
    }
  }, []);

  // Guided prompts: InboxPrompts dispatches with the chosen question text.
  // Empty detail → focus the empty textarea (custom write mode).
  useEffect(() => {
    function onPrompt(e: Event) {
      const detail = (e as CustomEvent<{ text: string }>).detail;
      const seed = detail?.text ?? "";
      setText(seed ? `${seed}\n\n` : "");
      requestAnimationFrame(() => {
        fitTextarea(taRef.current);
        const ta = taRef.current;
        if (!ta) return;
        ta.focus();
        const len = ta.value.length;
        try {
          ta.setSelectionRange(len, len);
        } catch {
          // ignore
        }
      });
    }
    window.addEventListener("shadow:inbox:prompt", onPrompt);
    return () => window.removeEventListener("shadow:inbox:prompt", onPrompt);
  }, []);

  useEffect(() => {
    fitTextarea(taRef.current);
  }, [text]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    setReveal(null);

    startTransition(async () => {
      track(EVENTS.CAPTURE_SUBMITTED, { length: trimmed.length });
      // Always write locally first for immediate UX continuity.
      const local = createLocalEntry(trimmed);
      onCreated?.(local);
      setText("");

      // Server write. If env empty, API returns 201 with a synthetic id and we
      // keep only the local row. With env present + authed → real DB row.
      let dbEntryId: string | null = null;
      try {
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? `Server returned ${res.status}.`);
          return;
        }
        const data = (await res.json()) as {
          entry?: { id: string };
          mode?: string;
        };
        if (data.mode === "db" && data.entry?.id) {
          dbEntryId = data.entry.id;
        }
      } catch (e) {
        setError((e as Error).message);
        return;
      }

      // Fire-and-forget classification. Phase 3.2 endpoint. Failures are
      // surfaced as inline errors but don't block local persistence.
      if (dbEntryId) {
        try {
          const cls = await fetch("/api/classify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entry_id: dbEntryId }),
          });
          if (!cls.ok) {
            const data = (await cls.json().catch(() => ({}))) as {
              error?: string;
            };
            track(EVENTS.PARSE_FAILED, { status: cls.status });
            setError(
              `Classify ${cls.status}: ${data.error ?? "unknown error"}`,
            );
          } else {
            // Parse classification payload for inline reveal card.
            const data = (await cls.json().catch(() => ({}))) as ClassifyResponse;
            const c = data.classification;
            if (c) {
              setReveal({
                entryId: dbEntryId,
                summary: c.summary ?? null,
                entryType: c.entry_type ?? null,
                lifeAreaSlug: c.life_area_slug ?? null,
                emotion: c.emotion ?? null,
                extractedTask: c.extracted_task ?? null,
              });
              track(EVENTS.PARSE_COMPLETED, {
                entry_type: c.entry_type,
                life_area: c.life_area_slug,
                has_emotion: !!c.emotion,
                has_task: !!c.extracted_task,
              });
              // Show Life Circle update toast when a life area was detected.
              if (c.life_area_slug) {
                track(EVENTS.LIFE_CIRCLE_UPDATED, { area: c.life_area_slug });
                const area = AREA_DISPLAY[c.life_area_slug] ?? c.life_area_slug;
                toast(`${area} map updated`, "info");
              }
            }
            // Trigger any client list reading from local store to re-render.
            window.dispatchEvent(new CustomEvent("shadow:entries:changed"));

            // Fire-and-forget embedding generation (Phase 4.3 RAG memory).
            fetch("/api/embed", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ entry_id: dbEntryId }),
            }).catch(() => {
              // Embedding failures are non-critical, silently ignore.
            });
          }
        } catch (e) {
          setError(`Classify: ${(e as Error).message}`);
        }
      }
    });
  }, [text, pending, onCreated]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Cmd/Ctrl+Enter submits.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const remaining = 8000 - text.length;
  const tooLong = remaining < 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev1)] px-5 py-5 anim-fade-up">
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={PLACEHOLDER}
        rows={4}
        className="w-full resize-none bg-transparent text-base text-zinc-100 placeholder:text-zinc-600 outline-none scroll-thin"
        style={{ minHeight: 160 }}
        aria-label="Capture entry"
      />

      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] text-zinc-500">
          {pending ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)] orb-pulse" />
              Capturing…
            </span>
          ) : listening ? (
            <span className="inline-flex items-center gap-1.5 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 orb-pulse" />
              Listening…
            </span>
          ) : tooLong ? (
            <span className="text-[var(--state-danger)]">
              {Math.abs(remaining)} over limit
            </span>
          ) : (
            <span>
              <kbd className="rounded border border-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">
                ⌘
              </kbd>
              <span className="mx-1 text-zinc-700">+</span>
              <kbd className="rounded border border-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">
                Enter
              </kbd>{" "}
              to send · {remaining} left
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {supported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={listening ? "Stop recording" : "Start voice input"}
              className={`inline-flex items-center justify-center h-9 w-9 rounded-md border transition-colors ${
                listening
                  ? "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
              }`}
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || pending || tooLong}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-warm)] text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} />
            Capture
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-xs text-[var(--state-danger)]">{error}</p>
      ) : null}

      {reveal ? (
        <ClassificationReveal
          payload={reveal}
          onDismiss={() => setReveal(null)}
        />
      ) : null}
    </div>
  );
}
