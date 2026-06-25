import { Header } from "@/components/dashboard/Header";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { UploadDisclaimer } from "@/components/legal/UploadDisclaimer";
import { getDashboardData } from "@/lib/contracts";

export default async function Home() {
  const { metrics } = await getDashboardData();

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-20">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
        <HomeDashboard metrics={metrics} disclaimer={<UploadDisclaimer />} />
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
}
