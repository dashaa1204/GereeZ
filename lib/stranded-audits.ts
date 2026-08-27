import { refundCredits } from "./credits";
import { createAdminClient } from "./supabase-server";
import type { Contract } from "./types/contract";

/**
 * Repair for audits that died mid-flight.
 *
 * The audit route charges credits, runs the AI, and refunds on every way out —
 * but only for failures it lives to see. A platform timeout (the route caps at
 * 300s, and OCR plus rate-limit backoff can approach it) kills the request
 * instead: the row is left in `processing`, the credits are spent, and the code
 * that would have refunded them is the code that just died. Nothing in the app
 * writes to that row again, so the repair has to happen the next time we read
 * it — which is what this module does, from the dashboard's own fetch.
 *
 * The audit route stamps `updated_at` when it starts, so the clock below
 * measures the audit rather than the upload.
 */

/**
 * How long a `processing` row can still have a request behind it.
 *
 * The route caps itself at `maxDuration = 300s`, so past that — plus a margin
 * for the platform to tear the request down — nothing is running, whatever the
 * row says. That one fact answers two questions: whose credits are owed back
 * (here), and whether a second audit on the same contract would collide with a
 * live one or merely take over a dead one (`app/api/contracts/audit`).
 */
export const AUDIT_MAX_RUNTIME_MS = 6 * 60 * 1000;

/** True when this row's audit request is gone and its credits are owed back. */
export function isStrandedAudit(
  contract: Contract,
  now: number = Date.now(),
): boolean {
  if (contract.status !== "processing") return false;
  const startedAt = Date.parse(contract.updated_at ?? "");
  if (Number.isNaN(startedAt)) return false;
  return now - startedAt >= AUDIT_MAX_RUNTIME_MS;
}

/**
 * Refund and fail every stranded audit in `contracts`, returning the list with
 * those rows corrected so the caller renders what the database now holds.
 *
 * Does nothing (and issues no queries) when nothing is stranded, which is the
 * normal case — this sits on a read path and must stay free when idle. It never
 * throws: a failed repair is worth logging, not worth failing a page render.
 */
export async function recoverStrandedAudits(
  contracts: Contract[],
): Promise<Contract[]> {
  const stranded = contracts.filter((c) => isStrandedAudit(c));
  if (stranded.length === 0) return contracts;

  const supabase = createAdminClient();
  const healed = new Map<string, Contract>();

  for (const contract of stranded) {
    try {
      const updatedAt = new Date().toISOString();
      // Claim the row first, and only if it is still `processing`. Whoever
      // wins that update owns the refund — so a request that finished in the
      // meantime keeps both its result and the credits it paid for.
      const { data: claimed, error } = await supabase
        .from("contracts")
        .update({ status: "failed", updated_at: updatedAt })
        .eq("id", contract.id)
        .eq("status", "processing")
        .select("id");

      if (error) {
        console.error("recoverStrandedAudits: claim failed:", error.message);
        continue;
      }
      if (!claimed || claimed.length === 0) continue;

      await refundCredits(contract.id);
      healed.set(contract.id, {
        ...contract,
        status: "failed",
        updated_at: updatedAt,
      });
    } catch (error) {
      console.error("recoverStrandedAudits failed:", error);
    }
  }

  if (healed.size === 0) return contracts;
  return contracts.map((c) => healed.get(c.id) ?? c);
}
