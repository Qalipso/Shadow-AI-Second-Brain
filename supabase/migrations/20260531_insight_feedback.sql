-- insight_feedback: useful / not_useful ratings on daily reports.
-- Created Sprint 3 — POST /api/insights/feedback

create table if not exists public.insight_feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  report_id   uuid not null references public.daily_reports(id) on delete cascade,
  rating      text not null check (rating in ('useful', 'not_useful')),
  created_at  timestamptz not null default now(),

  -- One rating per user per report (upsert target)
  unique (user_id, report_id)
);

alter table public.insight_feedback enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'insight_feedback'
      and policyname = 'Users manage own insight feedback'
  ) then
    execute $policy$
      create policy "Users manage own insight feedback"
        on public.insight_feedback
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

create index if not exists insight_feedback_user
  on public.insight_feedback (user_id, created_at desc);
