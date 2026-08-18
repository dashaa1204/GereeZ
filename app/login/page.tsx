import type { Metadata } from "next";
import { Suspense } from "react";
import { Eye, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { AuthForm } from "@/components/auth/AuthForm";
import { BrandMark } from "@/components/app/BrandMark";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { demoCredentials } from "@/lib/demo-user";

export const metadata: Metadata = { title: "Нэвтрэх" };

const highlights = [
  { icon: Upload, text: "PDF эсвэл зурган гэрээгээ оруулна" },
  { icon: Sparkles, text: "AI хуудас тус бүрийг шинжилнэ" },
  { icon: ShieldCheck, text: "Монгол хуулийн зөрчлийг тайлагнана" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const demoFailed = (await searchParams).demo === "failed";
  return (
    /* One centered card on the phone; from lg up the empty space becomes a
       brand panel instead of margin. */
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10 lg:flex-row lg:items-stretch lg:p-0">
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-zinc-900 p-12 text-white xl:p-16">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-9 text-white" />
          <span className="text-2xl font-semibold">GereeZ</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            Гэрээгээ гарын үсэг зурахаасаа өмнө шалгуулаарай.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Монгол улсын хууль тогтоомжид нийцэж байгаа эсэхийг AI шинжилж,
            эрсдэлтэй заалт бүрийг холбогдох хуулийн зүйл заалттай нь харуулна.
          </p>
          <ul className="mt-8 space-y-3.5">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <h.icon className="size-4" />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">
          GereeZ · Монгол хуулийн нийцлийн систем
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center lg:w-1/2 lg:px-8 lg:py-12">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
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
          <AuthForm />
        </Suspense>

        {demoFailed && (
          <p className="mt-4 w-full max-w-sm rounded-lg bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
            Демо бүртгэлээр нэвтэрч чадсангүй. Доорх маягтаар нэвтэрнэ үү.
          </p>
        )}

        {demoCredentials() && (
          <div className="mt-4 w-full max-w-sm text-center">
            <a
              href="/demo"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-navy/20 bg-white text-sm font-semibold text-navy transition-colors hover:bg-navy/5"
            >
              <Eye className="size-4" />
              Демо бүртгэлээр үзэх
            </a>
            <p className="mt-2 text-xs text-muted-foreground">
              Бүртгүүлэхгүйгээр жишээ гэрээ, аудитын дүнг харна.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
