import { BottomNav } from "@/components/dashboard/BottomNav";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function DashboardLoading({ label = "Ачаалж байна…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-5">
        <section className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </section>

        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex gap-3">
            <div className="size-10 animate-pulse rounded-lg bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mt-4 h-32 animate-pulse rounded-lg bg-muted/60" />
        </div>

        <LoadingSpinner label={label} className="py-4" />
      </main>

      <BottomNav />
    </div>
  );
}
