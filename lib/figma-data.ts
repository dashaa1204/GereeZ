import { getDashboardData } from "./contracts";
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

/**
 * Real data for the ported Figma UI (`FigmaApp`). Fetched server-side and passed
 * into the client component, which falls back to dummy values when a field is
 * missing or the list is empty.
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

export async function loadFigmaData(): Promise<FigmaData> {
  const { contracts: rawContracts, metrics } = await getDashboardData();
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
  };
}
