import { citedArticleNumber } from "./citations";
import { canonicalLawName } from "@/lib/contract-type";
import { emptyContractMetadata, type AuditResultSchema } from "./schema";

const SEVERITY_DEDUCTIONS = {
  high: 10,
  medium: 5,
  low: 2,
  info: 0,
} as const;

/** Deterministic score from alert severities — same alerts always yield same score. */
export function computeComplianceScore(
  alerts: AuditResultSchema["alerts"],
): number {
  const deducted = alerts.reduce(
    (sum, alert) => sum + SEVERITY_DEDUCTIONS[alert.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - deducted));
}

const SEVERITY_RANK = { high: 3, medium: 2, low: 1, info: 0 } as const;

function alertDedupeKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Merge duplicate alerts; keep the highest severity per issue. */
function deduplicateAlerts(
  alerts: AuditResultSchema["alerts"],
): AuditResultSchema["alerts"] {
  const byKey = new Map<string, AuditResultSchema["alerts"][number]>();

  for (const alert of alerts) {
    const key = alertDedupeKey(alert.title);
    if (!key) continue;

    const existing = byKey.get(key);
    if (
      !existing ||
      SEVERITY_RANK[alert.severity] > SEVERITY_RANK[existing.severity]
    ) {
      byKey.set(key, alert);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (rankDiff !== 0) return rankDiff;
    return a.title.localeCompare(b.title, "mn");
  });
}

const ARTICLE_ENGLISH = /\bArticle\s+(\d+(?:\.\d+)?)\b/gi;
const AUTHORITY_ENGLISH = /\bAuthority\s+\d+\b/gi;
const RELEVANCE_ENGLISH = /\(relevance:\s*[\d.]+%\)/gi;

