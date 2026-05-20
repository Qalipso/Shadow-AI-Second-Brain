import { PageHeader } from "@/components/PageHeader";
import { getLifeAreas, getLatestScores, getYesterdayScores, getTodayWheelScore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { AreasView } from "@/components/areas/AreasView";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const user = await getCurrentUser();
  const [areas, scores, yesterdayScores, reflection] = await Promise.all([
    getLifeAreas(),
    user ? getLatestScores(user.id) : Promise.resolve([]),
    user ? getYesterdayScores(user.id) : Promise.resolve([]),
    user ? getTodayWheelScore(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Map"
        title="Map"
        subtitle="Your life, scored by area. Each score builds from what you capture and how you check in."
        right={
          <span className="text-[11px] font-mono" style={{ color: "var(--shadow-text-faint)" }}>{areas.length}/12 areas</span>
        }
      />

      {areas.length === 0 ? (
        <EmptyState
          headline="Life areas not loaded."
          sub="Apply seed migration to populate your map."
        />
      ) : (
        <>
          <div className="glow-line" />
          <AreasView areas={areas} scores={scores} yesterdayScores={yesterdayScores} reflection={reflection} />
        </>
      )}
    </div>
  );
}
