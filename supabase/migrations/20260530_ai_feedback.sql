-- ai_feedback: thumbs up/down on Shadow orb replies for LLM eval loop.
create table if not exists public.ai_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- reply_id references the ai_processing_logs row for this chat call (optional).
  reply_id    uuid references public.ai_processing_logs(id) on delete set null,
  -- entry_id for reclassify feedback (optional).
  entry_id    uuid references public.entries(id) on delete set null,
  rating      smallint not null check (rating in (-1, 1)), -- -1 = thumbs down, 1 = thumbs up
  context     text check (char_length(context) <= 500),    -- user note or auto-tag
  created_at  timestamptz not null default now()
);

alter table public.ai_feedback enable row level security;

create policy "Users manage own feedback"
  on public.ai_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for eval queries: all feedback for a user sorted by time.
create index if not exists ai_feedback_user_created
  on public.ai_feedback (user_id, created_at desc);
