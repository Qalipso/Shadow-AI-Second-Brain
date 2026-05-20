import { PageHeader } from "@/components/PageHeader";
import { InboxView } from "@/components/inbox/InboxView";

export default function InboxPage() {
  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Capture"
        title="Inbox"
        subtitle="Drop anything here. Shadow reads it and structures it for you."
      />
      <div className="glow-line" />
      <InboxView />
    </div>
  );
}
