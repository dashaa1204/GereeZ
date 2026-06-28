"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { MetricCards } from "@/components/dashboard/MetricCards";
import ContractUpload from "@/components/contracts/ContractUpload";
import type { DashboardMetrics } from "@/lib/contracts";

interface HomeDashboardProps {
  metrics: DashboardMetrics;
  credits: number;
  userName: string | null;
  disclaimer: React.ReactNode;
}

export function HomeDashboard({
  metrics,
  credits,
  userName,
  disclaimer,
}: HomeDashboardProps) {
  const [analyzed, setAnalyzed] = useState(false);
  // Show metrics upfront when the user already has audited contracts, not just
  // after an in-session upload.
  const showMetrics = analyzed || metrics.activeCount > 0;

  return (
    <>
      {/* hero */}
      <section className="rounded-2xl bg-navy px-5 py-5 text-white">
        <p className="mb-1 text-sm font-medium opacity-70">Сайн байна уу 👋</p>
        {userName && (
          <h1 className="text-xl font-bold capitalize leading-tight">
            {userName}
          </h1>
        )}
        <p className="mt-1 text-sm opacity-70">
          {analyzed
            ? "Гэрээний хуулийн нийцлийг хянаж байна."
            : "PDF гэрээгээ оруулж AI шинжилгээ хийлгээрэй."}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5">
            <CreditCard className="size-3.5" />
            <span className="text-xs font-semibold">{credits} кредит</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-success/25 px-3 py-1.5">
            <ShieldCheck className="size-3.5 text-success-complete" />
            <span className="text-xs font-semibold text-white">
              AI хамгаалалт
            </span>
          </div>
        </div>
      </section>

      {showMetrics && <MetricCards metrics={metrics} />}

      <div>
        <ContractUpload onAnalysisComplete={() => setAnalyzed(true)} />
        {disclaimer}
      </div>
    </>
  );
}
