import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { getRecentReports, getTodayReport } from "@/lib/data";
import { getMusicProfile } from "@/lib/music/data";
import { ReportList } from "@/components/reports/ReportList";
import { GenerateReportButton } from "@/components/reports/GenerateReportButton";
import { InsightFeedback } from "@/components/reports/InsightFeedback";
import { SonicMirrorModule } from "@/components/sonic/SonicMirrorModule";
import { BlurFade } from "@/components/fx";
import { WeeklyDigestCard } from "@/components/dashboard/WeeklyDigestCard";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  const [todayReport, reports, musicProfile] = await Promise.all([
    user ? getTodayReport(user.id) : Promise.resolve(null),
    user ? getRecentReports(user.id) : Promise.resolve([]),
    user ? getMusicProfile(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Intelligence"
        title="Insights"
        subtitle="Patterns, weekly summaries and signals surfaced by Shadow."
        right={<GenerateReportButton hasToday={!!todayReport} />}
      />

      <div className="glow-line" />

      {/* Sonic Mirror — main insight module */}
      <BlurFade delay={0.05}>
        <SonicMirrorModule profile={musicProfile} />
      </BlurFade>

      <div className="glow-line" />

      <BlurFade delay={0.12}>
        <WeeklyDigestCard />
      </BlurFade>

      <div className="glow-line" />

      <BlurFade delay={0.15}>
      {todayReport ? (
        <Card title={todayReport.headline ?? "Today's insight"}>
          <div className="space-y-3">
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {todayReport.body}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>confidence: {((todayReport.confidence ?? 0) * 100).toFixed(0)}%</span>
              <span>{todayReport.report_date}</span>
            </div>
            {todayReport.id && (
              <InsightFeedback reportId={todayReport.id} />
            )}
          </div>
        </Card>
      ) : (
        <EmptyState
          headline="No insight for today yet."
          sub="Capture entries first, then generate your daily insight."
          cta={{ label: "Generate insight", href: "#" }}
        />
      )}

      </BlurFade>

      {reports.length > (todayReport ? 1 : 0) && (
        <BlurFade delay={0.25}>
          <div className="glow-line" />
          <ReportList reports={reports.filter((r) => r.report_date !== todayReport?.report_date)} />
        </BlurFade>
      )}
    </div>
  );
}
