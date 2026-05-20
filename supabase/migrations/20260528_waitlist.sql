-- Public waitlist for the Shadow landing page.
--
-- Anyone (anon) can INSERT a single row.
-- Nobody (not even authenticated users) can SELECT/UPDATE/DELETE via PostgREST.
-- Admin reads happen via the Supabase dashboard / service_role only.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,
  user_agent  text,
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  created_at  timestamptz not null default now(),
  -- Soft uniqueness: same email can submit again, dedup in admin views.
  constraint waitlist_email_format check (position('@' in email) > 1 and length(email) between 5 and 320)
);

create index if not exists waitlist_created_at_idx on public.waitlist (created_at desc);
create index if not exists waitlist_email_idx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

-- Anonymous + authenticated may insert. No select / update / delete granted.
drop policy if exists waitlist_anon_insert on public.waitlist;
create policy waitlist_anon_insert
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

comment on table  public.waitlist is 'Public waitlist signups from shadowwwLanding. Anon insert-only; admin reads via dashboard.';
comment on column public.waitlist.source is 'CTA origin: hero_primary | nav | cta_scene_primary | sticky | other.';
