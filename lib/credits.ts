import { createAdminClient } from "./supabase-server";

/** Credits charged per audited page. Each page is one unit of AI cost. */
export const CREDITS_PER_PAGE = 1;

/** Credits added per demo recharge top-up. */
export const RECHARGE_AMOUNT = 100;

/** Cost in credits to audit a contract of the given page count. */
export function auditCost(pageCount: number): number {
  return Math.max(1, pageCount) * CREDITS_PER_PAGE;
}

/** Read a user's current credit balance (0 if they have no row yet). */
export async function getBalance(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getBalance failed:", error.message);
    return 0;
  }
  return data?.balance ?? 0;
}

export interface ChargeResult {
  /** True when the charge succeeded (or was already paid for). */
  ok: boolean;
  /** Resulting balance after the charge, or current balance when rejected. */
  balance: number;
}

/**
 * Atomically charge `amount` credits for `contractId` via the `charge_credits`
 * RPC. The charge is idempotent per contract — re-auditing never double-bills.
 * Returns `{ ok: false }` when the balance is insufficient.
 *
 * Unlike rate limiting, this does NOT fail open: if the RPC errors we refuse
 * the audit, because failing open here would give away paid AI work for free.
 */
export async function chargeCredits(
  userId: string,
  contractId: string,
  amount: number,
): Promise<ChargeResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("charge_credits", {
    p_user: userId,
    p_contract: contractId,
    p_amount: amount,
  });

  if (error) {
    console.error("chargeCredits failed:", error.message);
    return { ok: false, balance: 0 };
  }

  const balance = data as number;
  if (balance < 0) {
    // Sentinel from the RPC: insufficient funds. Report the real balance.
    return { ok: false, balance: await getBalance(userId) };
  }
  return { ok: true, balance };
}

/**
 * Refund a contract's charge so the user can retry for free. Used when an audit
 * fails after credits were already deducted. Safe to call when nothing was
 * charged (no-op).
 */
export async function refundCredits(contractId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refund_credits", {
    p_contract: contractId,
  });
  if (error) {
    console.error("refundCredits failed:", error.message);
  }
}

/** Demo-only: top a user's balance up for free. Returns the new balance. */
export async function rechargeCredits(
  userId: string,
  amount: number = RECHARGE_AMOUNT,
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("recharge_credits", {
    p_user: userId,
    p_amount: amount,
  });
  if (error) {
    console.error("rechargeCredits failed:", error.message);
    return getBalance(userId);
  }
  return data as number;
}
