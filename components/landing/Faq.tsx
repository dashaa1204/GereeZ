import { Plus } from "lucide-react";
import { Eyebrow } from "@/components/app/kit";

const faqs = [
  {
    q: "Энэ хуульчийн зөвлөгөө мөн үү?",
    a: "Үгүй. GereeZ бол гэрээгээ ойлгоход туслах хэрэгсэл болохоос мэргэжлийн хууль зүйн зөвлөгөө биш. Ноцтой эргэлзээ гарвал хуульчид хандаарай — гэхдээ ярилцахаасаа өмнө юу асуухаа мэдэж очно.",
  },
  {
    q: "Ямар төрлийн гэрээ дэмждэг вэ?",
    a: "Одоогоор орон сууцны түрээс болон иргэний эрх зүйн гэрээнд төвлөрсөн. Хөдөлмөрийн тухай хуулийн эх бичвэрийг индексжүүлсэн бөгөөд бусад төрлийн гэрээг үе шаттай нэмж байна.",
  },
  {
    q: "Гар утсаар авсан зураг болох уу?",
    a: "Болно. Скан хийсэн эсвэл гэрэл зургаар авсан хуудсыг OCR-даж бичвэр болгон уншина. Тод, бүтэн хуудас харагдсан зураг байх тусам үр дүн сайн гарна.",
  },
  {
    q: "Миний гэрээ хаана хадгалагдах вэ?",
    a: "Файл болон шинжилгээний үр дүн танай бүртгэлд хадгалагдана. Гэрээгээ хүссэн үедээ, эсвэл бүртгэлээ бүхэлд нь устгах боломжтой.",
  },
  {
    q: "AI буруу дүгнэвэл яах вэ?",
    a: "Дүгнэлт бүр дээр AI хэр итгэлтэй байгааг харуулдаг ба хуулийн ишлэлийг нь эх бичвэртэй нь холбож өгдөг. Тиймээс та үр дүнг сохроор хүлээж авахгүй, өөрөө шалгах боломжтой.",
  },
  {
    q: "Бүртгүүлэхгүйгээр үзэж болох уу?",
    a: "Болно. «Демог үнэгүй үзэх» товч танийг урьдчилан бэлтгэсэн жишээ бүртгэлд оруулж, шинжилгээний бүрэн үр дүнг харуулна.",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="scroll-mt-20 border-b border-border bg-muted/40 py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-3xl px-5 lg:px-8">
        <div className="text-center">
          <Eyebrow>
            Түгээмэл асуулт
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Асуухыг хүсч байсан зүйлс
          </h2>
        </div>

        {/* Native <details> so the accordion works without JavaScript. */}
        <div className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-border bg-card px-5 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                {faq.q}
                <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
