-- Atomic per-user daily LLM budget (issue #4).
--
-- Replaces the check-then-act SUM() read in isOverDailyCap with a counter row
-- per (user, day) and a single-statement conditional reserve: N concurrent
-- requests can no longer all pass the cap check together — the INSERT … ON
-- CONFLICT DO UPDATE … WHERE … RETURNING either books the estimate or denies.

create table if not exists public.daily_llm_spend (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  spent_usd  numeric(10, 6) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_llm_spend enable row level security;

-- Owners may read their own spend (dashboards). All writes go through the
-- security-definer functions below — no direct client writes.
drop policy if exists "read own spend" on public.daily_llm_spend;
create policy "read own spend" on public.daily_llm_spend
  for select using (auth.uid() = user_id);

-- Try to book p_estimate USD against today's budget. Returns whether the
-- reservation was allowed and the counter after (or at, if denied) the call.
create or replace function public.llm_reserve_budget(p_estimate numeric, p_cap numeric)
returns table (allowed boolean, spent_usd numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_day  date := (now() at time zone 'utc')::date;
  v_new  numeric;
begin
  if v_user is null then
    return query select false, 0::numeric;
    return;
  end if;

  insert into daily_llm_spend as d (user_id, day, spent_usd)
  select v_user, v_day, p_estimate
  where p_estimate <= p_cap                -- first call of the day over cap → deny
  on conflict (user_id, day) do update
    set spent_usd = d.spent_usd + excluded.spent_usd,
        updated_at = now()
    where d.spent_usd + excluded.spent_usd <= p_cap
  returning d.spent_usd into v_new;

  if v_new is null then
    return query
      select false,
             coalesce((select s.spent_usd from daily_llm_spend s
                        where s.user_id = v_user and s.day = v_day), 0::numeric);
  else
    return query select true, v_new;
  end if;
end;
$$;

-- True-up after the real cost is known: delta = actual − reserved (may be
-- negative). Clamped at zero; missing row is a no-op.
create or replace function public.llm_settle_spend(p_delta numeric)
returns void
language sql
security definer
set search_path = public
as $$
  update daily_llm_spend
     set spent_usd = greatest(0, spent_usd + p_delta),
         updated_at = now()
   where user_id = auth.uid()
     and day = (now() at time zone 'utc')::date;
$$;

revoke all on function public.llm_reserve_budget(numeric, numeric) from public, anon;
revoke all on function public.llm_settle_spend(numeric) from public, anon;
grant execute on function public.llm_reserve_budget(numeric, numeric) to authenticated;
grant execute on function public.llm_settle_spend(numeric) to authenticated;
