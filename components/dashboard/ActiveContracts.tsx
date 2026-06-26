"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, Loader2, RefreshCw } from "lucide-react";
import { AuditAlertList } from "@/components/contracts/AuditAlertList";
import { auditContract } from "@/lib/services/contracts.client";
import { DEMO_CONTRACT_ID } from "@/lib/demo-ui";
import type { Contract } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

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

function scoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-success/10 text-success";
  if (score >= 60) return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
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
  const alerts = contract.audit_summary?.alerts ?? [];
  const alertCount = alerts.length;
  const pill = statusPill(contract);
  const retryable = isRetryable(contract);

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
          </p>
        </div>

        {contract.compliance_score != null ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              scoreBadgeClass(contract.compliance_score),
            )}
          >
            {contract.compliance_score}
          </span>
        ) : (
          pill && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                pill.className,
              )}
            >
              {pill.label}
            </span>
          )
        )}

        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-border bg-muted/20 px-3 py-3">
          {contract.audit_summary?.summary && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {contract.audit_summary.summary}
            </p>
          )}
          {alerts.length > 0 && <AuditAlertList alerts={alerts} />}

          {contract.status !== "completed" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {contract.status === "failed"
                  ? "Шинжилгээ амжилтгүй болсон."
                  : contract.status === "processing"
                    ? "Шинжилгээ хийгдэж байна."
                    : "Шинжилгээ хараахан хийгдээгүй байна."}
              </p>
              {retryable && (
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
              {retryError && (
                <p className="text-xs text-destructive">{retryError}</p>
              )}
            </div>
          )}
        </div>
      )}
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
