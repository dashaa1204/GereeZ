import { Header } from "@/components/dashboard/Header";
import { ActiveContracts } from "@/components/dashboard/ActiveContracts";
import { ContractsSummary } from "@/components/dashboard/ContractsSummary";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { LegalFooter } from "@/components/legal/LegalFooter";
import { fetchContractsForPage } from "@/lib/contracts";

export default async function ContractsPage() {
  const contracts = await fetchContractsForPage();

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-20">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
        <section>
          <h1 className="text-2xl font-bold text-foreground">Миний гэрээнүүд</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Гэрээ, хугацаа, эрсдэлийг нэг дороос
          </p>
        </section>

        {contracts.length > 0 && <ContractsSummary contracts={contracts} />}

        <ActiveContracts contracts={contracts} showHeader={false} />
      </main>
      <LegalFooter />
      <BottomNav />
    </div>
  );
}
