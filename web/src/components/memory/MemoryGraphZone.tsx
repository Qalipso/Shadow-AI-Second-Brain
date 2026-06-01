type Props = {
  entryCount: number;
  areaCount: number;
};

// Static node positions for placeholder graph
const NODES = [
  { x: 140, y: 90,  r: 5,   color: "#C9A36A", label: "work" },
  { x: 210, y: 130, r: 4,   color: "#6D7BFF", label: "focus" },
  { x: 220, y: 190, r: 3.5, color: "#6FBF8A", label: "energy" },
  { x: 155, y: 220, r: 4,   color: "#C9A36A", label: "body" },
  { x: 80,  y: 195, r: 3,   color: "#E0B25C", label: "sleep" },
  { x: 65,  y: 135, r: 3.5, color: "#6D7BFF", label: "mind" },
  { x: 105, y: 80,  r: 3,   color: "#6FBF8A", label: "creative" },
  { x: 165, y: 155, r: 7,   color: "#C9A36A", label: "core" },
];

const EDGES = [
  [0, 7], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7],
  [0, 6], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
];

export function MemoryGraphZone({ entryCount, areaCount }: Props) {
  return (
    <div
      className="rounded-2xl px-5 py-5 space-y-4"
      style={{
        background: "rgba(255,255,255,0.018)",
        border: "1px solid var(--shadow-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-0.5">Memory Graph</p>
          <p className="text-[11px]" style={{ color: "var(--shadow-text-faint)" }}>
            Connections between your memories · visualization in progress
          </p>
        </div>
        <span
          className="text-[10px] font-mono px-2 py-1 rounded-md"
          style={{
            background: "rgba(201,163,106,0.07)",
            border: "1px solid rgba(201,163,106,0.16)",
            color: "var(--accent-warm)",
          }}
        >
          {entryCount} nodes · {areaCount} areas
        </span>
      </div>

      {/* Placeholder SVG graph */}
      <div
        className="w-full rounded-xl overflow-hidden relative"
        style={{
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <svg
          viewBox="0 0 280 280"
          className="w-full"
          style={{ maxHeight: 220 }}
          aria-label="Memory graph placeholder"
        >
          <defs>
            <radialGradient id="mg-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0d0d1a" />
              <stop offset="100%" stopColor="#080810" />
            </radialGradient>
            <filter id="mg-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur" />
              <feFlood floodColor="currentColor" floodOpacity="0.5" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect width="280" height="280" fill="url(#mg-bg)" />

          {/* Edges */}
          {EDGES.map(([a, b], i) => {
            const na = NODES[a];
            const nb = NODES[b];
            return (
              <line
                key={i}
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={0.8}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((n, i) => (
            <g key={i}>
              <circle
                cx={n.x} cy={n.y} r={n.r + 4}
                fill={n.color}
                fillOpacity={0.06}
                style={{ color: n.color }}
              />
              <circle
                cx={n.x} cy={n.y} r={n.r}
                fill={n.color}
                fillOpacity={0.55}
                stroke={n.color}
                strokeOpacity={0.4}
                strokeWidth={0.6}
                filter="url(#mg-glow)"
                style={{ color: n.color }}
              />
              <text
                x={n.x}
                y={n.y + n.r + 9}
                textAnchor="middle"
                fontSize={5.5}
                fill={n.color}
                fillOpacity={0.45}
                style={{ userSelect: "none", pointerEvents: "none", letterSpacing: "0.03em" }}
              >
                {n.label}
              </text>
            </g>
          ))}

          {/* Coming soon overlay */}
          <rect width="280" height="280" fill="rgba(8,8,16,0.45)" />
          <text
            x="140" y="134"
            textAnchor="middle"
            fontSize={9}
            fontFamily="monospace"
            fill="rgba(201,163,106,0.55)"
            letterSpacing="0.18em"
            style={{ textTransform: "uppercase" }}
          >
            GRAPH VISUALIZATION
          </text>
          <text
            x="140" y="148"
            textAnchor="middle"
            fontSize={7.5}
            fontFamily="monospace"
            fill="rgba(255,255,255,0.2)"
            letterSpacing="0.12em"
          >
            coming soon
          </text>
        </svg>
      </div>
    </div>
  );
}
