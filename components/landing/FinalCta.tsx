import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="bg-background py-20 lg:py-24">
      <div className="mx-auto w-full max-w-6xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-panel px-6 py-16 text-center lg:px-16 lg:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 size-[34rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance text-white sm:text-4xl lg:text-[2.75rem]">
              Гарын үсэг зурчихаад биш, зурахаасаа өмнө мэдээрэй.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-pretty text-white/65">
              Гэрээгээ оруулаад хэдхэн минутын дотор юу зөрчигдөж байгааг,
              хаана эрсдэж байгааг тодорхой хараарай.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/demo"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
              >
                Демог үнэгүй үзэх
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Бүртгэл үүсгэх
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
