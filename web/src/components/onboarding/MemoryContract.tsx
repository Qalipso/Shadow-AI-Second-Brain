"use client";

import { useEffect, useState } from "react";
import { Shield, Database, Eye, Trash2 } from "lucide-react";

const STORAGE_KEY = "shadow:terms_version";
const CURRENT_VERSION = "2026-05-20";

type ContractItem = {
  icon: React.ReactNode;
  label: string;
  detail: string;
};

const ITEMS: ContractItem[] = [
  {
    icon: <Eye size={14} />,
    label: "Sent to OpenAI",
    detail:
      "Raw text of your captures — for classification and embedding. Not linked to your identity on OpenAI's side.",
  },
  {
    icon: <Database size={14} />,
    label: "Stored in Supabase",
    detail:
      "Entries, structured signals, life area scores, embeddings, and generated insights.",
  },
  {
    icon: <Shield size={14} />,
    label: "Private Mode",
    detail:
      "Entries you mark private are never sent to OpenAI. Stored but excluded from all AI analysis.",
  },
  {
    icon: <Trash2 size={14} />,
    label: "Your controls",
    detail:
      "Export all data as JSON. Delete any entry or your entire account — permanently.",
  },
];

export function MemoryContract() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== CURRENT_VERSION) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — skip silently
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" aria-hidden />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-contract-title"
        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 anim-fade-up"
          style={{
            background: "var(--bg-elev2, #18181b)",
            boxShadow: "0 0 64px rgba(0,0,0,0.8), 0 24px 48px rgba(0,0,0,0.6)",
          }}
        >
          <div className="px-6 pt-6 pb-5">
            {/* Header */}
            <div
              className="mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em]"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "var(--accent-warm, #c9a36a)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Shield size={10} />
              Memory Contract
            </div>

            <h2
              id="memory-contract-title"
              className="font-[family-name:var(--font-fraunces)] text-xl text-zinc-100 mt-3 mb-1 leading-snug"
            >
              Your inner life is not content.
            </h2>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              Before Shadow starts learning you, here&apos;s exactly what happens to your data.
            </p>

            {/* Contract items */}
            <ul className="space-y-3 mb-6">
              {ITEMS.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span
                    className="mt-0.5 flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--accent-warm, #c9a36a)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-zinc-300 mb-0.5">{item.label}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <p className="text-[11px] text-zinc-600 mb-4">
              Full details in{" "}
              <a
                href="https://github.com/Qalipso/Shadow-AI-Second-Brain/blob/main/PRIVACY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-zinc-400 transition-colors"
              >
                PRIVACY.md
              </a>
              . You can export or delete your data at any time in Settings.
            </p>

            <button
              onClick={accept}
              className="w-full rounded-xl py-3 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--accent-warm, #c9a36a)",
                color: "#0a0a0c",
              }}
            >
              I understand — let&apos;s begin
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
