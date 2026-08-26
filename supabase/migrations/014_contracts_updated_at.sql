-- Gereez: stamp contracts.updated_at automatically, and record when an audit ran
--
-- `updated_at` was set by the insert default and then only ever written by hand,
-- so every write that forgot left it frozen at the upload time. Two features
-- read it and were quietly wrong because of that: the notification feed dates a
-- failed audit from it (a repeat failure kept the same alert id, so once the
-- user marked it read the next failure was silent), and the stranded-audit
-- sweep measures staleness with it.
--
-- A trigger is what makes the stamp unforgettable — including for writes this
-- app hasn't grown yet.
--
-- That leaves one reader needing a column of its own. `lawUpdateAlerts`
-- (lib/notifications.ts) treats `updated_at` as "when the audit ran" to decide
-- whether the cited law moved underneath it. That reading only holds while
-- nothing else writes to the row — and saving a correction letter, or caching a
-- page count, both do. So the audit time stops borrowing a column that is about
-- to start moving.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- 1. When the audit finished, as opposed to when the row last changed.
alter table public.contracts add column if not exists audited_at timestamptz;

-- 2. Backfill before the trigger exists: for an already-audited contract the
--    last write *was* the audit, because nothing else wrote to these rows.
update public.contracts
  set audited_at = updated_at
  where status = 'completed' and audited_at is null;

-- 3. Every update from here on stamps the column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();
