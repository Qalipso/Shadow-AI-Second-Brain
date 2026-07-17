-- Drop plaintext Spotify OAuth token columns on music_profiles (issue #2).
--
-- Only the now-deleted legacy routes (/api/music/{connect,callback,sync})
-- ever wrote access_token/refresh_token/token_expires_at here, in plaintext.
-- The live Spotify path stores tokens encrypted, in a different table
-- (spotify_connections.access_token_enc/refresh_token_enc, via
-- lib/music/crypto.ts). Confirmed via grep that no other code reads these
-- three columns: lib/music/data.ts's getMusicProfile() selects `*` from
-- music_profiles but only ever consumed access_token/refresh_token in the
-- routes deleted alongside this migration; its Zod schema already marks
-- all three fields optional (types/music.ts:77-79), so removing them from
-- the table requires no schema/type change downstream.
--
-- Irreversible: this deletes whatever plaintext token data is in these
-- columns right now. That's the point — it's insecure data for a feature
-- with zero live callers, not something worth preserving.

ALTER TABLE music_profiles
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token,
  DROP COLUMN IF EXISTS token_expires_at;
