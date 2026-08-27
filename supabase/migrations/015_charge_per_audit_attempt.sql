-- Gereez: charge per audit attempt, not per contract
--
-- `charge_credits` was idempotent on `credit_charges.contract_id`, which is
-- what made a retry after a failed audit free. It also made every later audit
-- of a paid contract free: the ledger already held a row for the contract, so
-- the charge was a no-op while the route went on to run OCR, retrieval and the
-- model again. The only thing bounding that was the 20/hour rate limit.
--
-- Retrying and re-running are different things, and the difference is not
-- whether the contract has been paid for — it is whether the previous attempt
-- delivered anything. A failure refunds, so the retry pays once in total. A
-- finished audit is not refunded, so running a fresh one pays again. The
-- ledger therefore keys on the attempt, and "free retry" stops being a
-- property of the primary key and becomes what it always meant: the refund.
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- ---------------------------------------------------------------------------
-- 1. One row per attempt. Existing rows are attempts too — they keep their
--    contract, user and amount, and get an id of their own.
-- ---------------------------------------------------------------------------
alter table public.credit_charges
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.credit_charges drop constraint if exists credit_charges_pkey;
alter table public.credit_charges add primary key (id);

-- Refunds and any later per-contract lookup read newest-first.
create index if not exists credit_charges_contract_idx
  on public.credit_charges (contract_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Charge: atomic, and no longer a no-op on an already-charged contract.
--    Locks the balance row, verifies funds, deducts, records the attempt.
--    Returns the resulting balance, or -1 when funds are insufficient.
--
--    Nothing here stops two concurrent audits of one contract from charging
--    twice. That is the audit route's job — it claims the contract row before
--    charging (compare-and-swap on `updated_at`) and refuses the loser — and
--    it has to be, because the thing worth preventing is the second AI run,
--    not just the second charge.
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
-- 3. Refund the contract's most recent charge — the attempt that just failed,
--    or the one a killed request left behind. Older attempts are settled: they
--    were paid for runs that finished, and a later failure does not give those
--    back. Returns the resulting balance, or null when there was nothing to
--    refund (an audit that failed before it charged).
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
    where id = (
      select id from public.credit_charges
        where contract_id = p_contract
        -- id breaks the tie: two attempts can share a timestamp.
        order by created_at desc, id desc
        limit 1
    )
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
