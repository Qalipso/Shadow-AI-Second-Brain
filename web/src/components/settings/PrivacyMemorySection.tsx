"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DangerButton, FieldRow, SectionGroup, Toggle } from "./Rows";

export function PrivacyMemorySection() {
  const router = useRouter();
  const [privateMode, setPrivateMode] = useState(false);
  const [deleteStage, setDeleteStage] = useState<"idle" | "confirm" | "deleting">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleteStage("deleting");
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Deletion failed.");
      }
      router.push("/login");
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleteStage("idle");
    }
  }

  return (
    <SectionGroup
      title="Privacy & memory"
      description="You control what Shadow remembers and what gets erased."
    >
      {/* AI consent notice */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3.5 py-3 text-[11px] text-zinc-500 leading-relaxed">
        <span className="text-zinc-400 font-medium">How your data is used by AI: </span>
        Your entries are sent to OpenAI for classification and embedding. No human at OpenAI or Shadow reads them. Embeddings are stored in your Supabase database and never shared.
      </div>

      <FieldRow
        label="Private mode"
        hint="When enabled, Shadow can respond but will not save new long-term memory."
      >
        <Toggle checked={privateMode} onChange={setPrivateMode} />
      </FieldRow>

      <FieldRow
        label="Export my data"
        hint="Download all your entries, check-ins, tasks, and scores as JSON."
      >
        <a
          href="/api/account/export"
          download
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 transition-colors"
        >
          Download
        </a>
      </FieldRow>

      <FieldRow
        label="Clear recent signals"
        hint="Delete today's captured signals."
        comingSoon
      >
        <DangerButton>Clear</DangerButton>
      </FieldRow>

      <FieldRow
        label="Reset Map scores"
        hint="Clear all life area scores and recalibrate from scratch."
        comingSoon
      >
        <DangerButton>Reset</DangerButton>
      </FieldRow>

      {/* Danger zone */}
      <div className="rounded-md border border-[var(--state-danger)]/20 bg-[var(--state-danger)]/5 px-4 py-3 space-y-2">
        <p className="text-sm text-[var(--state-danger)]">Danger zone</p>
        <p className="text-[11px] text-zinc-500">
          Delete your account and all data. This cannot be undone.
        </p>

        {deleteStage === "idle" && (
          <button
            type="button"
            onClick={() => setDeleteStage("confirm")}
            className="rounded-md border border-[var(--state-danger)]/40 text-[var(--state-danger)] px-2.5 py-1 text-[11px] hover:bg-[var(--state-danger)]/10"
          >
            Delete account
          </button>
        )}

        {deleteStage === "confirm" && (
          <div className="space-y-2">
            <p className="text-[11px] text-amber-400">
              This will permanently delete all your entries, memory, and check-ins. Are you sure?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="rounded-md bg-[var(--state-danger)] text-white px-3 py-1 text-[11px] font-medium hover:opacity-90"
              >
                Yes, delete everything
              </button>
              <button
                type="button"
                onClick={() => setDeleteStage("idle")}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {deleteStage === "deleting" && (
          <p className="text-[11px] text-zinc-500 italic">Deleting your data…</p>
        )}

        {deleteError && (
          <p className="text-[11px] text-red-400">{deleteError}</p>
        )}
      </div>
    </SectionGroup>
  );
}
