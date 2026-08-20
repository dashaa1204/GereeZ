import { BookMarked, Quote } from "lucide-react";
import { Eyebrow } from "@/components/app/kit";

const points = [
  {
    title: "Хуулийн эх бичвэр дээр суурилна",
    body: "Иргэний хууль, Хөдөлмөрийн тухай хуулийн эх бичвэрийг индексжүүлж, заалт бүрт хамгийн ойр хуулийн хэсгийг олж тулгадаг. Санамсаргүй зохиосон «хууль» биш.",
  },
  {
    title: "Итгэлцлийн түвшнээ нуухгүй",
    body: "AI бүрэн итгэлтэй биш үед үүнийгээ шууд хэлнэ. Эргэлзээтэй дүгнэлтийг та хуульчаар давхар шалгуулах боломжтой.",
  },
  {
    title: "Ишлэл бүрийг нь өөрөө шалгаж болно",
    body: "Анхааруулга дээрх хуулийн дугаар дээр дарахад тухайн зүйл, заалтын эх бичвэр нээгдэнэ. Бидэнд итгэх шаардлагагүй — уншаад магадлаарай.",
  },
];

export function Grounding() {
  return (
    <section className="border-b border-border bg-muted/40 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div>
          <Eyebrow>
            Яагаад итгэж болох вэ
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Дүгнэлт бүр хуулийн эх сурвалжтай.
          </h2>

          <dl className="mt-10 space-y-8">
            {points.map((point) => (
              <div key={point.title} className="flex gap-4">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
                  <BookMarked className="size-4 text-foreground" />
                </span>
                <div>
                  <dt className="text-base font-semibold text-foreground">
                    {point.title}
                  </dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {point.body}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* mock citation card — the same shape the audit shows for a finding */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
            <span className="size-1.5 rounded-full bg-red-500" />
            Өндөр эрсдэл
          </div>

          <p className="mt-4 text-sm font-semibold text-foreground">
            Гэрээнд бичигдсэн заалт
          </p>
          <blockquote className="mt-2 rounded-xl border-l-2 border-red-400 bg-muted/70 py-3 pr-3 pl-4">
            <Quote className="mb-1.5 size-3.5 text-muted-foreground/60" />
            <p className="text-sm leading-relaxed text-foreground/80 italic">
              «Түрээслэгч гэрээг хугацаанаас өмнө цуцалсан тохиолдолд барьцаа
              мөнгө буцаан олгогдохгүй.»
            </p>
          </blockquote>

          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">
              Зөрчсөн хууль
            </p>
            {/* in the real audit this chip opens the statute text; here it is
                part of the mock, so it is not a link */}
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand/10 px-2.5 py-1.5 text-xs font-semibold text-brand">
              Иргэний хууль · 291.2 дугаар зүйл
            </span>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Барьцааг бүхэлд нь хураах нөхцөлийг гэрээнд нэг талын журмаар
              тогтоох боломжгүй. Учирсан бодит хохирлыг нотлох үүрэг
              түрээслүүлэгчид ногдоно.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              AI-ийн итгэлцэл
            </span>
            <div className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden>
                <span className="h-1.5 w-6 rounded-full bg-brand" />
                <span className="h-1.5 w-6 rounded-full bg-brand" />
                <span className="h-1.5 w-6 rounded-full bg-muted-foreground/20" />
              </span>
              <span className="text-xs font-semibold text-foreground">Дунд</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
