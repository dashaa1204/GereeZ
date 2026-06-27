export type ContractStatus = "pending" | "processing" | "completed" | "failed";

export type AlertSeverity = "high" | "medium" | "low" | "info";

export type AlertConfidence = "high" | "medium" | "low";

export interface AuditAlert {
  severity: AlertSeverity;
  /** AI's confidence the issue is real. Optional: audits stored before this field shipped lack it. */
  confidence?: AlertConfidence;
  title: string;
  description: string;
  contractClause?: string;
  lawName: string;
  articleReference: string;
}

export interface RetrievedArticle {
  lawName: string;
  articleNumber: string | null;
  sectionTitle: string | null;
  similarity: number;
}

export interface AuditSummary {
  summary: string;
  alerts: AuditAlert[];
  strengths: string[];
  contentHash?: string;
  /** Hash of the raw uploaded bytes — reuses a prior audit on identical re-uploads. */
  rawHash?: string;
  cachedFromPriorAudit?: boolean;
  retrievedArticles?: RetrievedArticle[];
  demoMode?: boolean;
}

export interface Contract {
  id: string;
  user_id: string | null;
  file_name: string;
  file_url: string | null;
  storage_path: string;
  compliance_score: number | null;
  audit_summary: AuditSummary | null;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditResult {
  contract: Contract;
}
