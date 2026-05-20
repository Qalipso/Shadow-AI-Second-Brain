-- ─── Sonic Mirror v2 — Proper Spotify Connect ────────────────────────────────
-- Replaces the raw music_profiles pattern with secure, normalized tables.
-- Old music_profiles table kept for backward compat but is deprecated.

-- Spotify OAuth connections (one per user; tokens AES-256-GCM encrypted)
CREATE TABLE IF NOT EXISTS spotify_connections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'connected',  -- connected | disconnected | error
  spotify_user_id     text,
  spotify_display_name text,
  access_token_enc    text NOT NULL,                      -- AES-256-GCM encrypted
  refresh_token_enc   text,                               -- AES-256-GCM encrypted
  token_expires_at    timestamptz NOT NULL,
  scopes              text[] DEFAULT '{}',
  connected_at        timestamptz DEFAULT now(),
  last_synced_at      timestamptz,
  error_message       text,
  UNIQUE(user_id)
);

-- Top artists fetched from Spotify, normalized rows
CREATE TABLE IF NOT EXISTS spotify_artist_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_artist_id text NOT NULL,
  name              text NOT NULL,
  genres            text[] DEFAULT '{}',
  popularity        integer DEFAULT 0,
  image_url         text,
  spotify_url       text,
  period            text NOT NULL,  -- short_term | medium_term | long_term
  rank              integer NOT NULL,
  fetched_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_artist_id, period)
);

-- Top tracks + recently played, normalized rows
CREATE TABLE IF NOT EXISTS spotify_track_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spotify_track_id  text NOT NULL,
  name              text NOT NULL,
  artist_names      text[] DEFAULT '{}',
  album_name        text,
  image_url         text,
  spotify_url       text,
  duration_ms       integer DEFAULT 0,
  popularity        integer DEFAULT 0,
  period            text NOT NULL,  -- short_term | medium_term | long_term | recent
  rank              integer NOT NULL,
  played_at         timestamptz,
  fetched_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, spotify_track_id, period)
);

-- Aggregated music snapshot (computed on sync)
CREATE TABLE IF NOT EXISTS music_snapshots (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             text NOT NULL DEFAULT 'spotify',
  repeated_artists     jsonb DEFAULT '[]',  -- [{id, name, imageUrl}]
  repeated_tracks      jsonb DEFAULT '[]',  -- [{id, name, artistNames, imageUrl, playCount}]
  dominant_genres      jsonb DEFAULT '[]',  -- ["hip-hop", "ambient", ...]
  short_vs_long_shift  text DEFAULT 'stable', -- stable | shifting | gradual
  created_at           timestamptz DEFAULT now()
);

-- User-confirmed emotional labels for artists/tracks
CREATE TABLE IF NOT EXISTS music_meaning_labels (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type    text NOT NULL,  -- artist | track
  item_id      text NOT NULL,  -- Spotify artist/track ID
  item_name    text NOT NULL,
  artist_name  text,           -- for tracks
  label        text NOT NULL,  -- Focus | Power | Pain | Love | Nostalgia | Escape |
                               -- Recovery | Chaos | Confidence | Memory | Sensuality |
                               -- Peace | Tension | Joy
  user_note    text,           -- free text from user
  confirmed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_type, item_id, label)
);

-- AI-generated careful sonic reflections
CREATE TABLE IF NOT EXISTS sonic_reflections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text,
  summary           text,
  patterns          jsonb DEFAULT '[]',         -- string[]
  possible_meanings jsonb DEFAULT '[]',         -- string[]
  linked_life_areas jsonb DEFAULT '[]',         -- string[]
  confidence        text DEFAULT 'low',         -- low | medium | high
  user_question     text,
  input_label_count integer DEFAULT 0,          -- how many confirmed labels were used
  created_at        timestamptz DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE spotify_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_artist_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotify_track_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_meaning_labels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sonic_reflections     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sc_own"   ON spotify_connections   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sai_own"  ON spotify_artist_items  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sti_own"  ON spotify_track_items   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "ms_own"   ON music_snapshots       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "mml_own"  ON music_meaning_labels  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sr_own"   ON sonic_reflections     FOR ALL USING (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sc_user     ON spotify_connections  (user_id);
CREATE INDEX IF NOT EXISTS idx_sai_user    ON spotify_artist_items (user_id, period, rank);
CREATE INDEX IF NOT EXISTS idx_sti_user    ON spotify_track_items  (user_id, period, rank);
CREATE INDEX IF NOT EXISTS idx_ms_user     ON music_snapshots      (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mml_user    ON music_meaning_labels (user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_sr_user     ON sonic_reflections    (user_id, created_at DESC);
