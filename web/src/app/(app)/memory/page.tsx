import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { getUserEntries, getLifeAreas } from "@/lib/data";
import { getMusicProfile } from "@/lib/music/data";
import { AskShadow } from "@/components/memory/AskShadow";
import { MemoryTimeline } from "@/components/memory/MemoryTimeline";
import { MemoryItemsSection } from "@/components/memory/MemoryItemsSection";
import { MusicProfileCard } from "@/components/sonic/MusicProfileCard";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const user = await getCurrentUser();
  const [entries, areas, musicProfile] = await Promise.all([
    user ? getUserEntries(user.id, 100) : Promise.resolve([]),
    getLifeAreas(),
    user ? getMusicProfile(user.id) : Promise.resolve(null),
  ]);

  const areaMap = new Map(areas.map((a) => [a.id, a]));

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Memory"
        title="Memory"
        subtitle="Everything you've captured, searchable by meaning."
        right={
          <span className="text-[11px] text-zinc-500">
            {entries.length} entries
          </span>
        }
      />

      <Card title="Ask Shadow">
        <AskShadow />
      </Card>

      <div className="glow-line" />

      {/* Memory items from check-ins */}
      <MemoryItemsSection />

      <div className="glow-line" />

      {/* Music Profile section */}
      <MusicProfileCard profile={musicProfile} />

      <div className="glow-line" />

      {entries.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm">No memories yet.</p>
            <p className="text-zinc-600 text-[11px] mt-1">
              Capture entries in the Inbox to build your memory.
            </p>
          </div>
        </Card>
      ) : (
        <MemoryTimeline
          entries={entries}
          areaMap={Object.fromEntries(
            [...areaMap.entries()].map(([id, a]) => [id, { name: a.name, slug: a.slug, color: a.color_hint ?? "#C9A36A" }]),
          )}
        />
      )}
    </div>
  );
}
