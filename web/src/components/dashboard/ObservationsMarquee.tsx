import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { Marquee } from "@/components/fx";

type Row = {
  id: string;
  summary: string | null;
  raw_text: string;
  entry_type: string | null;
  created_at: string;
};

async function fetchRecentObservations(userId: string): Promise<Row[]> {
  if (!hasSupabase()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id, summary, raw_text, entry_type, created_at")
    .eq("user_id", userId)
    .in("entry_type", ["event", "thought", "feeling"])
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[ObservationsMarquee]", error.message);
    return [];
  }
  return (data ?? []) as Row[];
}

function fmt(row: Row): string {
  const t = row.summary?.trim() || row.raw_text.trim();
  return t.length > 110 ? t.slice(0, 108) + "…" : t;
}

// ObservationsMarquee — ambient scrolling strip at the bottom of dashboard.
// Pulls last 10 journal-like entries (events/thoughts/feelings) and quietly
// loops them so the user can sense Shadow's working memory without focusing.
export async function ObservationsMarquee() {
  const user = await getCurrentUser();
  if (!user) return null;
  const items = await fetchRecentObservations(user.id);
  if (items.length === 0) return null;

  return (
    <section className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)] px-1">
        Shadow observations
      </p>
      <Marquee duration={70} pauseOnHover>
        {items.map((r) => (
          <span
            key={r.id}
            className="inline-flex items-center gap-2 rounded-full bg-[rgba(20,20,30,0.55)] px-3 py-1.5 text-xs text-[var(--shadow-text-muted)] whitespace-nowrap"
          >
            <span className="w-1 h-1 rounded-full bg-[var(--shadow-gold)] opacity-70 shrink-0" />
            {fmt(r)}
          </span>
        ))}
      </Marquee>
    </section>
  );
}
