-- Direction module: expand goals, add missions, expand tasks
-- goals: add new fields to existing minimal table

alter table public.goals
  add column if not exists description      text,
  add column if not exists why              text,
  add column if not exists linked_life_areas text[] default '{}',
  add column if not exists goal_type        text check (goal_type in ('outcome','identity','recovery','skill','project','experiment')),
  add column if not exists clarity_score    smallint check (clarity_score between 0 and 10),
  add column if not exists energy_score     smallint check (energy_score between 0 and 10),
  add column if not exists progress         smallint default 0 check (progress between 0 and 100),
  add column if not exists deadline         date,
  add column if not exists updated_at       timestamptz default now();

-- missions (new table)
create table if not exists public.missions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  goal_id           uuid references public.goals(id) on delete set null,
  title             text not null,
  description       text,
  status            text not null default 'active'
                      check (status in ('active','paused','completed','blocked','abandoned')),
  progress          smallint default 0 check (progress between 0 and 100),
  linked_life_areas text[] default '{}',
  blocker           text,
  created_at        timestamptz default now() not null,
  updated_at        timestamptz default now() not null
);

create index if not exists missions_user_idx on public.missions (user_id, status);
create index if not exists missions_goal_idx on public.missions (goal_id);

-- tasks: add new fields
alter table public.tasks
  add column if not exists description         text,
  add column if not exists goal_id             uuid references public.goals(id) on delete set null,
  add column if not exists mission_id          uuid references public.missions(id) on delete set null,
  add column if not exists energy_cost         smallint check (energy_cost between 0 and 10),
  add column if not exists linked_life_areas   text[] default '{}',
  add column if not exists created_from_inbox  boolean default false,
  add column if not exists updated_at          timestamptz default now();

-- RLS: goals
alter table public.goals enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'goals' and policyname = 'goals_owner'
  ) then
    create policy goals_owner on public.goals
      for all using (user_id = auth.uid());
  end if;
end $$;

-- RLS: missions
alter table public.missions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'missions' and policyname = 'missions_owner'
  ) then
    create policy missions_owner on public.missions
      for all using (user_id = auth.uid());
  end if;
end $$;

-- auto-update updated_at trigger (reuse pattern from soul_core)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists goals_updated_at    on public.goals;
drop trigger if exists missions_updated_at on public.missions;
drop trigger if exists tasks_updated_at    on public.tasks;

create trigger goals_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

create trigger missions_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
