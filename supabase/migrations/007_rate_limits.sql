-- Gereez: lightweight per-user rate limiting (DB-backed, no Redis needed)
-- The audit endpoint calls a paid AI provider, so a malicious or buggy client
-- could rack up cost or cause a DoS. This table + RPC caps how many actions a
-- given subject (user id) may perform inside a rolling time window.
-- Only the service-role client (API routes) touches this table.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  bucket text not null,          -- logical action, e.g. 'audit' or 'upload'
  subject text not null,         -- who is acting (user id)
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (bucket, subject, created_at desc);

alter table public.rate_limits enable row level security;
-- No policies on purpose: anon/authenticated roles get no access; the
-- service-role client used by API routes bypasses RLS.

-- Atomic-ish check-and-record. Prunes this subject's expired entries, counts
-- what remains in the window, and records the new hit only when under the cap.
-- Returns true when the action is allowed, false when rate limited.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  delete from public.rate_limits
    where bucket = p_bucket
      and subject = p_subject
      and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
    from public.rate_limits
    where bucket = p_bucket
      and subject = p_subject;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limits (bucket, subject)
    values (p_bucket, p_subject);

  return true;
end;
$$;
