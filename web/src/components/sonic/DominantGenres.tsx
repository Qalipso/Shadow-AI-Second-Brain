import { Card } from "@/components/Card";

// Cycle through muted palette for visual variety
const GENRE_COLORS = [
  "rgba(126,87,194,0.65)",
  "rgba(109,123,255,0.60)",
  "rgba(214,184,116,0.60)",
  "rgba(113,179,139,0.55)",
  "rgba(201,163,106,0.55)",
  "rgba(172,82,101,0.50)",
  "rgba(68,91,140,0.65)",
];

export function DominantGenres({ genres }: { genres: string[] }) {
  if (!genres.length) return null;

  return (
    <Card title="Dominant Genres">
      <div className="flex flex-wrap gap-2 pt-1">
        {genres.map((genre, i) => (
          <span
            key={genre}
            className="px-3 py-1 rounded-full text-[11px] font-mono"
            style={{
              background: GENRE_COLORS[i % GENRE_COLORS.length].replace(/[\d.]+\)$/, "0.12)"),
              border: `1px solid ${GENRE_COLORS[i % GENRE_COLORS.length].replace(/[\d.]+\)$/, "0.28)")}`,
              color: GENRE_COLORS[i % GENRE_COLORS.length].replace(/[\d.]+\)$/, "0.9)"),
            }}
          >
            {genre}
          </span>
        ))}
      </div>
    </Card>
  );
}
