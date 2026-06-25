"use client";

import { useState } from "react";
import { MetricCards } from "@/components/dashboard/MetricCards";
import ContractUpload from "@/components/contracts/ContractUpload";
import type { DashboardMetrics } from "@/lib/contracts";

interface HomeDashboardProps {
  metrics: DashboardMetrics;
  disclaimer: React.ReactNode;
}

export function HomeDashboard({ metrics, disclaimer }: HomeDashboardProps) {
  const [analyzed, setAnalyzed] = useState(false);

  return (
    <>
      <section>
        <h1 className="text-2xl font-bold text-foreground">Сайн байна уу!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {analyzed
            ? "Гэрээний хуулийн нийцлийн самбар"
            : "PDF гэрээгээ оруулж AI шинжилгээ хийлгээрэй"}
        </p>
      </section>

      {analyzed && <MetricCards metrics={metrics} />}

      <div>
        <ContractUpload onAnalysisComplete={() => setAnalyzed(true)} />
        {disclaimer}
      </div>
    </>
  );
}
