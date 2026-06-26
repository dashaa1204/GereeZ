import { Suspense } from "react";
import { Home } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-navy text-white">
          <Home className="size-5" />
        </div>
        <span className="text-2xl font-semibold text-navy">GereeZ</span>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-10 shadow-sm">
            <LoadingSpinner label="Ачаалж байна…" />
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
