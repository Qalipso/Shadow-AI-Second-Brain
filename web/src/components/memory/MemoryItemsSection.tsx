import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { BlurFade } from "@/components/fx";

type MemoryItem = {
  id: string;
  content: string;
  memory_type: string;
  importance: number | null;
  stability: string | null;
  source_type: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  insight:       "Insight",
  current_state: "State Snapshot",
  profile:       "Profile",
  episodic:      "Episode",
  behavioral:    "Behavior",
  goal:          "Goal",
  preference:    "Preference",
  relationship:  "Relationship",
};

const TYPE_COLOR: Record<string, string> = {
  insight:       "var(--accent-warm)",
  current_state: "rgba(126,87,194,0.85)",
  profile:       "rgba(100,180,140,0.85)",
  episodic:      "rgba(90,160,210,0.85)",
  behavioral:    "rgba(210,140,90,0.85)",
  goal:          "rgba(180,100,180,0.85)",
  preference:    "rgba(100,200,200,0.85)",
  relationship:  "rgba(200,100,120,0.85)",
};

async function fetchMemoryItems(userId: string): Promise<MemoryItem[]> {
  if (!hasSupabase()) return [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("memory_items")
      .select("id, content, memory_type, importance, stability, source_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return (data as MemoryItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function MemoryItemsSection() {
  const user = await getCurrentUser();
  if (!user) return null;

  const items = await fetchMemoryItems(user.id);

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Shadow Memory Items</p>
        <div className="rounded-xl border border-zinc-800 bg-[rgba(20,20,27,0.6)] px-5 py-6 text-center">
          <p className="text-sm text-zinc-500">No memory items yet.</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            Complete check-ins to start building Shadow&apos;s memory of you.
          </p>
        </div>
      </section>
    );
  }

  // Group by memory_type
  const grouped = items.reduce<Record<string, MemoryItem[]>>((acc, item) => {
    const t = item.memory_type ?? "insight";
    if (!acc[t]) acc[t] = [];
    acc[t].push(item);
    return acc;
  }, {});

  const typeOrder = ["current_state", "insight", "profile", "episodic", "behavioral", "goal", "preference", "relationship"];
  const sortedTypes = typeOrder.filter((t) => grouped[t]).concat(Object.keys(grouped).filter((t) => !typeOrder.includes(t)));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Shadow Memory Items</p>
        <span className="text-[10px] text-zinc-600">{items.length} items</span>
      </div>

      <div className="space-y-4">
        {sortedTypes.map((type, gIdx) => (
          <BlurFade key={type} delay={Math.min(gIdx * 0.08, 0.45)} y={8} className="space-y-2">
            <p
              className="text-[10px] uppercase tracking-[0.2em] font-mono"
              style={{ color: TYPE_COLOR[type] ?? "var(--accent-warm)" }}
            >
              {TYPE_LABEL[type] ?? type}
              <span className="text-zinc-600 ml-2 normal-case tracking-normal font-sans">
                · {grouped[type].length}
              </span>
            </p>
            {grouped[type].map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
              >
                <p className="text-sm text-zinc-300 leading-relaxed">{item.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  {item.importance !== null && (
                    <span className="text-[10px] text-zinc-600">
                      importance {item.importance}/5
                    </span>
                  )}
                  {item.stability && (
                    <span className="text-[10px] text-zinc-600">{item.stability}</span>
                  )}
                  {item.source_type && (
                    <span className="text-[10px] text-zinc-600">from {item.source_type}</span>
                  )}
                  <span className="text-[10px] text-zinc-700 ml-auto">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </BlurFade>
        ))}
      </div>
    </section>
  );
}
