-- Labs: memory_items vector enhancement.
-- REQUIRES: pgvector extension enabled in Supabase (Database → Extensions → vector).
-- Run AFTER 20260520_labs.sql.

ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_memory_items_embedding
  ON memory_items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE OR REPLACE FUNCTION match_memory_items(
  query_embedding vector(1536),
  match_user_id   UUID,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  title       TEXT,
  content     TEXT,
  source_type TEXT,
  importance  INTEGER,
  stability   TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ,
  similarity  FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id, mi.title, mi.content, mi.source_type,
    mi.importance, mi.stability, mi.tags, mi.created_at,
    1 - (mi.embedding <=> query_embedding) AS similarity
  FROM memory_items mi
  WHERE mi.user_id = match_user_id
    AND mi.embedding IS NOT NULL
  ORDER BY mi.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
