import { cache } from "react";
import { getReadAlertIds } from "./alerts";
import { resolveContractLabels } from "./contract-labels";
import { getDashboardData, type DashboardAlert } from "./contracts";
import { getAuthenticatedUser } from "./supabase-server";
import { getBalance } from "./credits";
import {
  expiryLabel,
  formatDateMn,
  getEndDate,
  getMetadata,
  getStartDate,
  getTrackStatus,
} from "./tracking";
import type { AlertSeverity, AuditAlert, Contract } from "./types/contract";

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
  status: "compliant" | "warning" | "risk" | "pending";
  /** Audited (completed) contracts are "paid"/unlocked; others are locked. */
  paid: boolean;
  pages: number | null;
  summary: string | null;
  findings: AuditFinding[];
  strengths: string[];
  expiry: string | null;
}

/** A notification mapped to what the alerts screen renders. */
export interface AlertVM {
  /** Stable id used as the React key and for marking-as-read. */
  id: string;
  type: "compliance" | "expiry";
  severity: AlertSeverity;
  /** Contract this alert belongs to (file name — real contracts have no address). */
  contractName: string;
  title: string;
  body: string;
  /** ISO `YYYY-MM-DD`; formatted for display in the UI. Empty when unknown. */
  date: string;
  read: boolean;
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
  };
}

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

/**
 * Build the alerts feed from two real sources: per-clause compliance alerts
 * (already severity-sorted by `getDashboardData`) and expiry alerts derived
 * from each contract's tracking status. Read-state comes from the
 * `alert_reads` table (see lib/alerts.ts), keyed by the ids built here — so
 * the ids must stay stable across requests for a given audit result.
 */
export function buildAlerts(
  contracts: Contract[],
  dashboardAlerts: DashboardAlert[],
  readIds: ReadonlySet<string> = new Set(),
): AlertVM[] {
  // Compliance alerts carry no per-alert timestamp; use the contract's last
  // update (when the audit completed) as the alert date.
  const dateById = new Map(
    contracts.map((c) => [c.id, c.updated_at?.slice(0, 10) ?? ""]),
  );

  // Number alerts within their own contract, not across the whole feed:
  // another contract's audit must not shift these ids (that would corrupt
  // persisted read marks). Re-auditing a contract may reorder its own alerts —
  // acceptable, new findings deserve to show as unread.
  const perContractSeq = new Map<string, number>();
  const compliance: AlertVM[] = dashboardAlerts.map((a) => {
    const seq = perContractSeq.get(a.contractId) ?? 0;
    perContractSeq.set(a.contractId, seq + 1);
    const id = `c-${a.contractId}-${seq}`;
    return {
      id,
      type: "compliance",
      severity: a.severity,
      contractName: a.contractName,
      title: a.title,
      body: a.description,
      date: dateById.get(a.contractId) ?? "",
      read: readIds.has(id),
    };
  });

  const expiry: AlertVM[] = [];
  for (const c of contracts) {
    const status = getTrackStatus(c);
    if (status !== "expiring-soon" && status !== "expired") continue;
    const end = getEndDate(c);
    const endLabel = formatDateMn(end) ?? end ?? "—";
    const expired = status === "expired";
    // The status is part of the id so the escalation from "expiring soon" to
    // "expired" surfaces as a fresh unread alert.
    const id = `e-${c.id}-${status}`;
    expiry.push({
      id,
      type: "expiry",
      severity: expired ? "high" : "medium",
      contractName: c.file_name,
      title: expired ? "Гэрээний хугацаа дууссан" : "Гэрээ удахгүй дуусна",
      body: expired
        ? `Гэрээ ${endLabel}-нд дууссан. Сунгах эсвэл шинэчлэх шаардлагатай эсэхээ шалгана уу.`
        : `Гэрээ ${endLabel}-нд дуусна. Сунгах эсэхээ эзэмшигчтэй урьдчилан ярилцана уу.`,
      date: end ?? "",
      read: readIds.has(id),
    });
  }

  return [...compliance, ...expiry].sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return b.date.localeCompare(a.date);
  });
}

// Cached per request so the (app) layout (badge count) and the page within it
// share a single fetch.
export const loadAppData = cache(async (): Promise<AppData> => {
  const {
    contracts: rawContracts,
    metrics,
    alerts: dashboardAlerts,
  } = await getDashboardData();
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
  try {
    const user = await getAuthenticatedUser();
    if (user) {
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

  return {
    userName,
    userEmail,
    credits,
    activeCount: metrics.activeCount,
    averageCompliance: metrics.averageCompliance,
    expiringSoon,
    highRiskCount: metrics.highRiskCount,
    contracts: rawContracts.map(mapContract),
    alerts: buildAlerts(rawContracts, dashboardAlerts, readIds),
  };
});
