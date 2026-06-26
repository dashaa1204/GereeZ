-- Gereez: per-user ownership + Row Level Security for contracts
-- Every contract now belongs to an authenticated user. The previous
-- "public read" policy is removed so users can only see their own data.
-- API routes use the service-role client (bypasses RLS) and set user_id
-- explicitly; the dashboard reads through the user's cookie session, so RLS
-- scopes it to that user automatically.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- 1. Owner column. on delete cascade removes a user's contracts with the user.
alter table public.contracts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists contracts_user_id_idx on public.contracts (user_id);

-- 2. Drop the permissive public-read policy from migration 001.
drop policy if exists "Allow public read access on contracts" on public.contracts;

-- 3. Per-user policies — only the owner (authenticated) can touch their rows.
create policy "Users read own contracts"
  on public.contracts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own contracts"
  on public.contracts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own contracts"
  on public.contracts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own contracts"
  on public.contracts for delete
  to authenticated
  using (auth.uid() = user_id);
