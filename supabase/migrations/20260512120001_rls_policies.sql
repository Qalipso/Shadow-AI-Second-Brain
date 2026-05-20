-- Row-level security. Personal tables: user owns their rows.
-- Reference tables: anyone authenticated can read; only service role writes.

-- Enable RLS.
alter table public.profiles            enable row level security;
alter table public.life_areas          enable row level security;
alter table public.question_bank       enable row level security;
alter table public.entries             enable row level security;
alter table public.question_answers    enable row level security;
alter table public.tasks               enable row level security;
alter table public.goals               enable row level security;
alter table public.life_area_scores    enable row level security;
alter table public.daily_reports       enable row level security;
alter table public.ai_processing_logs  enable row level security;
alter table public.user_settings       enable row level security;

------------------------------------------------------------------------------
-- profiles
------------------------------------------------------------------------------
drop policy if exists profiles_self_read   on public.profiles;
drop policy if exists profiles_self_update on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

------------------------------------------------------------------------------
-- reference tables (global read for authed users)
------------------------------------------------------------------------------
drop policy if exists life_areas_read on public.life_areas;
create policy life_areas_read on public.life_areas
  for select to authenticated using (true);

drop policy if exists question_bank_read on public.question_bank;
create policy question_bank_read on public.question_bank
  for select to authenticated using (is_active = true);

------------------------------------------------------------------------------
-- personal tables: full CRUD owned by user
------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'entries',
    'question_answers',
    'tasks',
    'goals',
    'life_area_scores',
    'daily_reports',
    'ai_processing_logs',
    'user_settings'
  ])
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    if t = 'user_settings' then
      execute format($f$
        create policy %I_select on public.%I
          for select using (auth.uid() = user_id);
        create policy %I_insert on public.%I
          for insert with check (auth.uid() = user_id);
        create policy %I_update on public.%I
          for update using (auth.uid() = user_id);
        create policy %I_delete on public.%I
          for delete using (auth.uid() = user_id);
      $f$, t, t, t, t, t, t, t, t);
    else
      execute format($f$
        create policy %I_select on public.%I
          for select using (auth.uid() = user_id);
        create policy %I_insert on public.%I
          for insert with check (auth.uid() = user_id);
        create policy %I_update on public.%I
          for update using (auth.uid() = user_id);
        create policy %I_delete on public.%I
          for delete using (auth.uid() = user_id);
      $f$, t, t, t, t, t, t, t, t);
    end if;
  end loop;
end$$;
