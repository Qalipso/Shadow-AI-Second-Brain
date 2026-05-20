"use client";

type SelfKnowledgeIndexProps = {
  completedCount: number;
  totalCount: number;
};

export function SelfKnowledgeIndex({ completedCount, totalCount }: SelfKnowledgeIndexProps) {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const statusText =
    pct === 0
      ? "Begin your first scan to calibrate Shadow."
      : pct < 50
      ? "Shadow is learning to know you."
      : pct < 100
      ? "Your psychological portrait is taking shape."
      : "Full calibration achieved.";

  return (
    <div
      className="relative rounded-2xl border overflow-hidden flex items-center gap-7 px-6 py-5"
      style={{
        background: "linear-gradient(135deg, rgba(18,18,26,0.97) 0%, rgba(10,10,20,0.99) 100%)",
        borderColor: "rgba(109,123,255,0.20)",
        boxShadow: "0 0 40px rgba(109,123,255,0.06), inset 0 1px 0 rgba(109,123,255,0.12)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-10 -left-10 w-64 h-64 rounded-full opacity-[0.18] animate-pulse"
        style={{ background: "radial-gradient(circle, #6D7BFF 0%, transparent 70%)", animationDuration: "4s" }}
      />

      {/* Ring */}
      <div className="relative flex-shrink-0">
        <svg width="80" height="80" className="-rotate-90">
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="3"
          />
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="url(#ski-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(.14,1,.34,1)" }}
          />
          <defs>
            <linearGradient id="ski-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6D7BFF" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C9A36A" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold text-zinc-100 leading-none">{pct}%</span>
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-zinc-600 mb-1">
          Self-Knowledge Index
        </p>
        <p className="text-[15px] font-semibold text-zinc-100 leading-tight">
          {completedCount} of {totalCount} modules complete
        </p>
        <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{statusText}</p>
      </div>
    </div>
  );
}
