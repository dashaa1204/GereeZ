import { LegalFooter } from "@/components/legal/LegalFooter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export function LegalPageLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="size-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <div className="space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
        <LoadingSpinner label="Ачаалж байна…" className="mt-10" />
      </main>

      <LegalFooter />
    </div>
  );
}
