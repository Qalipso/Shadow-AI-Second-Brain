import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listInterventions } from "@/lib/interventions/queries";
import { PageHeader } from "@/components/PageHeader";
import { InterventionGrid } from "@/components/interventions/InterventionGrid";
import { InterventionGallery } from "@/components/interventions/InterventionGallery";
import { TOOL_LABELS, type InterventionType } from "@/components/interventions/types";

export const dynamic = "force-dynamic";

const NEW_BUTTONS: { type: InterventionType; label: string }[] = [
  { type: "task_shatter",    label: "Shatter +" },
  { type: "dopamine_menu",   label: "Menu +"     },
  { type: "context_switch",  label: "Switch +"   },
  { type: "interest_filter", label: "Quest +"    },
];

function NewButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {NEW_BUTTONS.map(({ type, label }) => (
        <Link
          key={type}
          href={`/interventions/${TOOL_LABELS[type].slug}?new=1`}
          className="text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shadow-gold)] border-[var(--shadow-border)] text-[var(--shadow-text-faint)] hover:text-[var(--shadow-gold)] hover:border-[var(--shadow-border-active)] hover:bg-[rgba(214,184,116,0.05)]"
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-5">
      <div className="panel-ghost p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--shadow-text-faint)]">
          Cognitive reset chamber
        </p>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--shadow-text)]">
          When friction stops you
        </h2>
        <p className="text-sm text-[var(--shadow-text-muted)] leading-relaxed max-w-xl">
          Shadow interventions are small, intelligent rituals. Each one gives you
          a single first move when you feel stuck, overwhelmed, bored, or unable
          to switch context. Generate one when you need it. They build a pattern over time.
        </p>
      </div>
      <InterventionGrid />
    </div>
  );
}

export default async function InterventionsPage() {
  const user = await getCurrentUser();
  const items = user ? await listInterventions(user.id, { limit: 30 }) : [];

  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Cognitive reset"
        title="Interventions"
        right={<NewButtons />}
      />

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <InterventionGallery items={items} />
      )}
    </div>
  );
}
