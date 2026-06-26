import { BottomNav } from "@/components/dashboard/BottomNav";
import { LegalFooter } from "@/components/legal/LegalFooter";

function ContractRowSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-8 animate-pulse rounded-full bg-muted" />
        <div className="size-4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export function ContractsLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
        <section className="space-y-2">
          <div className="h-8 w-44 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </section>

        <div className="space-y-2">
          <ContractRowSkeleton />
          <ContractRowSkeleton />
          <ContractRowSkeleton />
        </div>
      </main>

      <LegalFooter />
      <BottomNav />
    </div>
  );
}
