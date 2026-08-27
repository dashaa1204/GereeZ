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

/**
 * The two sentences under the run button. They differ because what the run
 * costs — in credits and in what it overwrites — differs.
 *
 * `retry` was already refunded, so it spends its second sentence on the price
 * rather than repeating a promise the user just saw kept. `fresh` promises the
 * refund. `rerun` says what it replaces: a finished audit is overwritten by the
 * new one, and the correction letter written from it goes with it. Saying "the
 * previous result is kept" — which this used to — is only true of a re-run that
 * fails.
 */
export function auditRunHint(
  mode: AuditRunMode,
  { price, hasProposal = false }: { price: number | null; hasProposal?: boolean },
): string {
  const cost = price != null ? `${price} кредит зарцуулна.` : null;
  const replaces = hasProposal
    ? "Шинэ дүн өмнөх дүн, хадгалсан захидлыг орлоно."
    : "Шинэ дүн өмнөх дүнг орлоно.";

  const sentences = {
    retry: ["Өмнөх оролдлогын кредит буцаагдсан.", cost],
    fresh: [cost, "Амжилтгүй бол кредит буцаана."],
    rerun: [replaces, cost ?? "Хуудас тутамд кредит дахин зарцуулна."],
  }[mode];

  return sentences.filter(Boolean).join(" ");
}

/**
 * Which card the contract list draws for a contract.
 *
 * A delivered audit outranks a later failure. Without that, re-running an audit
 * and having the run fail replaced a perfectly good result with a failure card,
 * and the score the user paid for vanished from the list — it was still on the
 * contract page, but the list said it was gone. The failure is worth saying;
 * it is not worth hiding the audit behind.
 */
export type ContractCardState = "failed" | "unaudited" | "result";

export function contractCardState(
  contract: Pick<ContractVM, "status" | "score">,
): ContractCardState {
  if (contract.score != null) return "result";
  if (contract.status === "failed") return "failed";
  return "unaudited";
}
