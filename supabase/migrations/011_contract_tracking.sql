-- Gereez: contract tracking (Phase 2 — "Track")
-- Adds the structured dates the audit now extracts so the tracking view can
-- sort by expiry and flag contracts that are ending soon. The full metadata
-- object (parties, rent, deposit, payment day) lives in audit_summary.metadata;
-- only the two dates are promoted to real columns for sorting/filtering and a
-- future reminder job.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

alter table public.contracts add column if not exists start_date date;
alter table public.contracts add column if not exists end_date date;

-- Drives "expiring soon" queries and the tracking view's sort order.
create index if not exists contracts_end_date_idx
  on public.contracts (end_date)
  where end_date is not null;
