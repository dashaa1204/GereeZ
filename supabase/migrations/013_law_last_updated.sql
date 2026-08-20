-- Gereez: expose when each law was last ingested
-- The notification feed warns a user when a law their audit cited has been
-- re-ingested since the audit ran (lawUpdateAlerts in lib/notifications.ts).
-- ingestLegalText replaces a law's rows wholesale, so max(created_at) per
-- law_name is that law's current version stamp.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create or replace function public.law_last_updated()
returns table (law_name text, last_updated timestamptz)
language sql
stable
set search_path = public
as $$
  select ld.law_name, max(ld.created_at) as last_updated
  from public.legal_documents ld
  group by ld.law_name;
$$;
