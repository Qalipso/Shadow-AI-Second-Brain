import { Sidebar } from "@/components/Sidebar";
import { ShadowOrb } from "@/components/ShadowOrb";
import { UserPill } from "@/components/UserPill";
import { ToastProvider } from "@/components/Toast";
import { PageTransition } from "@/components/fx";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { MemoryContract } from "@/components/onboarding/MemoryContract";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex flex-1 h-dvh relative">
        <Sidebar footer={<UserPill />} />
        <main className="flex-1 min-w-0 overflow-y-auto bg-shadow-glow">
          <div className="px-4 pt-14 pb-8 md:px-10 md:pt-8 max-w-[1400px] mx-auto w-full">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <ShadowOrb />
        <MemoryContract />
        <OnboardingTour />
      </div>
    </ToastProvider>
  );
}
