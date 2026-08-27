/**
 * What an audit costs, and whether the user can pay for it.
 *
 * Lives apart from `lib/credits.ts` — which reaches the database and cannot be
 * imported by a screen — because the price is not only charged, it is quoted:
 * the upload flow, the contract list and the audit button all state it before
 * anything is spent. One rule, so the number a user is shown is the number the
 * ledger takes.
 */

/** Credits charged per audited page. Each page is one unit of AI cost. */
export const CREDITS_PER_PAGE = 1;

/**
 * Cost in credits to audit a contract of the given page count. A contract
 * whose page count is unknown or zero still costs a credit: something was
 * read, and the model was asked about it.
 */
export function auditCost(pageCount: number): number {
  return Math.max(1, pageCount) * CREDITS_PER_PAGE;
}

/**
 * Whether `credits` covers auditing a contract of `pages` pages.
 *
 * An unpriced contract — one that has never been quoted, so `pages` is null —
 * counts as affordable: the route prices it when it runs, and refusing to open
 * it beforehand would hide the audit behind a number nobody has computed yet.
 * The route still refuses with a 402 if the balance turns out to be short.
 */
export function canAffordAudit(
  pages: number | null | undefined,
  credits: number,
): boolean {
  if (pages == null) return true;
  return credits >= auditCost(pages);
}
