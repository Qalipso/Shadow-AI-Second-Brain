-- ─── Sonic Mirror ────────────────────────────────────────────────────────────
-- Music profile analysis: Spotify data + computed psychological scores

-- Music profiles (one per user per provider)
CREATE TABLE IF NOT EXISTS music_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider       text NOT NULL DEFAULT 'spotify', -- spotify | yandex | manual
  -- OAuth tokens (Spotify)
  access_token   text,
  refresh_token  text,
  token_expires_at timestamptz,
  -- Sync metadata
  connected_at   timestamptz DEFAULT now(),
  last_synced_at timestamptz,
  -- Raw Spotify data (JSONB arrays of serialized track/artist objects)
  top_artists_short  jsonb DEFAULT '[]',
  top_artists_medium jsonb DEFAULT '[]',
  top_artists_long   jsonb DEFAULT '[]',
  top_tracks_short   jsonb DEFAULT '[]',
  top_tracks_medium  jsonb DEFAULT '[]',
  top_tracks_long    jsonb DEFAULT '[]',
  recent_tracks      jsonb DEFAULT '[]',
  dominant_genres    jsonb DEFAULT '[]',
  -- Computed behavioral scores (0–100)
  repeat_score      numeric(5,2) DEFAULT 0,
  exploration_score numeric(5,2) DEFAULT 0,
  intensity_score   numeric(5,2) DEFAULT 0,
  nostalgia_score   numeric(5,2) DEFAULT 0,
  focus_score       numeric(5,2) DEFAULT 0,
  -- Computed psychological profile
  sonic_archetype     text,
  current_sound_state text,
  ai_summary          text,
  UNIQUE(user_id, provider)
);

-- Music insights (AI-generated periodic summaries)
CREATE TABLE IF NOT EXISTS music_insights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period           text NOT NULL DEFAULT 'weekly', -- weekly | monthly
  title            text,
  description      text,
  linked_life_areas jsonb DEFAULT '[]',
  linked_mood      text,
  confidence       numeric(4,3) DEFAULT 0.7,
  created_at       timestamptz DEFAULT now()
);

-- Emotional anchors (user-labeled repeated tracks)
CREATE TABLE IF NOT EXISTS emotional_anchors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id         text NOT NULL,   -- Spotify track ID
  track_name       text NOT NULL,
  artist_name      text NOT NULL,
  album_art_url    text,
  user_meaning     text,            -- focus | pain | power | love | nostalgia | escape | recovery | chaos
  detected_pattern text,
  linked_life_areas jsonb DEFAULT '[]',
  play_count       integer DEFAULT 1,
  first_seen_at    timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE music_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_insights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_profiles_own"    ON music_profiles    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "music_insights_own"    ON music_insights    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "emotional_anchors_own" ON emotional_anchors FOR ALL USING (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_music_profiles_user    ON music_profiles    (user_id);
CREATE INDEX IF NOT EXISTS idx_music_insights_user    ON music_insights    (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_anchors_user ON emotional_anchors (user_id);
