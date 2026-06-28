"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlarmClock,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronDown,
  Coins,
  FileText,
  Loader2,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { ExpandableAuditList } from "@/components/contracts/ExpandableAuditList";
import { AuditPaymentGate } from "@/components/contracts/AuditPaymentGate";
import { SettleIn } from "@/components/ui/SettleIn";
import {
  auditContract,
  quoteContract,
  type AuditQuote,
} from "@/lib/services/contracts.client";
import { rechargeCredits } from "@/lib/services/credits.client";
import { DEMO_CONTRACT_ID } from "@/lib/demo-ui";
import type { AlertSeverity, Contract } from "@/lib/types/contract";
import {
  expiryLabel,
  formatDateMn,
  formatMNT,
  getEndDate,
  getMetadata,
  getStartDate,
  getTrackStatus,
  hasTrackingInfo,
} from "@/lib/tracking";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_ALERTS = 3;
const MAX_VISIBLE_STRENGTHS = 2;

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

interface ActiveContractsProps {
  contracts: Contract[];
  showHeader?: boolean;
}

/** A "processing" contract older than this is treated as stuck and retryable. */
const STALE_PROCESSING_MS = 5 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scoreTextClass(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Сайн байдал";
  if (score >= 60) return "Дунд түвшин";
  return "Анхаарах шаардлагатай";
}

function scoreBarClass(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}

