import { embedText } from "@/lib/embeddings";
import {
  fetchArticleEmbeddings,
  type LegalDocumentMatch,
} from "@/lib/vector-store";
import type { AuditResultSchema } from "./schema";

type Alert = AuditResultSchema["alerts"][number];

/**
 * How far down the relevance ranking a cited article may sit and still count
 * as supporting the finding.
 *
 * Membership in the retrieved set is not enough on its own: the whole lease
 * chapter is pinned for rental contracts, so *any* citation between 287 and 301
 * passes a "was it retrieved" test — including the one that put «299 Хөлслөгч
 * эзэмшлээ хамгаалах эрх» under a finding about deposit-return deadlines.
 *
 * An absolute similarity threshold does not separate those cases (a wrong
 * article scores 0.63 where a right one scores 0.65), but the ranking does.
 * Measured over three audits of the same contract, 27 candidate articles,
 * scoring each article by its best chunk against the finding's title and
 * description:
 *
 *   sound citations    1 ×12, 2 ×1, 8 ×1
 *   misattributed      3, 4, 10, 11, 14, 18, 19, 21
 *
 * Five sits in the widest empty stretch of that distribution. It costs the odd
 * sound citation that drifts (the lone 8), which is the error worth making:
 * a finding with no article attached is honest, a finding under statute text
 * that does not mention its subject is the bug this exists to prevent.
 */
export const MAX_CITATION_RANK = 5;

/** First number in a citation — "296.1 дүгээр зүйл" → "296". */
export function citedArticleNumber(articleReference: string): string | null {
  const match = articleReference.match(/\d{1,3}/);
  return match ? match[0] : null;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/**
 * Strip citations whose article is not among the closest matches to the
 * finding's own text.
 *
 * `rankings` maps an alert's index to the candidate article numbers ordered
 * best-first. An alert with no ranking (no citation, or a verification that
 * could not run) is passed through untouched — the check only ever removes a
 * claim it has evidence against, never adds one.
 */
/**
 * A finding with no statute behind it cannot claim high confidence.
 *
 * The schema defines confidence as how firmly the finding rests on a legal
 * source ("high" only when it clearly does), so «Өндөр итгэл» on a card with no
 * article is the same overclaim as a citation that does not match its statute.
 * Medium, not low: the observation itself can still be plainly true of the
 * contract text — it is the legal conclusion that is unsourced.
 */
export function capUncitedConfidence(alerts: Alert[]): Alert[] {
  return alerts.map((alert) =>
    alert.articleReference || alert.confidence !== "high"
      ? alert
      : { ...alert, confidence: "medium" as const },
  );
}

export function applyCitationRanking(
  alerts: Alert[],
  rankings: Map<number, string[]>,
): Alert[] {
  return alerts.map((alert, index) => {
    const ranked = rankings.get(index);
    if (!ranked) return alert;

    const cited = citedArticleNumber(alert.articleReference);
    if (!cited) return alert;

    const rank = ranked.indexOf(cited) + 1;
    if (rank >= 1 && rank <= MAX_CITATION_RANK) return alert;

    console.warn(
      `Unsupported citation dropped: ${alert.articleReference} ranked ${
        rank || "unranked"
      }/${ranked.length} for "${alert.title}"`,
    );
    return { ...alert, articleReference: "", confidence: "low" as const };
  });
}

/**
 * Check each cited article against the finding it is attached to, and drop the
 * citation when the article's own text is not among the closest matches.
 *
 * Costs one embedding call per cited finding; the law's vectors come from the
 * ingest already stored in `legal_documents`. Any failure leaves the alerts
 * exactly as they were — an unverifiable citation keeps whatever grounding the
 * earlier retrieval-membership check gave it.
 */
export async function verifyCitationRelevance(
  alerts: Alert[],
  matches: LegalDocumentMatch[],
): Promise<Alert[]> {
  const lawName = matches[0]?.law_name;
  const candidates = [
    ...new Set(
      matches
        .map((match) => match.article_number)
        .filter((n): n is string => Boolean(n)),
    ),
  ];
  if (!lawName || candidates.length === 0) return capUncitedConfidence(alerts);

  let embeddings: Map<string, number[][]>;
  try {
    embeddings = await fetchArticleEmbeddings(lawName, candidates);
  } catch (error) {
    console.warn(
      "Citation verification skipped:",
      error instanceof Error ? error.message : error,
    );
    return capUncitedConfidence(alerts);
  }
  if (embeddings.size === 0) return capUncitedConfidence(alerts);

  const rankings = new Map<number, string[]>();

  for (const [index, alert] of alerts.entries()) {
    if (!citedArticleNumber(alert.articleReference)) continue;

    let finding: number[];
    try {
      // Title and description together: the title alone is too terse to rank
      // reliably (a sound citation lands at rank 10 on title text that ranks 1
      // once the description is included).
      finding = await embedText(`${alert.title}. ${alert.description}`);
    } catch (error) {
      console.warn(
        "Citation verification skipped for a finding:",
        error instanceof Error ? error.message : error,
      );
      continue;
    }

    const scored: Array<[string, number]> = [];
    for (const [article, chunks] of embeddings) {
      // An article is as relevant as its best-matching chunk: a long article
      // split into parts should not be penalised for its off-topic half.
      scored.push([
        article,
        Math.max(...chunks.map((chunk) => cosine(finding, chunk))),
      ]);
    }

    rankings.set(
      index,
      scored.sort((a, b) => b[1] - a[1]).map(([article]) => article),
    );
  }

  return applyCitationRanking(alerts, rankings);
}
