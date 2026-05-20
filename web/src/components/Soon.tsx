import { PageHeader } from "@/components/PageHeader";

export function Soon({ title, eyebrow }: { title: string; eyebrow?: string }) {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={eyebrow ?? "Shadow"}
        title={title}
        subtitle=""
      />

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-10 h-10 rounded-full mb-8"
          style={{
            background: "radial-gradient(circle at 40% 35%, rgba(126,87,194,0.2) 0%, rgba(14,13,22,0.6) 70%)",
            border: "1px solid rgba(126,87,194,0.1)",
            boxShadow: "0 0 24px rgba(126,87,194,0.08)",
          }}
        />
        <p
          className="text-[10px] font-mono uppercase tracking-[0.3em] mb-3"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          {title}
        </p>
        <p
          className="text-[15px] font-[family-name:var(--font-fraunces)] font-light"
          style={{ color: "var(--shadow-text-muted)" }}
        >
          Not yet unfolded.
        </p>
        <p
          className="text-[12px] mt-2 max-w-[220px] leading-relaxed"
          style={{ color: "var(--shadow-text-faint)" }}
        >
          This part of the pattern is still forming.
        </p>
      </div>
    </div>
  );
}