function sortAlertsBySeverity<T extends { severity: AlertSeverity }>(alerts: T[]): T[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

function statusPill(
  contract: Contract,
): { label: string; className: string } | null {
  switch (contract.status) {
    case "pending":
      return { label: "Хүлээгдэж буй", className: "bg-warning/10 text-warning" };
    case "processing":
      return { label: "Шинжилж байна", className: "bg-navy/10 text-navy" };
    case "failed":
      return { label: "Амжилтгүй", className: "bg-destructive/10 text-destructive" };
    default:
      return null;
  }
}

function isRetryable(contract: Contract): boolean {
  if (contract.status === "pending" || contract.status === "failed") return true;
  if (contract.status === "processing") {
    return Date.now() - new Date(contract.updated_at).getTime() > STALE_PROCESSING_MS;
  }
  return false;
}

function MetaFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-navy/60" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function ContractRow({
  contract,
  expanded,
  onToggle,
  onRetry,
  retrying,
  retryError,
}: {
  contract: Contract;
  expanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  retrying: boolean;
  retryError: string | null;
}) {
  const alerts = sortAlertsBySeverity(contract.audit_summary?.alerts ?? []);
  const strengths = contract.audit_summary?.strengths ?? [];

  const meta = getMetadata(contract);
  const showMeta = hasTrackingInfo(contract);
  const expiry = expiryLabel(contract);
  const trackStatus = getTrackStatus(contract);
  const flagExpiry =
    expiry != null &&
    (trackStatus === "expiring-soon" || trackStatus === "expired");
  const metaStart = formatDateMn(getStartDate(contract));
  const metaEnd = formatDateMn(getEndDate(contract));
  const metaPeriod =
    metaStart || metaEnd ? `${metaStart ?? "?"} — ${metaEnd ?? "?"}` : null;
  const metaRent = formatMNT(meta?.monthlyRent ?? null);
  const metaDeposit = formatMNT(meta?.deposit ?? null);
  const metaParties =
    meta?.landlordName || meta?.tenantName
      ? [meta?.landlordName ?? "—", meta?.tenantName ?? "—"].join(" → ")
      : null;

  const alertCount = alerts.length;
  const highRiskCount = alerts.filter((a) => a.severity === "high").length;
  const pill = statusPill(contract);
  const retryable = isRetryable(contract);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [strengthsExpanded, setStrengthsExpanded] = useState(false);

  // An unpaid contract (pending, or failed before/at the charge) needs the
  // payment gate before it can be audited — never a silent charge.
  // An unpaid contract (pending, or failed before/at the charge) needs the
  // payment gate before it can be audited — never a silent charge.
  const needsPayment =
    contract.status === "pending" || contract.status === "failed";
  const [quote, setQuote] = useState<AuditQuote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [recharging, setRecharging] = useState(false);
  // Loading is derived (not state) so the effect only sets state in callbacks.
  const loadingQuote = needsPayment && expanded && !quote && !quoteFailed;

  useEffect(() => {
    if (!expanded) {
      setSummaryExpanded(false);
      setAlertsExpanded(false);
      setStrengthsExpanded(false);
    }
  }, [expanded]);

  // Fetch the quote (pages / cost / balance) when an unpaid contract is opened,
  // so the user sees what they're paying before confirming — same gate as the
  // upload flow. On failure the row falls back to a plain retry button.
  useEffect(() => {
    if (!expanded || !needsPayment) return;
    let cancelled = false;
    quoteContract(contract.id)
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch(() => {
        if (!cancelled) setQuoteFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, needsPayment, contract.id]);

  const handleRecharge = async () => {
    setRecharging(true);
    try {
      const balance = await rechargeCredits();
      setQuote((prev) =>
        prev ? { ...prev, balance, sufficient: balance >= prev.cost } : prev,
      );
    } catch {
      // Recharge failure is surfaced by the disabled state resetting; ignore.
    } finally {
      setRecharging(false);
    }
  };

  const visibleStrengths = strengthsExpanded
    ? strengths
    : strengths.slice(0, MAX_VISIBLE_STRENGTHS);
  const hasMoreStrengths = strengths.length > MAX_VISIBLE_STRENGTHS;

  const summary = contract.audit_summary?.summary;
  const summaryLong = summary != null && summary.length > 180;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors active:bg-muted/40"
      >
        <FileText className="size-4 shrink-0 text-navy/70" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{contract.file_name}</p>
            {contract.id === DEMO_CONTRACT_ID && (
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Жишээ
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDate(contract.created_at)}
            {alertCount > 0 && ` · ${alertCount} анхааруулга`}
            {highRiskCount > 0 && ` · ${highRiskCount} өндөр`}
          </p>
          {flagExpiry && (
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                trackStatus === "expired"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-warning/10 text-warning",
              )}
            >
              <AlarmClock className="size-2.5" />
              {expiry}
            </span>
          )}

          {contract.compliance_score != null && (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    scoreBarClass(contract.compliance_score),
                  )}
                  style={{ width: `${contract.compliance_score}%` }}
                />
              </div>
              <span
                className={cn(
                  "shrink-0 text-xs font-bold tabular-nums",
                  scoreTextClass(contract.compliance_score),
                )}
              >
                {contract.compliance_score}
              </span>
            </div>
          )}
        </div>

        {contract.compliance_score == null && pill && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              pill.className,
            )}
          >
            {(contract.status === "processing" || contract.status === "pending") && (
              <Loader2 className="size-3 animate-spin" />
            )}
            {pill.label}
          </span>
        )}

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-500 ease-out",
            expanded && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="contract-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.3, ease: "easeOut" },
            }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-border px-3 py-3">
          {contract.compliance_score != null && (
            <SettleIn delay={0.04}>
            <div className="flex items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Хуулийн оноо
                </p>
                <p className={cn("text-sm font-semibold", scoreTextClass(contract.compliance_score))}>
                  {scoreLabel(contract.compliance_score)}
                </p>
              </div>
              <span
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  scoreTextClass(contract.compliance_score),
                )}
              >
                {contract.compliance_score}
              </span>
            </div>
            </SettleIn>
          )}

          {showMeta && (
            <SettleIn delay={0.06}>
            <div className="rounded-lg border border-border bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Гэрээний мэдээлэл
              </p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5">
                {metaParties && (
                  <MetaFact icon={Users} label="Талууд" value={metaParties} />
                )}
                {metaPeriod && (
                  <MetaFact
                    icon={CalendarDays}
                    label="Хүчинтэй хугацаа"
                    value={metaPeriod}
                  />
                )}
                {metaRent && (
                  <MetaFact icon={Coins} label="Сарын түрээс" value={metaRent} />
                )}
                {metaDeposit && (
                  <MetaFact icon={Wallet} label="Барьцаа" value={metaDeposit} />
                )}
                {meta?.paymentDay != null && (
                  <MetaFact
                    icon={AlarmClock}
                    label="Төлбөрийн өдөр"
                    value={`Сар бүрийн ${meta.paymentDay}-нд`}
                  />
                )}
              </div>
            </div>
            </SettleIn>
          )}

          {summary && (
            <SettleIn delay={0.08}>
            <div className="rounded-lg border border-border bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ерөнхий дүгнэлт
              </p>
              <p
                className={cn(
                  "mt-1.5 text-sm leading-relaxed text-muted-foreground",
                  !summaryExpanded && summaryLong && "line-clamp-3",
                )}
              >
                {summary}
              </p>
              {summaryLong && (
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((current) => !current)}
                  className="mt-1.5 text-xs font-medium text-navy hover:underline"
                >
                  {summaryExpanded ? "Хураах" : "Дэлгэрэнгүй"}
                </button>
              )}
            </div>
            </SettleIn>
          )}

          {alerts.length > 0 && (
            <SettleIn delay={0.12}>
            <div className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-muted-foreground" />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Анхааруулга
                  </p>
                </div>
                {highRiskCount > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                    {highRiskCount} өндөр эрсдэл
                  </span>
                )}
              </div>
              <ExpandableAuditList
                alerts={alerts}
                expanded={alertsExpanded}
                onToggleExpanded={() => setAlertsExpanded((current) => !current)}
                maxVisible={MAX_VISIBLE_ALERTS}
                className="-mx-0"
              />
            </div>
            </SettleIn>
          )}

          {strengths.length > 0 && (
            <SettleIn delay={0.16}>
            <div className="rounded-lg border border-border bg-white px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Сайн талууд
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {visibleStrengths.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {hasMoreStrengths && (
                <button
                  type="button"
                  onClick={() => setStrengthsExpanded((current) => !current)}
                  className="mt-1.5 text-xs font-medium text-navy hover:underline"
                >
                  {strengthsExpanded
                    ? "Хураах"
                    : `+${strengths.length - MAX_VISIBLE_STRENGTHS} илүү`}
                </button>
              )}
            </div>
            </SettleIn>
          )}

          {contract.status !== "completed" && (
            <SettleIn delay={0.2}>
            <div className="space-y-2">
              {needsPayment && quote ? (
                // Unpaid contract: confirm cost and pay before auditing.
                <AuditPaymentGate
                  quote={quote}
                  onConfirm={onRetry}
                  onRecharge={handleRecharge}
                  recharging={recharging}
                  confirming={retrying}
                />
              ) : (
                <div className="space-y-2 rounded-lg border border-border bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {(contract.status === "processing" ||
                      retrying ||
                      loadingQuote) && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-navy" />
                    )}
                    <p>
                      {retrying
                        ? "Шинжилж байна…"
                        : loadingQuote
                          ? "Төлбөрийн мэдээлэл ачаалж байна…"
                          : contract.status === "failed"
                            ? "Шинжилгээ амжилтгүй болсон."
                            : contract.status === "processing"
                              ? "Шинжилгээ хийгдэж байна."
                              : "Шинжилгээ хараахан хийгдээгүй байна."}
                    </p>
                  </div>
                  {/* Plain retry only as a fallback: a stale "processing" row,
                      or when the quote failed to load. */}
                  {retryable && !loadingQuote && !quote && (
                    <button
                      type="button"
                      onClick={onRetry}
                      disabled={retrying}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
                    >
                      {retrying ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      {retrying ? "Шинжилж байна…" : "Дахин шинжлэх"}
                    </button>
                  )}
                </div>
              )}
              {retryError && (
                <p className="text-xs text-destructive">{retryError}</p>
              )}
            </div>
            </SettleIn>
          )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ActiveContracts({ contracts, showHeader = true }: ActiveContractsProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryErrorId, setRetryErrorId] = useState<{ id: string; message: string } | null>(
    null,
  );

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    setRetryErrorId(null);
    try {
      await auditContract(id);
      router.refresh();
    } catch (error) {
      setRetryErrorId({
        id,
        message: error instanceof Error ? error.message : "Алдаа гарлаа",
      });
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <section>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Миний гэрээнүүд{" "}
            <span className="font-normal text-muted-foreground">
              ({contracts.length})
            </span>
          </h2>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            Гэрээ байхгүй байна
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Нүүр хуудсаас PDF гэрээгээ оруулж шинжүүлээрэй.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <ContractRow
              key={contract.id}
              contract={contract}
              expanded={expandedId === contract.id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === contract.id ? null : contract.id,
                )
              }
              onRetry={() => handleRetry(contract.id)}
              retrying={retryingId === contract.id}
              retryError={
                retryErrorId?.id === contract.id ? retryErrorId.message : null
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}
