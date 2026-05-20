import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  return (
    <div className="space-y-6 anim-fade-in">
      <PageHeader
        eyebrow="Shadow · Journey"
        title="Journey"
        subtitle="Long-term patterns, traces and milestones."
      />

      {/* Placeholder content */}
      <div className="flex flex-col items-center text-center px-6 py-12">
        <div className="relative mb-10">
          <div
            className="w-16 h-16 rounded-full"
            style={{
              background: "radial-gradient(circle at 38% 36%, rgba(126,87,194,0.35) 0%, rgba(14,13,22,0.8) 70%)",
              border: "1px solid rgba(126,87,194,0.18)",
              boxShadow: "0 0 40px rgba(126,87,194,0.12), inset 0 0 20px rgba(126,87,194,0.06)",
            }}
          />
          <span
            className="absolute inset-0 rounded-full dot-breathe"
            style={{
              background: "transparent",
              boxShadow: "0 0 24px rgba(126,87,194,0.2)",
            }}
          />
        </div>

        <p
          className="text-[10px] font-mono uppercase tracking-[0.3em] mb-4"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          Timeline
        </p>

        <h2
          className="text-[20px] font-[family-name:var(--font-fraunces)] font-light mb-3 leading-snug"
          style={{ color: "var(--shadow-text-muted)" }}
        >
          Awaiting the first trace.
        </h2>

        <p
          className="text-[13px] max-w-[280px] leading-relaxed"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          The pattern has not yet revealed itself.
          <br />
          Keep leaving traces.
        </p>
      </div>
    </div>
  );
}
