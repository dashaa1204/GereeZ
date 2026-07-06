"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  User,
  XCircle,
} from "lucide-react";
import type { ContractVM } from "@/lib/view-models";
import { fmtOrDash, scoreLabel } from "../display";
import { ScoreRing } from "../ScoreRing";
import { FindingRow } from "../FindingRow";
import { ProposalCard } from "../ProposalCard";

export function AuditScreen({ contract }: { contract: ContractVM }) {
  const [tab, setTab] = useState<"findings" | "strengths" | "meta">("findings");
  const findings = contract.findings;
  const strengths = contract.strengths;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;

  return (
    <div className="space-y-5">
      {/* score header */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Нийцлийн дүгнэлт
        </p>
        <div className="flex items-center gap-5">
          {contract.score != null ? (
            <ScoreRing score={contract.score} size={120} />
          ) : (
            <div className="flex size-[120px] shrink-0 items-center justify-center rounded-full border-[10px] border-muted text-2xl font-bold text-muted-foreground">
              —
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-foreground leading-tight">
              {contract.score != null ? scoreLabel(contract.score) : "Аудит хийгдээгүй"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
              {contract.label}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {contract.typeLabel && (
                <div className="flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  <FileText className="w-3 h-3" />
                  {contract.typeLabel}
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <XCircle className="w-3 h-3" />
                {highCount} өндөр
              </div>
              <div className="flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                {medCount} дунд
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                {strengths.length} давуу тал
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Turn the audit into an action: a ready-to-send correction letter. */}
      {highCount + medCount > 0 && (
        <ProposalCard
          contractId={contract.id}
          issueCount={highCount + medCount}
          initialProposal={contract.proposal}
        />
      )}

      {/* tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {(["findings", "strengths", "meta"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t === "findings" ? "Анхааруулга" : t === "strengths" ? "Давуу тал" : "Мэдээлэл"}
          </button>
        ))}
      </div>

      {tab === "findings" && (
        <div className="space-y-2.5">
          {findings.length > 0 ? (
            findings.map((f) => <FindingRow key={f.id} f={f} />)
          ) : (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Анхааруулга илрээгүй.
            </p>
          )}
        </div>
      )}

      {tab === "strengths" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Таны эрхийг хамгаалсан зүйлүүд:
          </p>
          {strengths.length > 0 ? (
            strengths.map((s, i) => (
              <div
                key={i}
                className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground leading-relaxed">{s}</p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
              Тэмдэглэхүйц давуу тал олдсонгүй.
            </p>
          )}
        </div>
      )}

      {tab === "meta" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {[
            { icon: <User className="w-4 h-4" />, label: contract.tenantLabel, value: contract.tenant },
            { icon: <Building2 className="w-4 h-4" />, label: contract.landlordLabel, value: contract.landlord },
            { icon: <Banknote className="w-4 h-4" />, label: contract.rentLabel, value: fmtOrDash(contract.rent) },
            { icon: <CreditCard className="w-4 h-4" />, label: "Барьцаа", value: fmtOrDash(contract.deposit) },
            { icon: <Calendar className="w-4 h-4" />, label: "Эхлэх огноо", value: contract.startDate },
            { icon: <Calendar className="w-4 h-4" />, label: "Дуусах огноо", value: contract.endDate },
            { icon: <Clock className="w-4 h-4" />, label: "Төлбөрийн өдөр", value: contract.payDay != null ? `Сарын ${contract.payDay}-нд` : "—" },
          ].map((row, i, arr) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
            >
              <span className="text-muted-foreground shrink-0">{row.icon}</span>
              <span className="text-sm text-muted-foreground w-28 shrink-0">{row.label}</span>
              <span className="text-sm font-medium text-foreground flex-1 text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
