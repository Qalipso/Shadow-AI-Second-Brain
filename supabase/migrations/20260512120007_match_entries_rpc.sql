-- RPC function for vector similarity search on entries.
-- Used by src/lib/rag.ts to find semantically similar entries.
-- Cosine distance: lower = more similar. We return (1 - distance) as similarity.

CREATE OR REPLACE FUNCTION public.match_entries(
  query_embedding text,
  match_user_id uuid,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  raw_text text,
  summary text,
  entry_type text,
  life_area_id smallint,
  emotion_primary text,
  created_at timestamptz,
  similarity double precision
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.raw_text,
    e.summary,
    e.entry_type,
    e.life_area_id,
    e.emotion_primary,
    e.created_at,
    1 - (e.embedding <=> query_embedding::vector) AS similarity
  FROM public.entries e
  WHERE e.user_id = match_user_id
    AND e.embedding IS NOT NULL
    AND e.status = 'processed'
  ORDER BY e.embedding <=> query_embedding::vector
  LIMIT match_count;
$$;
