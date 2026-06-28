"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  User,
  XCircle,
} from "lucide-react";
import { ExpandableAuditList } from "@/components/contracts/ExpandableAuditList";
import { LegalScore } from "@/components/dashboard/LegalScore";
import { SettleIn } from "@/components/ui/SettleIn";
import type { Contract, ContractMetadata } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_ALERTS = 3;

type AuditTab = "findings" | "strengths" | "meta";

function fmtMnt(n: number) {
  return n.toLocaleString("mn-MN") + "₮";
}

interface MetaRow {
  icon: ReactNode;
  label: string;
  value: string;
}

function buildMetaRows(m: ContractMetadata): MetaRow[] {
  const rows: MetaRow[] = [];
  if (m.tenantName)
    rows.push({ icon: <User className="size-4" />, label: "Түрээслэгч", value: m.tenantName });
  if (m.landlordName)
    rows.push({ icon: <Building2 className="size-4" />, label: "Эзэмшигч", value: m.landlordName });
  if (m.monthlyRent != null)
    rows.push({ icon: <Banknote className="size-4" />, label: "Сарын түрээс", value: fmtMnt(m.monthlyRent) });
  if (m.deposit != null)
    rows.push({ icon: <CreditCard className="size-4" />, label: "Барьцаа", value: fmtMnt(m.deposit) });
  if (m.startDate)
    rows.push({ icon: <Calendar className="size-4" />, label: "Эхлэх огноо", value: m.startDate });
  if (m.endDate)
    rows.push({ icon: <Calendar className="size-4" />, label: "Дуусах огноо", value: m.endDate });
  if (m.paymentDay != null)
    rows.push({ icon: <Clock className="size-4" />, label: "Төлбөрийн өдөр", value: `Сарын ${m.paymentDay}-нд` });
  return rows;
}

function CountBadge({
  icon,
  label,
  className,
}: {
  icon: ReactNode;
  label: string;
  className: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {icon}
      {label}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
      {text}
    </p>
  );
}

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
  const summary = contract.audit_summary;
  const alerts = summary?.alerts ?? [];
  const strengths = summary?.strengths ?? [];
  const metaRows = summary?.metadata ? buildMetaRows(summary.metadata) : [];

  const highCount = alerts.filter((a) => a.severity === "high").length;
  const medCount = alerts.filter((a) => a.severity === "medium").length;

  const [tab, setTab] = useState<AuditTab>("findings");

  const tabs: { id: AuditTab; label: string }[] = [
    { id: "findings", label: "Анхааруулга" },
    { id: "strengths", label: "Давуу тал" },
    { id: "meta", label: "Мэдээлэл" },
  ];

  return (
    <SettleIn className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
      {/* score header */}
      <div className="px-4 pt-4">
        <LegalScore score={contract.compliance_score} variant="inline" />
      </div>

      <div className="border-b border-border px-4 pb-4">
        <p className="truncate text-sm font-semibold">{contract.file_name}</p>
        {summary?.summary && (
          <SettleIn delay={0.08}>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {summary.summary}
            </p>
          </SettleIn>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <CountBadge
            icon={<XCircle className="size-3" />}
            label={`${highCount} өндөр`}
            className="bg-destructive/10 text-destructive"
          />
          <CountBadge
            icon={<AlertTriangle className="size-3" />}
            label={`${medCount} дунд`}
            className="bg-warning/10 text-warning"
          />
          <CountBadge
            icon={<CheckCircle2 className="size-3" />}
            label={`${strengths.length} давуу тал`}
            className="bg-success/10 text-success"
          />
        </div>
      </div>

      {/* tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                tab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 pt-3">
        {tab === "findings" &&
          (alerts.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <ExpandableAuditList
                alerts={alerts}
                expanded={expanded}
                onToggleExpanded={onToggleExpanded}
                maxVisible={MAX_VISIBLE_ALERTS}
                toggleClassName="py-3"
              />
            </div>
          ) : (
            <EmptyState text="Анхааруулга илрээгүй." />
          ))}

        {tab === "strengths" &&
          (strengths.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                Таны эрхийг хамгаалсан зүйлүүд:
              </p>
              {strengths.map((s, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-success/30 bg-success/5 p-3.5"
                >
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <p className="text-sm leading-relaxed text-foreground">{s}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Тэмдэглэхүйц давуу тал олдсонгүй." />
          ))}

        {tab === "meta" &&
          (metaRows.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border">
              {metaRows.map((row, i) => (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    i < metaRows.length - 1 && "border-b border-border",
                  )}
                >
                  <span className="shrink-0 text-muted-foreground">{row.icon}</span>
                  <span className="w-28 shrink-0 text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="flex-1 text-right text-sm font-medium text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="Гэрээний мэдээлэл олдсонгүй." />
          ))}
      </div>
    </SettleIn>
  );
}
