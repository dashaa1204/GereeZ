import { cache } from "react";
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

/** One audit finding in the Figma display shape. */
export interface FigmaFinding {
  id: number;
  severity: "high" | "medium" | "low" | "info";
  clause: string;
  article: string;
  explanation: string;
  confidence: number;
}

/** A contract mapped from the real DB shape to what the Figma screens render. */
export interface FigmaContractVM {
  id: string;
  /** Primary label — real contracts have no address, so use the file name. */
  label: string;
  tenant: string;
  landlord: string;
  rent: number | null;
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
  findings: FigmaFinding[];
  strengths: string[];
  expiry: string | null;
}

/** A notification mapped to what the Figma alerts screen renders. */
export interface FigmaAlertVM {
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
export interface FigmaData {
  userName: string | null;
  userEmail: string | null;
  credits: number;
  activeCount: number;
  averageCompliance: number | null;
  expiringSoon: number;
  highRiskCount: number;
  contracts: FigmaContractVM[];
  alerts: FigmaAlertVM[];
}

const CONFIDENCE_PCT: Record<string, number> = { high: 95, medium: 78, low: 58 };

function mapAlert(a: AuditAlert, i: number): FigmaFinding {
  const clause = a.contractClause ? `${a.contractClause} — ${a.title}` : a.title;
  const article =
    [a.lawName, a.articleReference].filter(Boolean).join(" ").trim() || "—";
  return {
    id: i,
    severity: a.severity,
    clause,
    article,
    explanation: a.description,
    confidence: a.confidence ? (CONFIDENCE_PCT[a.confidence] ?? 75) : 80,
  };
}

function statusOf(c: Contract): FigmaContractVM["status"] {
  if (c.status !== "completed" || c.compliance_score == null) return "pending";
  if (c.compliance_score >= 75) return "compliant";
  if (c.compliance_score >= 50) return "warning";
  return "risk";
}

export function mapContract(c: Contract): FigmaContractVM {
  const meta = getMetadata(c);
  return {
    id: c.id,
    label: c.file_name,
    tenant: meta?.tenantName ?? "—",
    landlord: meta?.landlordName ?? "—",
    rent: meta?.monthlyRent ?? null,
    deposit: meta?.deposit ?? null,
    startDate: getStartDate(c) ?? "—",
    endDate: getEndDate(c) ?? "—",
    payDay: meta?.paymentDay ?? null,
    score: c.compliance_score,
    status: statusOf(c),
    paid: c.status === "completed",
    pages: null,
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
 * from each contract's tracking status. Read-state isn't persisted yet, so
 * everything starts unread; the UI tracks reads locally.
 */
export function buildAlerts(
  contracts: Contract[],
  dashboardAlerts: DashboardAlert[],
): FigmaAlertVM[] {
  // Compliance alerts carry no per-alert timestamp; use the contract's last
  // update (when the audit completed) as the alert date.
  const dateById = new Map(
    contracts.map((c) => [c.id, c.updated_at?.slice(0, 10) ?? ""]),
  );

  const compliance: FigmaAlertVM[] = dashboardAlerts.map((a, i) => ({
    id: `c-${a.contractId}-${i}`,
    type: "compliance",
    severity: a.severity,
    contractName: a.contractName,
    title: a.title,
    body: a.description,
    date: dateById.get(a.contractId) ?? "",
    read: false,
  }));

  const expiry: FigmaAlertVM[] = [];
  for (const c of contracts) {
    const status = getTrackStatus(c);
    if (status !== "expiring-soon" && status !== "expired") continue;
    const end = getEndDate(c);
    const endLabel = formatDateMn(end) ?? end ?? "—";
    const expired = status === "expired";
    expiry.push({
      id: `e-${c.id}`,
      type: "expiry",
      severity: expired ? "high" : "medium",
      contractName: c.file_name,
      title: expired ? "Гэрээний хугацаа дууссан" : "Гэрээ удахгүй дуусна",
      body: expired
        ? `Гэрээ ${endLabel}-нд дууссан. Сунгах эсвэл шинэчлэх шаардлагатай эсэхээ шалгана уу.`
        : `Гэрээ ${endLabel}-нд дуусна. Сунгах эсэхээ эзэмшигчтэй урьдчилан ярилцана уу.`,
      date: end ?? "",
      read: false,
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
export const loadFigmaData = cache(async (): Promise<FigmaData> => {
  const {
    contracts: rawContracts,
    metrics,
    alerts: dashboardAlerts,
  } = await getDashboardData();
  const expiringSoon = rawContracts.filter(
    (c) => getTrackStatus(c) === "expiring-soon",
  ).length;

  // getBalance uses the service-role client; never let a missing env crash the
  // page render — fall back to 0 credits and no user.
  let credits = 0;
  let userName: string | null = null;
  let userEmail: string | null = null;
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      userEmail = user.email ?? null;
      userName = user.email?.split("@")[0] ?? null;
      credits = await getBalance(user.id);
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
    alerts: buildAlerts(rawContracts, dashboardAlerts),
  };
});
