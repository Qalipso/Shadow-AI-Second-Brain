import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLabsTestBySlug, getLabsQuestionsWithOptions, getLabsSession } from "@/lib/labs/queries";
import { TestTaker } from "@/components/labs/TestTaker";

export const dynamic = "force-dynamic";

export default async function TakeTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session: sessionId } = await searchParams;

  if (!sessionId) redirect(`/labs/${slug}`);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const test = await getLabsTestBySlug(slug);
  if (!test) notFound();

  const session = await getLabsSession(sessionId, user.id);
  if (!session || session.status !== "in_progress") {
    redirect(`/labs/${slug}`);
  }

  const questions = await getLabsQuestionsWithOptions(test.id);
  if (questions.length === 0) notFound();

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-8 anim-fade-in">
      {/* Minimal header */}
      <div className="mb-12 text-center">
        <p className="text-[8px] font-mono uppercase tracking-[0.35em] text-zinc-600 mb-2">
          Self-Knowledge Laboratory
        </p>
        <h1
          className="text-[22px] font-[family-name:var(--font-fraunces)] leading-tight"
          style={{
            background: "linear-gradient(135deg, #e8e8f0 0%, rgba(109,123,255,0.8) 140%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {test.title}
        </h1>
      </div>

      <TestTaker
        testSlug={slug}
        testTitle={test.title}
        questions={questions}
        sessionId={sessionId}
        startedAt={session.started_at}
      />
    </div>
  );
}
