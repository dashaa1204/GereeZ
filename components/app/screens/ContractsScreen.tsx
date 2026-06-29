"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CreditCard, FileText, Lock, Plus } from "lucide-react";
import type { FigmaContractVM } from "@/lib/figma-data";
import { fmtOrDash, scoreColor } from "../display";

export function ContractsScreen({
  contracts,
  credits,
}: {
  contracts: FigmaContractVM[];
  credits: number;
}) {
  const router = useRouter();
  const onPayment = () => router.push("/payment");

  const statusCfg = (s: FigmaContractVM["status"]) => {
    if (s === "compliant") return { label: "Нийцтэй", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500" };
    if (s === "warning") return { label: "Анхаарах", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500" };
    if (s === "pending") return { label: "Хүлээгдэж буй", color: "text-muted-foreground bg-muted", dot: "bg-muted-foreground" };
    return { label: "Эрсдэлтэй", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40", dot: "bg-red-500" };
  };

  return (
    <div className="space-y-4">
      {/* credit balance */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Кредит үлдэгдэл</p>
            <p className="text-lg font-bold text-foreground">{credits}</p>
          </div>
        </div>
        <button
          onClick={onPayment}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Нэмэх
        </button>
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground px-0.5">Бүх гэрээ ({contracts.length})</h2>

      {contracts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <FileText className="mx-auto w-8 h-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Гэрээ байхгүй байна</p>
          <p className="mt-1 text-xs text-muted-foreground">Нүүр хуудаснаас гэрээгээ оруулна уу.</p>
        </div>
      )}

      {contracts.map((c) => {
        const cfg = statusCfg(c.status);
        if (!c.paid) {
          return (
            <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-snug truncate">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {c.endDate}</p>
                  </div>
                  <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </div>
                {/* lock overlay */}
                <div className="rounded-xl bg-muted border border-border p-4 flex flex-col items-center gap-2.5 text-center">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Аудит хаалттай байна</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.pages != null
                        ? `Энэ гэрээнд ${c.pages} кредит шаардагдана`
                        : "Аудит хийлгэхэд кредит шаардлагатай"}
                    </p>
                  </div>
                  <button
                    onClick={onPayment}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    {c.pages != null ? `${c.pages} кредитээр нээх` : "Кредитээр нээх"}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-snug truncate">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {c.endDate}</p>
              </div>
              <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.score ?? 0}%`, backgroundColor: scoreColor(c.score ?? 0) }}
                />
              </div>
              <span className="text-xs font-bold" style={{ color: scoreColor(c.score ?? 0) }}>{c.score ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Сарын түрээс: <span className="font-semibold text-foreground">{fmtOrDash(c.rent)}</span></span>
              <span>Барьцаа: <span className="font-semibold text-foreground">{fmtOrDash(c.deposit)}</span></span>
            </div>
            <button
              onClick={() => router.push(`/contracts/${c.id}`)}
              className="w-full text-sm font-semibold text-primary py-2 rounded-xl bg-primary/8 hover:bg-primary/12 transition-colors flex items-center justify-center gap-2"
            >
              Аудит харах
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
