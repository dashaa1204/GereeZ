-- Gereez: persist alert read-state
-- Alerts themselves are derived on the fly (compliance alerts from
-- audit_summary, expiry alerts from contract dates), so only the read marks
-- need storage. One row per (user, alert id); alert ids are the stable string
-- ids built in lib/notifications.ts — each one about a contract carries that
-- contract's id, which is how the marks are dropped when it is deleted.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.alert_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, alert_id)
);

alter table public.alert_reads enable row level security;

-- Users may read their own marks (display); writes go through the
-- service-role client in the API route.
drop policy if exists "read own alert reads" on public.alert_reads;
create policy "read own alert reads"
  on public.alert_reads for select
  using (auth.uid() = user_id);
