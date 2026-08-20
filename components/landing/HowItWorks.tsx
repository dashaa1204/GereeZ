import { FileSearch, ShieldCheck, UploadCloud } from "lucide-react";
import { Eyebrow } from "@/components/app/kit";

const steps = [
  {
    icon: UploadCloud,
    title: "Гэрээгээ оруулна",
    body: "PDF эсвэл гар утсаар авсан зургаа чирээд тавина. Скан хийсэн хуудсыг OCR-даж бичвэр болгож уншина.",
    meta: "PDF, JPG, PNG · 20 MB хүртэл",
  },
  {
    icon: FileSearch,
    title: "AI хуудас тус бүрийг шинжилнэ",
    body: "Гэрээний заалт бүрийг Иргэний хуулийн холбогдох зүйл, заалтын эх бичвэртэй тулгаж шалгана.",
    meta: "1 хуудас = 1 кредит",
  },
  {
    icon: ShieldCheck,
    title: "Ойлгомжтой тайлан авна",
    body: "Нийцлийн оноо, эрсдэлийн зэрэглэл бүхий анхааруулга, хуулийн ишлэл, засварын саналыг нэг дор харна.",
    meta: "Дунджаар 1–2 минут",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="scroll-mt-20 border-b border-border bg-muted/40 py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <Eyebrow>
            Хэрхэн ажилладаг вэ
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Гурван алхам. Хуульчид очих шаардлагагүй.
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 lg:mt-16 lg:grid-cols-3 lg:gap-7">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6 lg:p-7"
            >
              {/* the connector only makes sense once the steps sit in a row */}
              {index < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-[1.9rem] hidden h-px w-7 bg-border lg:block"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
                  <step.icon className="size-5" />
                </span>
                <span className="text-4xl font-bold text-foreground/8 tabular-nums">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <p className="mt-5 border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                {step.meta}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
