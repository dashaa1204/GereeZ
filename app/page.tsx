import { Header } from "@/components/dashboard/Header";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { LegalScore } from "@/components/dashboard/LegalScore";
import { ComplianceAlerts } from "@/components/dashboard/ComplianceAlerts";
import { ActiveContracts } from "@/components/dashboard/ActiveContracts";
import { BottomNav } from "@/components/dashboard/BottomNav";
import ContractUpload from "@/components/contracts/ContractUpload";
import { getDashboardData } from "@/lib/contracts";

export default async function Home() {
  const { contracts, metrics, alerts, averageScore } = await getDashboardData();

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <Header />
      <main className="mx-auto max-w-md space-y-5 px-4 py-5">
        <section>
          <h1 className="text-2xl font-bold text-foreground">Сайн байна уу!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Гэрээний хуулийн нийцлийн самбар
          </p>
        </section>

        <MetricCards metrics={metrics} />
        <ContractUpload />
        <LegalScore score={averageScore} />
        <ComplianceAlerts alerts={alerts} highRiskCount={metrics.highRiskCount} />
        <ActiveContracts contracts={contracts} />
      </main>
      <BottomNav />
    </div>
  );
}
