-- Unify Current State scale: all five metrics now 1..5.
-- Was: energy/mental_noise/body_state/focus 0..5, mood -5..+5.
-- Now: 1..5 across the board (simpler UX, consistent slider).

-- Linear remap of legacy mood (-5..+5) → 1..5, preserving direction:
--   -5 -> 1, 0 -> 3, +5 -> 5
update public.daily_checkins
set mood = greatest(1, least(5, round(((mood + 5)::numeric / 10) * 4 + 1)::int))
where mood is not null;

-- 0..5 cols → clamp 0 to 1.
update public.daily_checkins
set energy = 1 where energy = 0;
update public.daily_checkins
set mental_noise = 1 where mental_noise = 0;
update public.daily_checkins
set body_state = 1 where body_state = 0;
update public.daily_checkins
set focus = 1 where focus = 0;

-- Swap CHECK constraints.
alter table public.daily_checkins drop constraint if exists daily_checkins_energy_check;
alter table public.daily_checkins drop constraint if exists daily_checkins_mood_check;
alter table public.daily_checkins drop constraint if exists daily_checkins_mental_noise_check;
alter table public.daily_checkins drop constraint if exists daily_checkins_body_state_check;
alter table public.daily_checkins drop constraint if exists daily_checkins_focus_check;

alter table public.daily_checkins add constraint daily_checkins_energy_check       check (energy       between 1 and 5);
alter table public.daily_checkins add constraint daily_checkins_mood_check         check (mood         between 1 and 5);
alter table public.daily_checkins add constraint daily_checkins_mental_noise_check check (mental_noise between 1 and 5);
alter table public.daily_checkins add constraint daily_checkins_body_state_check   check (body_state   between 1 and 5);
alter table public.daily_checkins add constraint daily_checkins_focus_check        check (focus        between 1 and 5);
