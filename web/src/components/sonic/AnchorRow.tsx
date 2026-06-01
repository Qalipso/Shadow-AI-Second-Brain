"use client";

import { useState, useTransition } from "react";
import { BookOpen, Search, Check } from "lucide-react";

export interface AnchorTrack {
  id: string;
  name: string;
  artist: string;
  imageUrl?: string;
  playCount: number;
}

// Anchor type + a hedged "why it may matter" note, by repeat intensity.
function anchorType(playCount: number): { label: string; note: string; color: string } {
  if (playCount >= 5) {
    return { label: "Heavy rotation", note: "A track you keep returning to — often tied to a state you're regulating.", color: "rgba(172,82,101,0.8)" };
  }
  if (playCount >= 3) {
    return { label: "On repeat", note: "Repeated enough to suggest it's holding a mood or memory.", color: "rgba(224,178,92,0.8)" };
  }
  return { label: "Returning", note: "Coming back to this — may mark something unfinished.", color: "rgba(126,87,194,0.8)" };
}

function spotifySearchUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function AnchorRow({ track }: { track: AnchorTrack }) {
  const type = anchorType(track.playCount);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function addToJournal() {
    setError(false);
    startTransition(async () => {
      try {
        const text = `Anchor track: "${track.name}" by ${track.artist} — I keep returning to it (${track.playCount}x). ${type.note}`;
        const res = await fetch("/api/entries", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) {
          setError(true);
          return;
        }
        setSaved(true);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div
      className="rounded-lg p-3"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center gap-3">
        {track.imageUrl ? (
          <img
            src={track.imageUrl}
            alt={track.name}
            width={36}
            height={36}
            className="rounded flex-shrink-0 object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          />
        ) : (
          <div className="w-9 h-9 rounded flex-shrink-0" style={{ background: "rgba(126,87,194,0.12)" }} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[12px] truncate" style={{ color: "var(--shadow-text)" }}>
            {track.name}
          </p>
          <p className="text-[10px] truncate" style={{ color: "var(--shadow-text-faint)" }}>
            {track.artist}
          </p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0 gap-1">
          <span className="text-[10px] font-mono" style={{ color: "rgba(214,184,116,0.6)" }}>
            {track.playCount}×
          </span>
          <span
            className="text-[9px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
            style={{ color: type.color, background: type.color.replace(/[\d.]+\)$/, "0.12)") }}
          >
            {type.label}
          </span>
        </div>
      </div>

      <p className="text-[10px] leading-relaxed mt-2" style={{ color: "var(--shadow-text-faint)" }}>
        {type.note}
      </p>

      <div className="flex flex-wrap items-center gap-2 mt-2.5">
        <button
          onClick={addToJournal}
          disabled={isPending || saved}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all disabled:opacity-60"
          style={{
            background: "rgba(126,87,194,0.10)",
            border: "1px solid rgba(126,87,194,0.22)",
            color: "rgba(126,87,194,0.9)",
          }}
        >
          {saved ? <Check size={12} /> : <BookOpen size={12} />}
          {saved ? "In journal" : isPending ? "Saving…" : "Add to Journal"}
        </button>
        <a
          href={spotifySearchUrl(`${track.artist} ${track.name}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all"
          style={{
            background: "rgba(113,179,139,0.10)",
            border: "1px solid rgba(113,179,139,0.22)",
            color: "rgba(113,179,139,0.9)",
          }}
        >
          <Search size={12} />
          Find similar mood
        </a>
        {error && (
          <span className="text-[10px]" style={{ color: "rgba(172,82,101,0.9)" }}>
            Save failed
          </span>
        )}
      </div>
    </div>
  );
}
