import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getLifeAreas, getEntriesByArea, getLatestScores } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { AreaDetail } from "@/components/areas/AreaDetail";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function AreaDetailPage({ params }: Props) {
  const { slug } = await params;
  const areas = await getLifeAreas();
  const area = areas.find((a) => a.slug === slug);
  if (!area) notFound();

  const user = await getCurrentUser();
  const [entries, scores] = await Promise.all([
    user ? getEntriesByArea(slug, user.id, 50) : Promise.resolve([]),
    user ? getLatestScores(user.id) : Promise.resolve([]),
  ]);

  const areaScore = scores.find((s) => s.life_area_id === area.id) ?? null;
  const color = area.color_hint ?? "#C9A36A";

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Life Circle"
        title={area.name}
        subtitle={area.description ?? `Signals routed to ${area.name}.`}
        right={
          <a
            href="/areas"
            className="text-[11px] text-zinc-500 hover:text-zinc-300"
          >
            ← All areas
          </a>
        }
      />

      <div className="glow-line" />

      {/* Score card */}
      <Card>
        <div className="flex items-center gap-4">
          <span
            className="font-[family-name:var(--font-fraunces)] text-5xl"
            style={{ color: areaScore ? color : "#5E5867" }}
          >
            {areaScore ? areaScore.score.toFixed(1) : "—"}
          </span>
          <div className="space-y-1">
            <p className="text-sm text-zinc-300">
              {areaScore ? scoreLabel(areaScore.score) : "No score yet"}
            </p>
            {areaScore?.confidence != null && (
              <p className="text-[10px] text-zinc-600">
                confidence: {(areaScore.confidence * 100).toFixed(0)}%
                {areaScore.confidence <= 0.4 && " · low signal"}
              </p>
            )}
            {areaScore?.rationale && (
              <p className="text-xs text-zinc-500 mt-1">
                {areaScore.rationale}
              </p>
            )}
            {!areaScore && entries.length > 0 && (
              <p className="text-[10px] text-zinc-600">
                {entries.length} entries linked · awaiting score
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Entries timeline */}
      <AreaDetail entries={entries} color={color} areaName={area.name} />
    </div>
  );
}

function scoreLabel(score: number): string {
  if (score <= 0) return "No data";
  if (score <= 3) return "Low signal";
  if (score <= 6) return "Tracked";
  if (score <= 8) return "Active";
  return "Strong";
}
