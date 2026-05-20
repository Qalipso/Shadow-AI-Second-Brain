"use client";

type RadarChartProps = {
  scores: Record<string, number>; // dimension → 0-100
  size?: number;
  accentColor?: string;
};

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

// Short display labels for radar chart
const DIM_SHORT: Record<string, string> = {
  openness: "Openness",
  conscientiousness: "Conscientious.",
  extraversion: "Extraversion",
  agreeableness: "Agreeableness",
  neuroticism: "Neuroticism",
  autonomy: "Autonomy",
  achievement: "Achievement",
  security: "Security",
  creativity: "Creativity",
  stimulation: "Stimulation",
  connection: "Connection",
  care: "Care",
  status: "Status",
  pleasure: "Pleasure",
  meaning: "Meaning",
  energy: "Energy",
  emotional_state: "Emotional",
  recovery: "Recovery",
  cognitive_load: "Cognitive Load",
  wellbeing: "Wellbeing",
};

function dimensionLabel(dim: string): string {
  return (DIM_SHORT[dim] ?? dim.replace(/_/g, " ")).toUpperCase();
}

export function RadarChart({
  scores,
  size = 260,
  accentColor = "var(--accent-cool)",
}: RadarChartProps) {
  const entries = Object.entries(scores);
  const n = entries.length;
  if (n < 3) return null;

  // Add padding around the chart so labels aren't clipped
  const pad = 64;
  const total = size + pad * 2;
  const cx = total / 2;
  const cy = total / 2;
  const maxR = size * 0.36;
  const labelOffset = maxR + 22;
  const angleStep = (2 * Math.PI) / n;

  const rings = [25, 50, 75, 100];

  const dataPoints = entries.map(([, score], i) => {
    const r = (score / 100) * maxR;
    return polarToCartesian(cx, cy, r, i * angleStep);
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <svg
      width={total}
      height={total}
      className="mx-auto max-w-full"
      viewBox={`0 0 ${total} ${total}`}
    >
      {/* Grid rings */}
      {rings.map((pct) => {
        const ringR = (pct / 100) * maxR;
        const pts = Array.from({ length: n }, (_, i) => polarToCartesian(cx, cy, ringR, i * angleStep));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
        return (
          <path key={pct} d={d} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        );
      })}

      {/* Axis lines */}
      {entries.map((_, i) => {
        const outer = polarToCartesian(cx, cy, maxR, i * angleStep);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill={accentColor}
        fillOpacity={0.12}
        stroke={accentColor}
        strokeWidth="1.5"
        strokeOpacity={0.7}
      />

      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={accentColor} fillOpacity={0.9} />
      ))}

      {/* Labels */}
      {entries.map(([dim, score], i) => {
        const lp = polarToCartesian(cx, cy, labelOffset, i * angleStep);
        const anchor = lp.x < cx - 5 ? "end" : lp.x > cx + 5 ? "start" : "middle";
        return (
          <g key={dim}>
            <text
              x={lp.x} y={lp.y - 3}
              textAnchor={anchor}
              fill="rgba(255,255,255,0.4)"
              fontSize="7.5"
              fontFamily="monospace"
              letterSpacing="0.06em"
            >
              {dimensionLabel(dim)}
            </text>
            <text
              x={lp.x} y={lp.y + 10}
              textAnchor={anchor}
              fill="rgba(255,255,255,0.85)"
              fontSize="12"
              fontWeight="600"
            >
              {score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
