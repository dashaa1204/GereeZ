import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4">
      <LoadingSpinner label="Ачаалж байна…" />
    </div>
  );
}
