import { PageHeader } from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/auth";
import { getLabsTests, getCompletedTestSlugs, getLatestResultForTest } from "@/lib/labs/queries";
import { LabsView } from "@/components/labs/LabsView";

export const dynamic = "force-dynamic";

export default async function LabsPage() {
  const user = await getCurrentUser();

  const [tests, completedSlugs] = await Promise.all([
    getLabsTests(),
    user ? getCompletedTestSlugs(user.id) : Promise.resolve([]),
  ]);

  const completedSet = new Set(completedSlugs);

  // Fetch last session for each completed test
  const testsWithStatus = await Promise.all(
    tests.map(async (t) => {
      const completed = completedSet.has(t.slug);
      const lastResult = completed && user ? await getLatestResultForTest(user.id, t.id) : null;
      return { ...t, completed, lastSession: lastResult ? { completed_at: lastResult.created_at } : null };
    }),
  );

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Self-Knowledge Laboratory"
        title="Labs"
        subtitle="Structured introspection. Shadow learns who you are."
      />
      <div className="glow-line" />
      <LabsView tests={testsWithStatus} />
    </div>
  );
}
