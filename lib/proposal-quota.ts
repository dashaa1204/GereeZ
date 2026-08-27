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

/**
 * The letter state a cached audit inherits from the audit it reuses.
 *
 * A cache hit is not a new audit — it is the source's audit, copied onto this
 * contract, and it is not charged for. Its letters come with it, spent ones
 * included: without that, re-uploading the same document would mint a fresh
 * allowance every time and turn "included with the audit" into an unlimited
 * supply of free model calls bought once.
 *
 * A paid re-run is the opposite case and must NOT call this — the user bought a
 * new audit, so it comes with new letters, and the old one is about findings
 * that have just been replaced.
 */
export function inheritedProposalState(
  source: AuditSummary | null | undefined,
): Pick<AuditSummary, "proposal" | "proposalRuns"> {
  if (!source) return {};
  return {
    ...(source.proposal ? { proposal: source.proposal } : {}),
    proposalRuns: proposalRunsUsed(source),
  };
}
