import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getActiveQuestions } from "@/lib/data";
import { TodayQuestions } from "@/components/questions/TodayQuestions";
import { QuestionBank } from "@/components/questions/QuestionBank";
import { DailyCheckIn } from "@/components/dashboard/DailyCheckIn";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await getActiveQuestions();

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Daily ritual · check-in setup"
        title="Questions"
        subtitle="Questions help Shadow understand what you may not know how to say."
        right={
          <span className="text-[11px] text-zinc-500">
            {questions.length} active
          </span>
        }
      />

      {/* Modal lives here so "Start check-in" from TodayQuestions works on this page */}
      <DailyCheckIn questions={questions} autoOpen={false} />

      {questions.length === 0 ? (
        <Card>
          <p className="text-zinc-500">
            Question bank empty — apply seed migration.
          </p>
        </Card>
      ) : (
        <>
          <div className="glow-line" />
          <Card title="Today’s questions">
            <TodayQuestions questions={questions} />
          </Card>

          <Card
            title="Question bank"
            action={
              <span className="text-[11px] text-zinc-500">
                grouped by category
              </span>
            }
          >
            <QuestionBank questions={questions} />
          </Card>

          <Card title="Future settings">
            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-zinc-500">
              <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-2">
                Random 5 per day
              </li>
              <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-2">
                Same core questions daily
              </li>
              <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-2">
                Fixed + random mix
              </li>
            </ul>
            <p className="text-[10px] text-zinc-600 mt-2">
              Coming soon. Persisted in Settings.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
