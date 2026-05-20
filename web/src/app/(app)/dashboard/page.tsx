import { PageHeader } from "@/components/PageHeader";
import { getActiveQuestions, getHabits, getTodayHabitLogs, getCheckinStreak } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { CheckInHero } from "@/components/dashboard/CheckInHero";
import { InboxShortcut } from "@/components/dashboard/InboxShortcut";
import { StateMeters } from "@/components/dashboard/StateMeters";
import { ProtocolsStatusCard } from "@/components/dashboard/ProtocolsStatusCard";
import { SoulCoreCard } from "@/components/dashboard/SoulCoreCard";
import { SoulCoreHero } from "@/components/dashboard/SoulCoreHero";
import { InitiativesWidget } from "@/components/initiatives/InitiativesWidget";
import { StuckRightNowPanel } from "@/components/interventions/StuckRightNowPanel";
import { BlurFade } from "@/components/fx";
import { IdentityZone } from "@/components/dashboard/IdentityZone";
import { ObservationsMarquee } from "@/components/dashboard/ObservationsMarquee";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { DashboardModals } from "@/components/dashboard/DashboardModals";

export const dynamic = "force-dynamic";

function todayString() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const [questions, habits, habitLogs, streak] = await Promise.all([
    getActiveQuestions(),
    user ? getHabits(user.id) : Promise.resolve([]),
    user ? getTodayHabitLogs(user.id) : Promise.resolve([]),
    user ? getCheckinStreak(user.id) : Promise.resolve(0),
  ]);
  return (
    <div className="anim-fade-in">
      {/* Header */}
      <PageHeader
        eyebrow={todayString()}
        title="Today"
        subtitle="Your day, translated into signals."
        right={<StreakBadge streak={streak} />}
      />

      {/* ── Zone A · Identity ──────────────────────────────────────────── */}
      <BlurFade delay={0.05}>
        <IdentityZone
          orb={<SoulCoreHero />}
          checkin={<CheckInHero />}
        />
      </BlurFade>

      <BlurFade delay={0.18}>
        <div className="glow-line zone-gap" />
      </BlurFade>

      {/* ── Zone B · Signal ────────────────────────────────────────────── */}
      <BlurFade delay={0.22}>
        <section className="space-y-4">
          <div className="panel-ambient p-5">
            <StateMeters />
          </div>
          <div className="panel-ambient p-5">
            <InboxShortcut />
          </div>
          <StuckRightNowPanel />
        </section>
      </BlurFade>

      <BlurFade delay={0.35}>
        <div className="glow-line zone-gap" />
      </BlurFade>

      {/* ── Zone C · Progress ──────────────────────────────────────────── */}
      <BlurFade delay={0.4}>
        <section className="space-y-4">
          <InitiativesWidget />

          {/* Compact status pair */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProtocolsStatusCard habits={habits} todayLogs={habitLogs} />
            <SoulCoreCard />
          </div>
        </section>
      </BlurFade>

      <BlurFade delay={0.55}>
        <div className="glow-line zone-gap" />
        <ObservationsMarquee />
      </BlurFade>

      {/* Modals (client-only, lazy-loaded via DashboardModals) */}
      <DashboardModals questions={questions} />
    </div>
  );
}
