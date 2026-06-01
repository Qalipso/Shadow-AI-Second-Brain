export const maxDuration = 30;

import { getCurrentUser } from "@/lib/auth";
import { listInterventions } from "@/lib/interventions/queries";
import { PageHeader } from "@/components/PageHeader";
import { InterventionGrid } from "@/components/interventions/InterventionGrid";
import { InterventionGallery } from "@/components/interventions/InterventionGallery";

export const dynamic = "force-dynamic";

export default async function InterventionsPage() {
  const user = await getCurrentUser();
  const items = user ? await listInterventions(user.id, { limit: 30 }) : [];

  return (
    <div className="space-y-8 anim-fade-in">
      <PageHeader eyebrow="Cognitive reset" title="Interventions" />

      {/* Create: full proposal cards, primary entry point */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
          Start a new intervention
        </p>
        <p className="text-sm text-[var(--shadow-text-muted)] leading-relaxed max-w-xl">
          Small, intelligent rituals. Each gives you a single first move when you
          feel stuck, overwhelmed, bored, or unable to switch context.
        </p>
        <InterventionGrid />
      </section>

      {/* Existing interventions — shifted below the create cards */}
      {items.length > 0 && (
        <section className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
            Your interventions
          </p>
          <InterventionGallery items={items} />
        </section>
      )}
    </div>
  );
}
