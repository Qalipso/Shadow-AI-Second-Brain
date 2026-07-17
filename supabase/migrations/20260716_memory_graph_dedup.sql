-- Add DB-level dedup on memory_graph_nodes/edges (issue #24).
--
-- lib/memory/graph.ts used SELECT-then-INSERT to avoid duplicates, which is
-- only correct under single-writer execution — concurrent synthesis calls
-- for the same user can race past the SELECT before either INSERT commits.
--
-- This migration is NOT a simple ADD CONSTRAINT: if the exact race being
-- fixed already produced duplicate rows on the live database, a naive
-- unique constraint fails to apply. It cannot be verified against the live
-- DB in this session (no credentials available) — dry-run / back up before
-- applying to production.
--
-- Order matters: edges reference nodes with ON DELETE CASCADE
-- (20260522_intelligence_loop.sql:44-45), so deleting a duplicate node
-- without first repointing its edges would silently delete real edge data.

-- Step 1: repoint every edge's from_node_id/to_node_id off of a "loser"
-- duplicate node onto the "winner" (most-recently-updated row) in its
-- (user_id, label, node_type) group. No-op if there are no duplicates.
WITH ranked AS (
  SELECT id,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, label, node_type
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS winner_id
  FROM memory_graph_nodes
)
UPDATE memory_graph_edges e
SET from_node_id = r.winner_id
FROM ranked r
WHERE e.from_node_id = r.id AND r.id <> r.winner_id;

WITH ranked AS (
  SELECT id,
    FIRST_VALUE(id) OVER (
      PARTITION BY user_id, label, node_type
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
    ) AS winner_id
  FROM memory_graph_nodes
)
UPDATE memory_graph_edges e
SET to_node_id = r.winner_id
FROM ranked r
WHERE e.to_node_id = r.id AND r.id <> r.winner_id;

-- Step 2: repointing in step 1 can itself create duplicate edges (two loser
-- nodes both had an edge to the same target now both point from the same
-- winner) — dedupe those before adding the edge uniqueness constraint.
WITH ranked_edges AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, from_node_id, to_node_id, edge_type
    ORDER BY created_at DESC NULLS LAST, id
  ) AS rn
  FROM memory_graph_edges
)
DELETE FROM memory_graph_edges
WHERE id IN (SELECT id FROM ranked_edges WHERE rn > 1);

-- Step 3: now safe to remove loser node rows — nothing references them
-- after step 1.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, label, node_type
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
  ) AS rn
  FROM memory_graph_nodes
)
DELETE FROM memory_graph_nodes
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 4: the constraints lib/memory/graph.ts's upsert() calls target via
-- onConflict. Also fixes the node dedup key itself (was (user_id, label)
-- only — a later synthesis run emitting the same label under a different
-- node_type could never update the existing row's type; now it correctly
-- creates a distinct node instead of silently carrying a stale type).
ALTER TABLE memory_graph_nodes
  ADD CONSTRAINT memory_graph_nodes_user_label_type_uniq
  UNIQUE (user_id, label, node_type);

ALTER TABLE memory_graph_edges
  ADD CONSTRAINT memory_graph_edges_user_from_to_type_uniq
  UNIQUE (user_id, from_node_id, to_node_id, edge_type);