/** Strip accidental JSON / structured-output leaks from free text. */
function stripJsonArtifacts(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith("[{") || cleaned.startsWith('{"')) {
    return "";
  }

  const jsonTail = cleaned.search(/"\s*,\s*"(lawName|severity|articleReference|title)"/);
  if (jsonTail > 20) {
    cleaned = cleaned.slice(0, jsonTail).replace(/["\s,]+$/, "");
  }

  return cleaned.trim();
}

function toMongolianArticleReference(ref: string): string {
  let value = ref.trim();
  if (!value) return value;

  value = value.replace(ARTICLE_ENGLISH, (_, num: string) => `${num} дүгээр зүйл`);
  value = value.replace(AUTHORITY_ENGLISH, "");
  value = value.replace(RELEVANCE_ENGLISH, "");
  value = value.replace(/\b(relevance|article|section|clause)\b/gi, "");

  if (/^\d+(?:\.\d+)?$/.test(value)) {
    return `${value} дүгээр зүйл`;
  }

  if (/^\d+-\d+$/.test(value)) {
    const [start, end] = value.split("-");
    return `${start}–${end} дүгээр зүйлүүд`;
  }

  return value.replace(/\s{2,}/g, " ").trim();
}

function sanitizeTextField(text: string): string {
  const stripped = stripJsonArtifacts(text);
  return stripped
    .replace(ARTICLE_ENGLISH, (_, num: string) => `${num} дүгээр зүйл`)
    .replace(AUTHORITY_ENGLISH, "")
    .replace(RELEVANCE_ENGLISH, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const TERMINATION_KEYWORDS = ["цуцла", "мэдэгд", "дөтгнө", "чөлөөл", "дуусгах"];

/** Drop strengths that contradict high/medium alerts on the same topic. */
function filterStrengthsAgainstAlerts(
  strengths: string[],
  alerts: AuditResultSchema["alerts"],
): string[] {
  const riskyAlerts = alerts.filter(
    (alert) => alert.severity === "high" || alert.severity === "medium",
  );
  if (riskyAlerts.length === 0) return strengths;

  const alertText = riskyAlerts
    .map(
      (alert) =>
        `${alert.title} ${alert.description} ${alert.contractClause ?? ""}`,
    )
    .join(" ")
    .toLowerCase();

  const alertHasTerminationTopic = TERMINATION_KEYWORDS.some((keyword) =>
    alertText.includes(keyword),
  );

  return strengths.filter((strength) => {
    const normalized = strength.toLowerCase();
    const strengthHasTerminationTopic = TERMINATION_KEYWORDS.some((keyword) =>
      normalized.includes(keyword),
    );

    if (alertHasTerminationTopic && strengthHasTerminationTopic) {
      const tenantObligation =
        normalized.includes("түрээслэгч") &&
        (normalized.includes("үүрэг") ||
          normalized.includes("хүлээ") ||
          normalized.includes("мэдэгд"));

      if (tenantObligation) return false;
    }

    for (const alert of riskyAlerts) {
      const clause = alert.contractClause?.trim();
      if (clause && clause.length >= 3 && strength.includes(clause)) {
        return false;
      }
    }

    return true;
  });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep a YYYY-MM-DD that is also a real calendar date; otherwise null. */
function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject overflow like 2024-02-31 that Date silently rolls forward.
  return parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

/** Clamp a positive amount; drop zero/negative/non-finite to null. */
function normalizeAmount(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

// A party/payment label is one to a few words; anything longer is the model
// paraphrasing a clause, which reads worse in the UI than the type fallback.
const MAX_LABEL_LENGTH = 40;

/** Short display label: trimmed, no wrapping quotes/colon; null when empty or runaway. */
function normalizeLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value
    .replace(/^[«"'\s]+|[»"':：\s]+$/g, "")
    .replace(/\s{2,}/g, " ");
  if (!trimmed || trimmed.length > MAX_LABEL_LENGTH) return null;
  return trimmed;
}

/** Validate AI-extracted facts: real dates, positive amounts, sane payment day. */
function normalizeMetadata(
  metadata: AuditResultSchema["metadata"] | undefined,
): AuditResultSchema["metadata"] {
  if (!metadata) return emptyContractMetadata();

  const paymentDay =
    metadata.paymentDay != null &&
    Number.isInteger(metadata.paymentDay) &&
    metadata.paymentDay >= 1 &&
    metadata.paymentDay <= 31
      ? metadata.paymentDay
      : null;

  // A notice period is a handful of days to a few months; anything larger is
  // the model misreading a term length as a notice requirement.
  const noticePeriodDays =
    metadata.noticePeriodDays != null &&
    Number.isInteger(metadata.noticePeriodDays) &&
    metadata.noticePeriodDays >= 1 &&
    metadata.noticePeriodDays <= 180
      ? metadata.noticePeriodDays
      : null;

  return {
    tenantName: metadata.tenantName?.trim() || null,
    landlordName: metadata.landlordName?.trim() || null,
    monthlyRent: normalizeAmount(metadata.monthlyRent),
    deposit: normalizeAmount(metadata.deposit),
    startDate: normalizeDate(metadata.startDate),
    endDate: normalizeDate(metadata.endDate),
    paymentDay,
    noticePeriodDays,
    contractTitle: normalizeLabel(metadata.contractTitle),
    tenantLabel: normalizeLabel(metadata.tenantLabel),
    landlordLabel: normalizeLabel(metadata.landlordLabel),
    paymentLabel: normalizeLabel(metadata.paymentLabel),
  };
}

export function normalizeAuditResult(
  result: AuditResultSchema,
  fallbackLawName = "Иргэний хууль",
): AuditResultSchema {
  const rawAlerts = result.alerts.map((alert) => {
    // The name is a join key (see `canonicalLawName`), so what the model wrote
    // is only kept when it names a law we actually hold. Anything else — a
    // gloss, a confusable letter, an invention — becomes the law this audit was
    // run against, so the finding is still measured against a law when that one
    // is amended.
    const named = canonicalLawName(alert.lawName);

    // …but an unrecognised name is evidence about the citation, not only about
    // the label. Retrieval put one law in front of the model, named in the
    // prompt, and this is not it — so the article number beside it did not come
    // from that context. Carrying it over to the audited law would point the
    // statute panel at whatever article happens to hold that number there, and
    // print the wrong law's text under the finding, which is the mistake
    // ./citations exists to prevent. The finding keeps its canonical join key
    // and loses the reference, exactly the trade `groundCitations` makes below.
    const offLaw = !named && Boolean(alert.lawName?.trim());
    const articleReference = toMongolianArticleReference(alert.articleReference);
    if (offLaw && articleReference) {
      console.warn(
        `Off-law citation dropped: ${alert.lawName} ${articleReference} (${alert.title})`,
      );
    }

    return {
      severity: alert.severity,
      // Only a citation actually dropped costs confidence. A finding that never
      // carried one is capped later (see `capUncitedConfidence`), which is a
      // gentler rule and the right one for an observation about the contract
      // text that names no statute in the first place.
      confidence:
        offLaw && articleReference ? ("low" as const) : alert.confidence,
      title: sanitizeTextField(alert.title),
      description: sanitizeTextField(alert.description),
      contractClause: sanitizeTextField(alert.contractClause ?? ""),
      lawName: named ?? fallbackLawName,
      articleReference: offLaw ? "" : articleReference,
    };
  });

  const alerts = deduplicateAlerts(rawAlerts.filter((a) => a.title));
  const strengths = filterStrengthsAgainstAlerts(
    result.strengths.map(sanitizeTextField).filter(Boolean),
    alerts,
  );

  return {
    complianceScore: computeComplianceScore(alerts),
    summary: sanitizeTextField(result.summary),
    strengths,
    alerts,
    metadata: normalizeMetadata(result.metadata),
  };
}

/**
 * Drop citations the retrieval step never supplied.
 *
 * The prompt tells the model to cite only from the context it was given, but a
 * rule in a prompt is not a guarantee — and an article number the user cannot
 * look up is worse than no number, because the finding card renders it as if it
 * were sourced. The finding itself survives (the risk it describes can be real
 * even when the citation is not); it loses the reference and drops to low
 * confidence, which is what "we could not source this" honestly looks like.
 */
export function groundCitations(
  alerts: AuditResultSchema["alerts"],
  retrievedArticles: Set<string>,
): AuditResultSchema["alerts"] {
  return alerts.map((alert) => {
    const cited = citedArticleNumber(alert.articleReference);
    if (!cited || retrievedArticles.has(cited)) return alert;

    console.warn(
      `Ungrounded citation dropped: ${alert.articleReference} (${alert.title})`,
    );
    return { ...alert, articleReference: "", confidence: "low" as const };
  });
}
