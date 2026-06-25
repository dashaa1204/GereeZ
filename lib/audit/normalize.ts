import type { AuditResultSchema } from "./schema";

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

export function normalizeAuditResult(result: AuditResultSchema): AuditResultSchema {
  const rawAlerts = result.alerts.map((alert) => ({
    severity: alert.severity,
    title: sanitizeTextField(alert.title),
    description: sanitizeTextField(alert.description),
    lawName: alert.lawName?.trim() || "Иргэний хууль",
    articleReference: toMongolianArticleReference(alert.articleReference),
  }));

  const alerts = deduplicateAlerts(rawAlerts.filter((a) => a.title));

  return {
    complianceScore: computeComplianceScore(alerts),
    summary: sanitizeTextField(result.summary),
    strengths: result.strengths
      .map(sanitizeTextField)
      .filter(Boolean),
    alerts,
  };
}
