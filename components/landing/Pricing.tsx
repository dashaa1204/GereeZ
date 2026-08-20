import Link from "next/link";
import { ArrowRight, Check, Info } from "lucide-react";
import { Eyebrow } from "@/components/app/kit";

const included = [
  "Хуудас бүрийн бүрэн хуулийн шинжилгээ",
  "Нийцлийн оноо ба эрсдэлийн зэрэглэл",
  "Иргэний хуулийн зүйл, заалтын ишлэл",
  "Гэрээний мэдээлэл автоматаар салгах",
  "Засварын захидлын төсөл",
  "Хугацаа дуусах сануулга",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-20 border-b border-border bg-background py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>
            Үнэ
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Захиалга байхгүй. Шинжлүүлсэн хуудсныхаа төлөө л төлнө.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground">
            Хэдэн хуудас шинжлүүлэхээ урьдчилж харна. Зөвшөөрсний дараа л кредит
            зарцуулагдана.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-7">
          {/* the unit */}
          <div className="flex flex-col justify-center rounded-2xl bg-panel p-8 text-white lg:p-10">
            <p className="text-sm font-medium text-white/60">Нэгж үнэ</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-bold tracking-tight">1</span>
              <span className="text-lg font-medium text-white/70">кредит</span>
            </p>
            <p className="mt-2 text-sm text-white/60">
              шинжлүүлсэн хуудас тутамд
            </p>
            <p className="mt-6 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/70">
              4 хуудастай гэрээ = 4 кредит. Гэрээгээ оруулахад үнийн санал
              гарч ирнэ — зөвшөөрөх эсэх нь таны сонголт.
            </p>
          </div>

          {/* what you get */}
          <div className="rounded-2xl border border-border bg-card p-8 lg:p-10">
            <p className="text-sm font-semibold text-foreground">
              Шинжилгээ бүрд багтах зүйлс
            </p>
            <ul className="mt-5 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/12">
                    <Check className="size-3 text-brand" />
                  </span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/demo"
              className="group mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Демо дээр туршиж үзэх
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Honesty note: there is no payment provider wired up yet, so the page
            must not imply that credits can be bought. */}
        <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Төлбөрийн систем хараахан холбогдоогүй байгаа тул кредит одоогоор
            демо горимоор цэнэглэгдэнэ.
          </span>
        </p>
      </div>
    </section>
  );
}
