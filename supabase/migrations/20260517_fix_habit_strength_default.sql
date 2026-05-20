-- Fix: new habits should start with strength_score = 0, not 50.
-- Reset any habit whose strength_score = 50 and has no logs yet.

update public.habits h
set strength_score = 0
where h.strength_score = 50
  and not exists (
    select 1 from public.habit_logs l where l.habit_id = h.id
  );

-- Also update column default going forward.
alter table public.habits
  alter column strength_score set default 0;
