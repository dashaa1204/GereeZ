-- Gereez: credit-based pay-per-audit flow
-- Replaces the old hard page/char caps with a quote → confirm → pay gate.
-- Each audited page costs 1 credit; new users are granted a starting balance,
-- and a demo "recharge" tops them up for free (no real payment provider).
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- ---------------------------------------------------------------------------
-- Balance store: one row per user. Only the service-role client mutates it;
-- users may read their own balance for display.
-- ---------------------------------------------------------------------------
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

drop policy if exists "read own credits" on public.user_credits;
create policy "read own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Charge ledger keyed by contract. The primary key makes a charge idempotent:
-- re-running the audit for the same contract never double-deducts.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_charges (
  contract_id uuid primary key references public.contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.credit_charges enable row level security;
-- No policies on purpose: only the service-role client (API routes) touches it.

-- Cache the page count from the quote step so the confirm gate and any later
-- display don't have to re-parse the file.
alter table public.contracts add column if not exists page_count integer;

-- ---------------------------------------------------------------------------
-- Grant starting credits to every new user on signup, and backfill anyone who
-- already exists (the trigger only fires on future inserts).
-- ---------------------------------------------------------------------------
create or replace function public.grant_initial_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 100)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_credits on auth.users;
create trigger on_auth_user_created_grant_credits
  after insert on auth.users
  for each row execute function public.grant_initial_credits();

insert into public.user_credits (user_id, balance)
select id, 100 from auth.users
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Atomic, idempotent charge. Locks the balance row, verifies funds, deducts,
-- and records the ledger entry in one transaction.
-- Returns the resulting balance on success, or -1 when funds are insufficient.
-- Re-charging an already-charged contract is a no-op that returns the balance.
-- ---------------------------------------------------------------------------
create or replace function public.charge_credits(
  p_user uuid,
  p_contract uuid,
  p_amount integer
) returns integer
language plpgsql
as $$
declare
  v_balance integer;
begin
  -- Idempotency: this contract was already paid for.
  if exists (select 1 from public.credit_charges where contract_id = p_contract) then
    select balance into v_balance from public.user_credits where user_id = p_user;
    return coalesce(v_balance, 0);
  end if;

  -- Lock the balance row for the duration of the transaction.
  select balance into v_balance from public.user_credits
    where user_id = p_user
    for update;

  if v_balance is null then
    -- Defensive: ensure a row exists for users created before the trigger.
    insert into public.user_credits (user_id, balance) values (p_user, 0)
      on conflict (user_id) do nothing;
    v_balance := 0;
  end if;

  if v_balance < p_amount then
    return -1; -- insufficient funds; caller rejects without auditing
  end if;

  update public.user_credits
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user;

  insert into public.credit_charges (contract_id, user_id, amount)
    values (p_contract, p_user, p_amount);

  return v_balance - p_amount;
end;
$$;

-- ---------------------------------------------------------------------------
-- Refund a contract's charge (deletes the ledger row and restores the balance).
-- Used when an audit fails after the charge so the user can retry for free.
-- Returns the resulting balance.
-- ---------------------------------------------------------------------------
create or replace function public.refund_credits(
  p_contract uuid
) returns integer
language plpgsql
as $$
declare
  v_user uuid;
  v_amount integer;
  v_balance integer;
begin
  delete from public.credit_charges
    where contract_id = p_contract
    returning user_id, amount into v_user, v_amount;

  if v_user is null then
    return null; -- nothing to refund
  end if;

  update public.user_credits
    set balance = balance + v_amount, updated_at = now()
    where user_id = v_user
    returning balance into v_balance;

  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- Demo-only recharge: add credits for free (no payment provider). Creates the
-- row if missing. Returns the resulting balance.
-- ---------------------------------------------------------------------------
create or replace function public.recharge_credits(
  p_user uuid,
  p_amount integer
) returns integer
language plpgsql
as $$
declare
  v_balance integer;
begin
  insert into public.user_credits (user_id, balance)
  values (p_user, p_amount)
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        updated_at = now();

  select balance into v_balance from public.user_credits where user_id = p_user;
  return v_balance;
end;
$$;
