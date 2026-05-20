import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { DailyRitualSection } from "@/components/settings/DailyRitualSection";
import { ShadowIntelligenceSection } from "@/components/settings/ShadowIntelligenceSection";
import { ShadowModeSection } from "@/components/settings/ShadowModeSection";
import { ReportsSection } from "@/components/settings/ReportsSection";
import { PrivacyMemorySection } from "@/components/settings/PrivacyMemorySection";
import { InterfaceSection } from "@/components/settings/InterfaceSection";
import { AISummarySection } from "@/components/settings/AISummarySection";
import { GlossarySection } from "@/components/settings/GlossarySection";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Control how Shadow thinks, remembers, and talks to you."
      />

      <div className="glow-line" />

      <Card>
        <ShadowModeSection />
      </Card>

      {/* AI Profile Summary — full width */}
      <Card>
        <AISummarySection />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-stagger">
        <Card>
          <ProfileSection email={user?.email} />
        </Card>
        <Card>
          <DailyRitualSection />
        </Card>
        <Card>
          <ShadowIntelligenceSection />
        </Card>
        <Card>
          <ReportsSection />
        </Card>
        <Card>
          <InterfaceSection />
        </Card>
        <Card>
          <PrivacyMemorySection />
        </Card>
      </div>

      <Card>
        <GlossarySection />
      </Card>
    </div>
  );
}
