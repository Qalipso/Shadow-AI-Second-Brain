-- Reference tables (life_areas, question_bank) are global data with no PII.
-- Allow `anon` role to read so unauthenticated home/login pages and SSR
-- without a session can still fetch the 12 areas + question bank.

drop policy if exists life_areas_read on public.life_areas;
create policy life_areas_read on public.life_areas
  for select to anon, authenticated using (true);

drop policy if exists question_bank_read on public.question_bank;
create policy question_bank_read on public.question_bank
  for select to anon, authenticated using (is_active = true);
