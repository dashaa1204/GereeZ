import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BrandMark } from "@/components/app/BrandMark";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { isDemoEmail } from "@/lib/demo-user";
import { DASHBOARD_PATH } from "@/lib/routes";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "Нууц үг сэргээх" };

export default async function ResetPasswordPage() {
  // This form sets a password on whatever session the browser is holding. A
  // visitor arriving from /demo is holding the shared demo session, so the
  // page would hand them the demo account's password — and lock everyone else
  // (including DEMO_USER_PASSWORD) out of it. A real recovery link has no
  // session yet: the code is exchanged in the browser, after this check.
  const user = await getAuthenticatedUser();
  if (isDemoEmail(user?.email)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
        <div className="mb-8 flex items-center gap-2">
          <BrandMark className="size-9 text-foreground" />
          <span className="text-2xl font-semibold text-foreground">GereeZ</span>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Демо бүртгэл
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Энэ бүртгэлийг бүх зочин хуваалцдаг тул нууц үгийг нь солих
            боломжгүй. Өөрийн бүртгэл үүсгэвэл бүх тохиргоо нээлттэй.
          </p>
          <Link
            href={DASHBOARD_PATH}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Буцах
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-9 text-foreground" />
        <span className="text-2xl font-semibold text-foreground">GereeZ</span>
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
