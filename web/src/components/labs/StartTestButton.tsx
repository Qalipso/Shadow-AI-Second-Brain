"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

type StartTestButtonProps = {
  testSlug: string;
  accent: string;
};

export function StartTestButton({ testSlug, accent }: StartTestButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test_slug: testSlug }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start session.");
      }
      const { session } = await res.json();
      router.push(`/labs/${testSlug}/take?session=${session.id}`);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-[12px] text-[var(--state-danger)] mb-3">{error}</p>}
      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-150 disabled:opacity-50"
        style={{ background: accent, color: "#fff" }}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Starting...</>
        ) : (
          <><Zap size={16} /> Begin Test</>
        )}
      </button>
    </div>
  );
}
