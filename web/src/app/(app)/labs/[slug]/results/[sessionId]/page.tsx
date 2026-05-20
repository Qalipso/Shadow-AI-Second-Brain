import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLabsResult } from "@/lib/labs/queries";
import { getLabsTestBySlug } from "@/lib/labs/queries";
import { ResultsView } from "@/components/labs/ResultsView";

export const dynamic = "force-dynamic";

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ slug: string; sessionId: string }>;
}) {
  const { slug, sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [result, test] = await Promise.all([
    getLabsResult(sessionId),
    getLabsTestBySlug(slug),
  ]);

  if (!result || result.user_id !== user.id) notFound();
  if (!test) notFound();

  return (
    <div className="py-4 anim-fade-in">
      <ResultsView
        result={result}
        testSlug={slug}
        testTitle={test.title}
        testCategory={test.category}
      />
    </div>
  );
}
