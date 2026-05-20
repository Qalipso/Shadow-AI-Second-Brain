"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");
  const router = useRouter();

  function sync() {
    setState("syncing");
    startTransition(async () => {
      await fetch("/api/music/sync", { method: "POST" });
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 2000);
    });
  }

  return (
    <button
      onClick={sync}
      disabled={state === "syncing"}
      className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-opacity"
      style={{
        borderColor: "rgba(255,255,255,0.1)",
        color: state === "done" ? "rgba(113,179,139,0.8)" : "var(--shadow-text-faint)",
        background: "rgba(255,255,255,0.02)",
        opacity: state === "syncing" ? 0.5 : 1,
      }}
    >
      {state === "syncing" ? "syncing…" : state === "done" ? "synced" : "sync now"}
    </button>
  );
}
