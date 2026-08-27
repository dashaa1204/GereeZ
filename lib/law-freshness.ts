/**
 * Whether the law an audit was measured against has moved since.
 *
 * Two places need this answer and they used to be one place short of agreeing.
 * The notification feed asks it to tell the user their audit deserves a
 * re-check; the audit route asks it before handing a stored audit to another
 * contract, because reusing one the law has outrun would answer "re-check this
 * against the new law" with the reading it already had — and stamp it as
 * freshly audited, which switches the notification off for good.
 *
 * Free of server-only imports: pure comparison over what a summary carries.
 */

import { canonicalLawName } from "./contract-type";
import type { AuditSummary } from "./types/contract";

export interface LawMovement {
  law: string;
  /** When that law was last re-ingested, as epoch ms. */
  at: number;
}

/**
 * The laws an audit leaned on: the ones its findings cite, plus the ones
 * retrieval put in front of the model. Retrieved-but-uncited articles count —
 * they shaped the answer even where they produced no finding.
 */
export function lawsBehindAudit(
  summary: AuditSummary | null | undefined,
): Set<string> {
  const laws = new Set<string>();
  // Folded to the knowledge base's own names: audits stored before the audit
  // pipeline did that carry the model's decoration («… (Mongolian Civil
  // Code)») or a confusable letter, and those match no law update at all.
  // Names we don't recognise are kept as they are rather than dropped — an
  // unmatched name is a comparison that finds nothing, not a wrong one.
  for (const alert of summary?.alerts ?? []) {
    const name = alert.lawName?.trim();
    if (name) laws.add(canonicalLawName(name) ?? name);
  }
  for (const article of summary?.retrievedArticles ?? []) {
    const name = article.lawName?.trim();
    if (name) laws.add(canonicalLawName(name) ?? name);
  }
  return laws;
}

/**
 * The most recent law update that landed after this audit ran, or null when
 * the audit is still current — including when we cannot date it, which the
 * caller may not read as "current" (see `auditStillCurrent`).
 */
export function lawMovedSince(
  auditedAt: string | null | undefined,
  summary: AuditSummary | null | undefined,
  lawUpdatedAt: ReadonlyMap<string, string>,
): LawMovement | null {
  if (lawUpdatedAt.size === 0) return null;

  const ran = Date.parse(auditedAt ?? "");
  if (Number.isNaN(ran)) return null;

  let newest: LawMovement | null = null;
  for (const law of lawsBehindAudit(summary)) {
    const at = Date.parse(lawUpdatedAt.get(law) ?? "");
    if (Number.isNaN(at) || at <= ran) continue;
    if (!newest || at > newest.at) newest = { law, at };
  }
  return newest;
}

/**
 * True when a stored audit can still be handed to another contract as-is:
 * every law behind it is one nobody has re-ingested since it ran.
 *
 * Stricter than `lawMovedSince` in one place on purpose. An audit whose date
 * cannot be read is not provably current, and the cost of the two mistakes is
 * not symmetric: refusing to reuse it charges the user for an audit that
 * actually runs, while reusing it hands them an old reading of a law that has
 * changed and tells them it is new. With no law versions recorded at all
 * (migration 013 not run), nothing is known to have moved and reuse stands.
 */
export function auditStillCurrent(
  auditedAt: string | null | undefined,
  summary: AuditSummary | null | undefined,
  lawUpdatedAt: ReadonlyMap<string, string>,
): boolean {
  if (lawUpdatedAt.size === 0) return true;
  if (Number.isNaN(Date.parse(auditedAt ?? ""))) return false;
  return lawMovedSince(auditedAt, summary, lawUpdatedAt) === null;
}
