export type ContractStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Which body of law the contract falls under: rental contracts are audited
 * against the Civil Code («Иргэний хууль»), employment contracts against the
 * Labor Law («Хөдөлмөрийн тухай хууль»). Detected from the contract text.
 */
export type ContractType = "rental" | "employment";

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
  /**
   * Display labels extracted from the contract's own wording, so the UI can
   * name parties/amounts correctly for any civil-code contract (rental, sale,
   * cooperation, …), not just the two detected types. Optional: audits stored
   * before label extraction shipped lack them — resolve via
   * `resolveContractLabels` (lib/contract-labels.ts), never read directly.
   */
  /** What the contract calls itself, e.g. «Түрээсийн гэрээ», «Хамтран ажиллах гэрээ». */
  contractTitle?: string | null;
  /** Role word for the tenantName party: Түрээслэгч, Ажилтан, Худалдан авагч… */
  tenantLabel?: string | null;
  /** Role word for the landlordName party: Түрээслүүлэгч, Ажил олгогч, Худалдагч… */
  landlordLabel?: string | null;
  /** What the monthlyRent amount is called: Сарын түрээс, Сарын цалин, Гэрээний үнэ… */
  paymentLabel?: string | null;
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
  /** Detected contract type. Absent on audits stored before type detection shipped (those ran as rental). */
  contractType?: ContractType;
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
