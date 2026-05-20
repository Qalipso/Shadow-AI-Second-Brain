import type { MusicProfile, EmotionalAnchor } from "@/types/music";
import { SonicOrb } from "./SonicOrb";
import { CurrentSoundState } from "./CurrentSoundState";
import { SonicArchetypeCard } from "./SonicArchetype";
import { TopArtists, TopTracks } from "./TopArtistsTracks";
import { DominantGenres } from "./DominantGenres";
import { EmotionalAnchors } from "./EmotionalAnchors";
import { ListeningShift } from "./ListeningShift";
import { MusicLifeCircle } from "./MusicLifeCircle";
import { AISonicInsight } from "./AISonicInsight";
import { SyncButton } from "./SyncButton";

export function SonicMirrorOverview({
  profile,
  anchors,
}: {
  profile: MusicProfile;
  anchors: EmotionalAnchor[];
}) {
  const soundState = profile.current_sound_state ?? null;
  const archetype = profile.sonic_archetype ?? null;

  return (
    <div className="space-y-6 anim-fade-in">
      {/* Hero — orb + state */}
      <div className="flex flex-col items-center pt-4 pb-2 gap-5">
        <SonicOrb soundState={soundState} size={128} />
        <div className="text-center">
          <p
            className="text-[9px] font-mono uppercase tracking-[0.35em]"
            style={{ color: "var(--shadow-text-faint)" }}
          >
            Sonic Mirror · {profile.provider}
          </p>
          {profile.last_synced_at && (
            <p className="text-[10px] mt-1" style={{ color: "var(--shadow-text-faint)" }}>
              Synced {new Date(profile.last_synced_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <SyncButton />
      </div>

      <div className="glow-line" />

      {/* State + Archetype */}
      {soundState && <CurrentSoundState state={soundState} />}
      {archetype && <SonicArchetypeCard archetype={archetype} />}

      <div className="glow-line" />

      {/* Score bars */}
      <MusicLifeCircle profile={profile} />

      {/* AI Insight */}
      <AISonicInsight initialInsight={profile.ai_summary ?? null} />

      <div className="glow-line" />

      {/* Listening shift */}
      {profile.top_artists_short.length > 0 && (
        <ListeningShift
          short={profile.top_artists_short}
          medium={profile.top_artists_medium}
          long={profile.top_artists_long}
        />
      )}

      {/* Genres */}
      <DominantGenres genres={profile.dominant_genres} />

      {/* Emotional anchors */}
      <EmotionalAnchors initialAnchors={anchors} />

      <div className="glow-line" />

      {/* Top artists (grid) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TopArtists artists={profile.top_artists_short} label="Artists · 4 weeks" />
        <TopArtists artists={profile.top_artists_medium} label="Artists · 6 months" />
      </div>

      {/* Top tracks */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TopTracks tracks={profile.top_tracks_short} label="Tracks · 4 weeks" />
        <TopTracks tracks={profile.top_tracks_medium} label="Tracks · 6 months" />
      </div>
    </div>
  );
}
