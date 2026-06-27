import { Header } from "@/components/dashboard/Header";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { ComplianceAlerts } from "@/components/dashboard/ComplianceAlerts";
import { ExpiryReminders } from "@/components/dashboard/ExpiryReminders";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { buildDashboardData, fetchContractsForPage } from "@/lib/contracts";

export default async function AlertsPage() {
  const contracts = await fetchContractsForPage();
  const { alerts, metrics } = buildDashboardData(contracts);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-20">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
        <section>
          <h1 className="text-2xl font-bold text-foreground">Анхааруулга</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Хугацаа дуусах болон хуулийн эрсдэлийн мэдэгдэл
          </p>
        </section>

        <ExpiryReminders contracts={contracts} />

        <ComplianceAlerts alerts={alerts} highRiskCount={metrics.highRiskCount} />
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
}
