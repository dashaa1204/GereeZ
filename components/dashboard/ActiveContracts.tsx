"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { AuditAlertList } from "@/components/contracts/AuditAlertList";
import { DEMO_CONTRACT_ID } from "@/lib/demo-ui";
import type { Contract } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

interface ActiveContractsProps {
  contracts: Contract[];
  showHeader?: boolean;
}

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

function ContractRow({
  contract,
  expanded,
  onToggle,
}: {
  contract: Contract;
  expanded: boolean;
  onToggle: () => void;
}) {
  const alerts = contract.audit_summary?.alerts ?? [];
  const alertCount = alerts.length;

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

        {contract.compliance_score != null && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
              scoreBadgeClass(contract.compliance_score),
            )}
          >
            {contract.compliance_score}
          </span>
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
        </div>
      )}
    </div>
  );
}

export function ActiveContracts({ contracts, showHeader = true }: ActiveContractsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            />
          ))}
        </div>
      )}
    </section>
  );
}
