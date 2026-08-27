/**
 * Which audit run a contract's button is offering, and what it costs.
 *
 * Lives apart from `view-models` because the screens are client components:
 * that module reaches Supabase on the server, and importing a value from it
 * would drag `next/headers` into the browser bundle. The type import below is
 * erased at compile time, so it costs nothing.
 */

import type { ContractVM } from "./view-models";

/**
 * Which of the three audit runs the button on a contract is offering.
 *
 * They cost different things, so they cannot say the same thing. A `retry`
 * follows a failure, and a failure refunds — the user is charged once across
 * both attempts. A `rerun` follows a finished audit that was never refunded,
 * so it is a second audit at full price; the law-update alert invites exactly
 * this, and it must not read as if it were free. `fresh` is the first run on a
 * contract that has never been audited.
 *
 * Failure comes first: a re-run that failed leaves the old score in place, and
 * what the user does next is still a retry of the attempt that just broke.
 */
export type AuditRunMode = "fresh" | "retry" | "rerun";

export function auditRunMode(
  contract: Pick<ContractVM, "status" | "score">,
): AuditRunMode {
  if (contract.status === "failed") return "retry";
  return contract.score == null ? "fresh" : "rerun";
}
