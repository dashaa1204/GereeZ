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

/**
 * Structured facts pulled out of the contract during the audit, used by the
 * tracking view (expiry countdown, rent/deposit display). Every field is
 * nullable — older contracts and partial documents may not carry all of it.
 */
export interface ContractMetadata {
  /** Tenant (хөлслөгч) name. */
  tenantName: string | null;
  /** Landlord (түрээслүүлэгч) name. */
  landlordName: string | null;
  /** Monthly rent in MNT. */
  monthlyRent: number | null;
  /** Deposit / security amount in MNT. */
  deposit: number | null;
  /** Contract start date, ISO `YYYY-MM-DD`. */
  startDate: string | null;
  /** Contract end / expiry date, ISO `YYYY-MM-DD`. */
  endDate: string | null;
  /** Day of month rent is due (1–31). */
  paymentDay: number | null;
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
  /** Structured facts for the tracking view. Absent on pre-tracking audits. */
  metadata?: ContractMetadata;
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
  /** Contract start date (ISO date) — mirrors audit_summary.metadata.startDate. */
  start_date: string | null;
  /** Contract end date (ISO date) — mirrors audit_summary.metadata.endDate. */
  end_date: string | null;
  /** PDF page count cached by the quote step; null before the first quote. */
  page_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditResult {
  contract: Contract;
}
