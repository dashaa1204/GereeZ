import { createServerSupabaseClient } from "./supabase-server";
import { getDemoContract, isDemoUiEnabled } from "./demo-ui";
import { recoverStrandedAudits } from "./stranded-audits";
import type { AuditAlert, Contract } from "./types/contract";

export interface DashboardMetrics {
  activeCount: number;
  pendingAudits: number;
  failedCount: number;
  averageCompliance: number | null;
  highRiskCount: number;
}

export interface DashboardAlert extends AuditAlert {
  contractId: string;
  contractName: string;
}

export interface DashboardData {
  contracts: Contract[];
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  averageScore: number | null;
}

export async function fetchContracts(): Promise<Contract[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Гэрээ татахад алдаа: ${error.message}`);
  }

  return (data ?? []) as Contract[];
}

export async function fetchContractsForPage(): Promise<Contract[]> {
  if (isDemoUiEnabled()) return [getDemoContract()];
  // Return all contracts (not just completed) so pending/failed ones are
  // visible and the user can retry stuck audits.
  return fetchContracts();
}

export function buildDashboardData(contracts: Contract[]): DashboardData {
  const completed = contracts.filter((c) => c.status === "completed");
  const pending = contracts.filter(
    (c) => c.status === "pending" || c.status === "processing",
  );
  const failed = contracts.filter((c) => c.status === "failed");

  const scores = completed
    .map((c) => c.compliance_score)
    .filter((s): s is number => s != null);

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;

  const severityOrder: Record<AuditAlert["severity"], number> = {
    high: 0,
    medium: 1,
    low: 2,
    info: 3,
  };

  const alerts: DashboardAlert[] = [];
  for (const contract of completed) {
    for (const alert of contract.audit_summary?.alerts ?? []) {
      alerts.push({
        ...alert,
        contractId: contract.id,
        contractName: contract.file_name,
      });
    }
  }

  alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const highRiskCount = alerts.filter((a) => a.severity === "high").length;

  return {
    contracts,
    metrics: {
      activeCount: completed.length,
      pendingAudits: pending.length,
      failedCount: failed.length,
      averageCompliance: averageScore,
      highRiskCount,
    },
    alerts,
    averageScore,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (isDemoUiEnabled()) {
    return buildDashboardData([getDemoContract()]);
  }
  // Audits killed mid-flight (see lib/stranded-audits.ts) can only be repaired
  // from a later read — this is that read.
  const contracts = await recoverStrandedAudits(await fetchContracts());
  return buildDashboardData(contracts);
}
