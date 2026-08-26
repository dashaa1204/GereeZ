import { cache } from "react";
import { getReadAlertIds } from "./alerts";
import { resolveContractLabels } from "./contract-labels";
import { getDashboardData } from "./contracts";
import { getLawLastUpdated } from "./legal-articles";
import { buildAlerts, type AlertVM } from "./notifications";
import { getAuthenticatedUser } from "./supabase-server";
import { getBalance } from "./credits";
import {
  expiryLabel,
  getEndDate,
  getMetadata,
  getStartDate,
  getTrackStatus,
} from "./tracking";
import type { AuditAlert, Contract } from "./types/contract";

export type { AlertKind, AlertVM } from "./notifications";
export { ALERT_KIND_LABELS, buildAlerts } from "./notifications";

/** One audit finding in the shape the screens render. */
export interface AuditFinding {
  id: number;
  severity: "high" | "medium" | "low" | "info";
  clause: string;
  /** Combined citation for display, e.g. "Иргэний хууль 296 дүгээр зүйл". */
  article: string;
  /** Cited law name — used to look up the statute text. Null when absent. */
  lawName: string | null;
  /** Cited article reference — used to look up the statute text. Null when absent. */
  articleRef: string | null;
  explanation: string;
  /** AI's confidence the issue is real. Null on audits stored before this shipped. */
  confidenceLevel: "high" | "medium" | "low" | null;
}

/** A contract mapped from the real DB shape to what the app screens render. */
export interface ContractVM {
  id: string;
  /** Primary label — real contracts have no address, so use the file name. */
  label: string;
  /** Contract kind tag («Түрээсийн гэрээ», «Хамтран ажиллах гэрээ»…); null until audited. */
  typeLabel: string | null;
  tenant: string;
  /** What the contract calls the `tenant` party (Түрээслэгч, Ажилтан, Худалдан авагч…). */
  tenantLabel: string;
  landlord: string;
  /** What the contract calls the `landlord` party (Эзэмшигч, Ажил олгогч, Худалдагч…). */
  landlordLabel: string;
  rent: number | null;
  /** What the contract calls the `rent` amount (Сарын түрээс, Сарын цалин…). */
  rentLabel: string;
  deposit: number | null;
  startDate: string;
  endDate: string;
  payDay: number | null;
  score: number | null;
  status: "compliant" | "warning" | "risk" | "pending" | "failed";
  /** Audited (completed) contracts are "paid"/unlocked; others are locked. */
  paid: boolean;
  pages: number | null;
  summary: string | null;
  findings: AuditFinding[];
  strengths: string[];
  expiry: string | null;
  /** True when the end date is inside the expiry window the summary counts. */
  expiringSoon: boolean;
  /** True when the end date has already passed. */
  expired: boolean;
  /** True when the audit turned up at least one high-severity finding. */
  highRisk: boolean;
  /** Previously generated correction letter, or null if none saved yet. */
  proposal: string | null;
}

/**
 * Real data for the app screens (`components/app/`). Fetched server-side and
 * passed into the screen components, which fall back to dummy values when a
 * field is missing or the list is empty.
 */
export interface AppData {
  userName: string | null;
  userEmail: string | null;
  credits: number;
  activeCount: number;
  averageCompliance: number | null;
  expiringSoon: number;
  highRiskCount: number;
  contracts: ContractVM[];
  alerts: AlertVM[];
}

function mapAlert(a: AuditAlert, i: number): AuditFinding {
  const clause = a.contractClause ? `${a.contractClause} — ${a.title}` : a.title;
  const lawName = a.lawName?.trim() || null;
  const articleRef = a.articleReference?.trim() || null;
  const article = [lawName, articleRef].filter(Boolean).join(" ").trim() || "—";
  return {
    id: i,
    severity: a.severity,
    clause,
    article,
    lawName,
    articleRef,
    explanation: a.description,
    confidenceLevel: a.confidence ?? null,
  };
}

function statusOf(c: Contract): ContractVM["status"] {
  // A failed audit is not a contract still waiting its turn: it stops until the
  // user starts it again. Collapsing the two into "pending" left the list
  // telling them to wait for a run that had already given up.
  if (c.status === "failed") return "failed";
  if (c.status !== "completed" || c.compliance_score == null) return "pending";
  if (c.compliance_score >= 75) return "compliant";
  if (c.compliance_score >= 50) return "warning";
  return "risk";
}

export function mapContract(c: Contract): ContractVM {
  const meta = getMetadata(c);
  const labels = resolveContractLabels(meta, c.audit_summary?.contractType);
  return {
    id: c.id,
    label: c.file_name,
    typeLabel: labels.typeLabel,
    tenant: meta?.tenantName ?? "—",
    tenantLabel: labels.tenantLabel,
    landlord: meta?.landlordName ?? "—",
    landlordLabel: labels.landlordLabel,
    rent: meta?.monthlyRent ?? null,
    rentLabel: labels.rentLabel,
    deposit: meta?.deposit ?? null,
    startDate: getStartDate(c) ?? "—",
    endDate: getEndDate(c) ?? "—",
    payDay: meta?.paymentDay ?? null,
    score: c.compliance_score,
    status: statusOf(c),
    paid: c.status === "completed",
    pages: c.page_count,
    summary: c.audit_summary?.summary ?? null,
    findings: (c.audit_summary?.alerts ?? []).map(mapAlert),
    strengths: c.audit_summary?.strengths ?? [],
    expiry: expiryLabel(c),
    expiringSoon: getTrackStatus(c) === "expiring-soon",
    expired: getTrackStatus(c) === "expired",
    highRisk: (c.audit_summary?.alerts ?? []).some((a) => a.severity === "high"),
    proposal: c.audit_summary?.proposal ?? null,
  };
}

// Cached per request so the (app) layout (badge count) and the page within it
// share a single fetch.
export const loadAppData = cache(async (): Promise<AppData> => {
  const { contracts: rawContracts, metrics } = await getDashboardData();
  const expiringSoon = rawContracts.filter(
    (c) => getTrackStatus(c) === "expiring-soon",
  ).length;

  // getBalance/getReadAlertIds use the service-role client; never let a
  // missing env crash the page render — fall back to 0 credits, no user, and
  // nothing marked read.
  let credits = 0;
  let userName: string | null = null;
  let userEmail: string | null = null;
  let readIds: Set<string> = new Set();
  let signedIn = false;
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      signedIn = true;
      userEmail = user.email ?? null;
      // Prefer the profile name the user set; fall back to the email prefix.
      const fullName = user.user_metadata?.full_name;
      userName =
        (typeof fullName === "string" && fullName.trim()) ||
        user.email?.split("@")[0] ||
        null;
      [credits, readIds] = await Promise.all([
        getBalance(user.id),
        getReadAlertIds(user.id),
      ]);
    }
  } catch {
    credits = 0;
  }

  // Law-update alerts compare each audit against the last ingest of the law it
  // cited. Fails soft to an empty map, which simply produces no such alerts.
  const lawUpdatedAt = await getLawLastUpdated();

  return {
    userName,
    userEmail,
    credits,
    activeCount: metrics.activeCount,
    averageCompliance: metrics.averageCompliance,
    expiringSoon,
    highRiskCount: metrics.highRiskCount,
    contracts: rawContracts.map(mapContract),
    alerts: buildAlerts(rawContracts, {
      readIds,
      credits,
      lawUpdatedAt,
      signedIn,
    }),
  };
});
