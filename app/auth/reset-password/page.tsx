import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandMark } from "@/components/app/BrandMark";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export const metadata: Metadata = { title: "Нууц үг сэргээх" };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-9 text-navy" />
        <span className="text-2xl font-semibold text-navy">GereeZ</span>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-10 shadow-sm">
            <LoadingSpinner label="Ачаалж байна…" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
