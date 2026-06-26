export type ContractStatus = "pending" | "processing" | "completed" | "failed";

export type AlertSeverity = "high" | "medium" | "low" | "info";

export interface AuditAlert {
  severity: AlertSeverity;
  title: string;
  description: string;
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
