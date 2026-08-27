/**
 * How many correction letters an audit's charge covers.
 *
 * The letter is not billed on its own: the landing page lists it among the
 * things every audit includes, and charging again at the moment the audit
 * finally becomes actionable would be a second price for the thing the first
 * one promised. "Included" only means something, though, if it is bounded —
 * `generateCorrectionProposal` is a full model call, and a letter that can be
 * regenerated forever is an unmetered AI bill hanging off a one-credit audit.
 *
 * So the audit buys a fixed number of runs on its own contract: the first
 * draft, plus room to rewrite it when the draft comes out wrong. Once they are
 * spent the saved letter stays readable and copyable — what runs out is the
 * model calls, not the result the user paid for.
 *
 * Kept free of server-only imports: the client card and the landing copy read
 * these too.
 */

import type { AuditSummary } from "./types/contract";

/** Letter generations covered by one audit, on that audit's contract. */
export const PROPOSAL_RUNS_PER_AUDIT = 3;

/**
 * Runs already spent on this contract.
 *
 * Letters saved before the counter shipped carry no count — a stored letter is
 * proof of exactly one run, so read it as one rather than handing those
 * contracts a fresh budget.
 */
export function proposalRunsUsed(summary: AuditSummary | null): number {
  if (!summary) return 0;
  if (typeof summary.proposalRuns === "number") {
    return Math.max(0, summary.proposalRuns);
  }
  return summary.proposal ? 1 : 0;
}

/** Runs left on this contract's audit; never negative. */
export function proposalRunsLeft(summary: AuditSummary | null): number {
  return Math.max(0, PROPOSAL_RUNS_PER_AUDIT - proposalRunsUsed(summary));
}
