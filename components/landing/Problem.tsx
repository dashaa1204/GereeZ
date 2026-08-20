import { Ban, PiggyBank, TrendingUp } from "lucide-react";
import { Eyebrow } from "@/components/app/kit";

const pains = [
  {
    icon: PiggyBank,
    title: "Барьцаа буцаж ирдэггүй",
    body: "«Аливаа гэмтлийн төлөө барьцааг суутгана» гэсэн бүрхэг заалт нь нүүх үед бүх барьцааг алдах эрсдэлийг үүсгэдэг.",
  },
  {
    icon: TrendingUp,
    title: "Түрээс дур мэдэн нэмэгддэг",
    body: "Нэмэгдүүлэх хязгаар, урьдчилан мэдэгдэх хугацааг заагаагүй гэрээ түрээслүүлэгчид хязгааргүй эрх өгдөг.",
  },
  {
    icon: Ban,
    title: "Цуцлах нөхцөл нэг талдаа",
    body: "Түрээслэгч цуцлахад торгууль, түрээслүүлэгч цуцлахад ямар ч үр дагаваргүй — ийм тэнцвэргүй заалт түгээмэл.",
  },
];

export function Problem() {
  return (
    <section className="border-b border-border bg-background py-20 lg:py-28">
      <div className="mx-auto w-full max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <Eyebrow>
            Асуудал
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Гэрээ уншихад хэцүү учраас л хүмүүс уншдаггүй.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground">
            Түрээс, ажил, зээл, үйлчилгээний гэрээ — олон хуудас хуулийн хэллэг.
            Уншсан ч аль заалт нь хууль зөрчиж байгааг хуульч биш хүн ялгаж
            чаддаггүй. Асуудал нь ихэвчлэн гарын үсэг зурснаас хойш л мэдэгддэг.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {pains.map((pain) => (
            <div
              key={pain.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/15"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-red-500/10">
                <pain.icon className="size-5 text-red-500" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-foreground">
                {pain.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pain.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
