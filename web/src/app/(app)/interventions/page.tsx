import { getCurrentUser } from "@/lib/auth";
import { listInterventions } from "@/lib/interventions/queries";
import { InterventionsHero } from "@/components/interventions/InterventionsHero";
import { StateInputPanel } from "@/components/interventions/StateInputPanel";
import { InterventionGrid } from "@/components/interventions/InterventionGrid";
import { RecentInterventions } from "@/components/interventions/RecentInterventions";

export const dynamic = "force-dynamic";

export default async function InterventionsPage() {
  const user = await getCurrentUser();
  const recent = user ? await listInterventions(user.id, { limit: 6 }) : [];

  return (
    <div className="space-y-6 anim-fade-in">
      <InterventionsHero />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <InterventionGrid />
          <RecentInterventions items={recent} />
        </div>
        <div className="lg:sticky lg:top-6 self-start">
          <StateInputPanel />
        </div>
      </div>
    </div>
  );
}
