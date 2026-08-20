import Link from "next/link";
import { ArrowRight, ScanLine, Scale, Sparkles } from "lucide-react";
import { AuditPreview } from "./AuditPreview";

const trustChips = [
  { icon: Scale, label: "Иргэний хууль" },
  { icon: Sparkles, label: "AI шинжилгээ" },
  { icon: ScanLine, label: "Сканыг OCR-даж уншина" },
];

/**
 * Dark hero. It is fixed-dark in both themes (like the app's own header
 * banners) so the white-on-dark type and the light product card keep the same
 * contrast whichever theme the visitor arrives in.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-panel pt-28 pb-20 lg:pt-36 lg:pb-28">
      {/* backdrop: a soft emerald bloom behind the copy and a fine grid that
          fades out before it reaches the section edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 60% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[42rem] rounded-full bg-brand/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-56 size-[38rem] rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-12 lg:px-8">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-brand-bright" />
            Монгол улсын хууль тогтоомжид суурилсан
          </span>

          <h1 className="mt-6 text-[2.5rem] leading-[1.08] font-bold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.5rem]">
            Гэрээгээ гарын үсэг зурахаасаа{" "}
            <span className="text-brand-bright">өмнө</span> шалгуулаарай.
          </h1>

          <p className="mt-6 text-base leading-relaxed text-pretty text-white/70 sm:text-lg">
            Гэрээгээ оруулахад GereeZ хуудас тус бүрийг Иргэний хуультай тулгаж,
            эрсдэлтэй заалт бүрийг холбогдох хуулийн зүйл, заалттай нь
            ойлгомжтой монголоор тайлбарлана.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/demo"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
            >
              Демог үнэгүй үзэх
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Бүртгэл үүсгэх
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/45">
            Бүртгэлгүйгээр демо бүртгэлээр шууд орно · Картын мэдээлэл
            шаардахгүй
          </p>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-6">
            {trustChips.map((chip) => (
              <li
                key={chip.label}
                className="flex items-center gap-2 text-xs font-medium text-white/55"
              >
                <chip.icon className="size-4 text-brand-bright/80" />
                {chip.label}
              </li>
            ))}
          </ul>
        </div>

        {/* product shot — nudged off-axis so it reads as a screenshot floating
            over the hero rather than a second column of content */}
        <div className="relative lg:pl-4">
          <div
            aria-hidden
            className="absolute inset-x-6 -bottom-6 h-24 rounded-full bg-brand/20 blur-2xl"
          />
          <div className="relative">
            <AuditPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
