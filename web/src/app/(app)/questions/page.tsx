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

        </>
      )}
    </div>
  );
}
