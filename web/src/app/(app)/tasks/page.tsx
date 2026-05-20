import { PageHeader } from "@/components/PageHeader";
import { TasksView } from "@/components/tasks/TasksView";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Direction"
        title="Tasks"
        subtitle="Every open action, in one place."
      />
      <div className="glow-line" />
      <TasksView />
    </div>
  );
}
