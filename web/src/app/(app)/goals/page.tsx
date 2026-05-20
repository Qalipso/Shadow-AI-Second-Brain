import { PageHeader } from "@/components/PageHeader";
import { GoalsView } from "@/components/goals/GoalsView";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Direction"
        title="Goals"
        subtitle="Direction vectors Shadow tracks across your life map."
      />
      <div className="glow-line" />
      <GoalsView />
    </div>
  );
}
