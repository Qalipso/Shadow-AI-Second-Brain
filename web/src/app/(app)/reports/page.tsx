import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { getRecentReports, getTodayReport } from "@/lib/data";
import { ReportList } from "@/components/reports/ReportList";
import { GenerateReportButton } from "@/components/reports/GenerateReportButton";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const [todayReport, reports] = await Promise.all([
    user ? getTodayReport(user.id) : Promise.resolve(null),
    user ? getRecentReports(user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow Reports"
        title="Reports"
        subtitle="Shadow-voiced summaries of your days."
        right={<GenerateReportButton hasToday={!!todayReport} />}
      />

      <div className="glow-line" />

      {todayReport ? (
        <Card title={todayReport.headline ?? "Today's report"}>
          <div className="space-y-3">
            <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {todayReport.body}
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>
                confidence: {((todayReport.confidence ?? 0) * 100).toFixed(0)}%
              </span>
              <span>{todayReport.report_date}</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-center py-6">
            <p className="text-zinc-500 text-sm">No report for today yet.</p>
            <p className="text-zinc-600 text-[11px] mt-1">
              Capture entries first, then generate your daily report.
            </p>
          </div>
        </Card>
      )}

      {reports.length > (todayReport ? 1 : 0) && (
        <>
          <div className="glow-line" />
          <ReportList
            reports={reports.filter((r) => r.report_date !== todayReport?.report_date)}
          />
        </>
      )}
    </div>
  );
}
