"use client";

import { AlertTriangle } from "lucide-react";
import { AuditAlertList } from "@/components/contracts/AuditAlertList";
import { LegalScore } from "@/components/dashboard/LegalScore";
import { SettleIn, StaggerItem, StaggerList } from "@/components/ui/SettleIn";
import type { Contract } from "@/lib/types/contract";

const MAX_VISIBLE_ALERTS = 3;

interface AnalysisResultsProps {
  contract: Contract;
  expanded: boolean;
  onToggleExpanded: () => void;
}

export function AnalysisResults({
  contract,
  expanded,
  onToggleExpanded,
}: AnalysisResultsProps) {
  const alerts = contract.audit_summary?.alerts ?? [];
  const highRiskCount = alerts.filter((a) => a.severity === "high").length;
  const visibleAlerts = expanded ? alerts : alerts.slice(0, MAX_VISIBLE_ALERTS);
  const hasMore = alerts.length > MAX_VISIBLE_ALERTS;

  return (
    <SettleIn className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
      <div className="px-4 pt-4">
        <LegalScore score={contract.compliance_score} variant="inline" />
      </div>
      <div className="border-b border-border px-4 pb-4">
        <p className="truncate text-sm font-semibold">{contract.file_name}</p>
        {contract.audit_summary?.summary && (
          <SettleIn delay={0.08}>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {contract.audit_summary.summary}
            </p>
          </SettleIn>
        )}
      </div>
      {alerts.length > 0 && (
        <StaggerList>
          <StaggerItem>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Нийцлийн анхааруулга</h3>
              </div>
              {highRiskCount > 0 && (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  {highRiskCount} өндөр эрсдэл
                </span>
              )}
            </div>
            <AuditAlertList alerts={visibleAlerts} variant="list" />
            {hasMore && (
              <button
                type="button"
                onClick={onToggleExpanded}
                className="w-full border-t border-border py-3 text-center text-xs font-medium text-navy hover:bg-muted/30 active:bg-muted/50"
              >
                {expanded ? "Хураах" : `Нийт ${alerts.length} анхааруулга`}
              </button>
            )}
          </StaggerItem>
        </StaggerList>
      )}
    </SettleIn>
  );
}
