import Link from "next/link";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import type { FigmaContractVM } from "@/lib/figma-data";
import { ContractUploadFlow } from "../ContractUploadFlow";
import { scoreColor } from "../display";

export function HomeScreen({
  credits,
  userName,
  activeCount,
  averageCompliance,
  expiringSoon,
  recent,
}: {
  credits: number;
  userName: string | null;
  activeCount?: number;
  averageCompliance?: number | null;
  expiringSoon?: number;
  recent?: FigmaContractVM;
}) {
  return (
    <div className="space-y-5">
      {/* header — fixed dark banner in both themes so the light-on-dark pills
          stay legible (bg-primary would invert to light in dark mode) */}
      <div className="rounded-2xl bg-zinc-900 text-white px-5 py-5">
        <p className="text-sm font-medium opacity-70 mb-1">Сайн байна уу 👋</p>
        <h1 className="text-xl font-bold leading-tight capitalize">
          {userName ?? "Батболд"}
        </h1>
        <p className="text-sm opacity-70 mt-1">Таны гэрээнүүдийг хянаж байна.</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{credits} кредит</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/25 rounded-full px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-semibold text-emerald-200">Идэвхтэй</span>
          </div>
        </div>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{activeCount ?? 2}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Идэвхтэй гэрээ</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          {averageCompliance === undefined ? (
            <p className="text-2xl font-bold" style={{ color: scoreColor(78) }}>78</p>
          ) : averageCompliance === null ? (
            <p className="text-2xl font-bold text-foreground">—</p>
          ) : (
            <p className="text-2xl font-bold" style={{ color: scoreColor(averageCompliance) }}>
              {averageCompliance}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Нийцлийн оноо</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{expiringSoon ?? 1}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Удахгүй дуусна</p>
        </div>
      </div>

      <ContractUploadFlow />

      {/* recent contract */}
      {recent && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Сүүлийн гэрээ</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{recent.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {recent.endDate}</p>
              </div>
              {recent.score != null && (
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${scoreColor(recent.score)}1f`,
                    color: scoreColor(recent.score),
                  }}
                >
                  {recent.score} оноо
                </div>
              )}
            </div>
            <Link
              href={`/contracts/${recent.id}`}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-primary font-medium py-2 rounded-lg bg-primary/8 hover:bg-primary/12 transition-colors"
            >
              Дэлгэрэнгүй харах
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
