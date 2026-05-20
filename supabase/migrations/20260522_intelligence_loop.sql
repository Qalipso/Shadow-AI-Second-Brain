-- Shadow Intelligence Loop v1 — Sprint 2 Tables
-- PBI-07: memory_items type system extensions
-- PBI-09: memory_graph_nodes, memory_graph_edges
-- PBI-10: knowledge_gaps
-- PBI-11: ai_questions, ai_question_answers
-- PBI-12: daily_checkins
-- PBI-19: shadow_initiatives
-- PBI-27: Full DB for intelligence loop

-- ─── memory_items: add type system columns (PBI-07) ─────────────────────────
ALTER TABLE memory_items
  ADD COLUMN IF NOT EXISTS memory_type    TEXT NOT NULL DEFAULT 'insight'
    CHECK (memory_type IN ('profile','episodic','behavioral','goal','current_state','preference','insight','relationship')),
  ADD COLUMN IF NOT EXISTS source_object_id TEXT,
  ADD COLUMN IF NOT EXISTS confidence       NUMERIC(3,2) DEFAULT 0.80 CHECK (confidence BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_memory_items_type ON memory_items(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_items_user_type ON memory_items(user_id, memory_type);

-- ─── memory_graph_nodes (PBI-09) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_graph_nodes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  node_type   TEXT NOT NULL
    CHECK (node_type IN ('user_profile','value','goal','project','habit','emotion','event','pattern','risk','preference','person','place','decision','insight','current_state')),
  label       TEXT NOT NULL,
  description TEXT,
  data_json   JSONB NOT NULL DEFAULT '{}',
  importance  INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_type TEXT,
  source_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_user      ON memory_graph_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type      ON memory_graph_nodes(user_id, node_type);

-- ─── memory_graph_edges (PBI-09) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_graph_edges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  from_node_id UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
  to_node_id   UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
  edge_type    TEXT NOT NULL
    CHECK (edge_type IN ('supports','blocks','triggers','repeats_in','belongs_to','contradicts','strengthens','weakens','causes','related_to')),
  weight       NUMERIC(3,2) NOT NULL DEFAULT 0.70 CHECK (weight BETWEEN 0 AND 1),
  data_json    JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_user     ON memory_graph_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_from     ON memory_graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to       ON memory_graph_edges(to_node_id);

-- ─── knowledge_gaps (PBI-10) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_gaps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  reason       TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'ai_brain',
  area         TEXT,
  priority     INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  status       TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','questioning','answered','dismissed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_user   ON knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_status ON knowledge_gaps(user_id, status);

-- ─── ai_questions (PBI-11) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  gap_id          UUID REFERENCES knowledge_gaps(id) ON DELETE SET NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'identity'
    CHECK (question_type IN ('identity','motivation','friction','pattern','context','reflection','goal','habit','emotional_state')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','shown','answered','skipped','snoozed','dismissed')),
  shown_at        TIMESTAMPTZ,
  snoozed_until   TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_questions_user   ON ai_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_questions_status ON ai_questions(user_id, status);

-- ─── ai_question_answers (PBI-11) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_question_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  question_id     UUID NOT NULL REFERENCES ai_questions(id) ON DELETE CASCADE,
  answer_text     TEXT NOT NULL,
  memory_item_id  UUID REFERENCES memory_items(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_qa_user     ON ai_question_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_qa_question ON ai_question_answers(question_id);

-- ─── daily_checkins (PBI-12 through PBI-18) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Current State (PBI-13) — energy/focus/body_state: 0-5; mood: -5 to +5
  energy           INTEGER CHECK (energy BETWEEN 0 AND 5),
  mood             INTEGER CHECK (mood BETWEEN -5 AND 5),
  mental_noise     INTEGER CHECK (mental_noise BETWEEN 0 AND 5),
  body_state       INTEGER CHECK (body_state BETWEEN 0 AND 5),
  focus            INTEGER CHECK (focus BETWEEN 0 AND 5),

  -- Inbox Dump (PBI-14)
  inbox_dump       TEXT,

  -- Today Focus (PBI-15)
  today_focus      TEXT,
  today_focus_custom TEXT,

  -- Habits / Souls link (PBI-16)
  habit_id_today   UUID REFERENCES habits(id) ON DELETE SET NULL,

  -- Goals link (PBI-17)
  linked_goal_id   UUID REFERENCES goals(id) ON DELETE SET NULL,

  -- Insight (PBI-18)
  insight_text     TEXT,

  -- AI Question answered during check-in
  ai_question_id   UUID REFERENCES ai_questions(id) ON DELETE SET NULL,
  ai_question_answer TEXT,

  -- AI Brain output (PBI-25)
  today_initiative_text TEXT,
  today_initiative_json JSONB,
  ai_processed     BOOLEAN NOT NULL DEFAULT false,
  ai_processed_at  TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_checkins(user_id, date DESC);

-- ─── shadow_initiatives (PBI-19) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shadow_initiatives (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  title            TEXT NOT NULL,
  reason           TEXT NOT NULL,
  suggested_action TEXT,
  initiative_type  TEXT NOT NULL DEFAULT 'observation'
    CHECK (initiative_type IN ('observation','question','pattern','recovery','goal','habit','memory_gap','productive_nudge','reflection_prompt')),
  linked_area      TEXT,
  source_signals   JSONB NOT NULL DEFAULT '[]',
  priority         INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  pattern_duration TEXT
    CHECK (pattern_duration IN ('micro','short','medium','long','core') OR pattern_duration IS NULL),
  status           TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','accepted','done','snoozed','dismissed','expired')),
  expires_at       TIMESTAMPTZ,
  snoozed_until    TIMESTAMPTZ,
  source_checkin_id UUID REFERENCES daily_checkins(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_initiatives_user   ON shadow_initiatives(user_id);
CREATE INDEX IF NOT EXISTS idx_initiatives_status ON shadow_initiatives(user_id, status);

-- ─── RLS policies ────────────────────────────────────────────────────────────
ALTER TABLE memory_graph_nodes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_graph_edges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_gaps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_initiatives  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_graph_nodes"  ON memory_graph_nodes  USING (user_id = auth.uid());
CREATE POLICY "users_own_graph_edges"  ON memory_graph_edges  USING (user_id = auth.uid());
CREATE POLICY "users_own_knowledge_gaps" ON knowledge_gaps    USING (user_id = auth.uid());
CREATE POLICY "users_own_ai_questions"  ON ai_questions       USING (user_id = auth.uid());
CREATE POLICY "users_own_ai_qa"         ON ai_question_answers USING (user_id = auth.uid());
CREATE POLICY "users_own_checkins"      ON daily_checkins     USING (user_id = auth.uid());
CREATE POLICY "users_own_initiatives"   ON shadow_initiatives USING (user_id = auth.uid());
