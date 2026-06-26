import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <LoadingSpinner label="Ачаалж байна…" />
    </div>
  );
}
