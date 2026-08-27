import {
  BellRing,
  BookOpen,
  Gauge,
  Mail,
  ScanLine,
  Table2,
} from "lucide-react";
import { Eyebrow } from "@/components/app/kit";
import { PROPOSAL_RUNS_PER_AUDIT } from "@/lib/proposal-quota";

const features = [
  {
    icon: Gauge,
    title: "Нийцлийн оноо",
    body: "0–100 оноо нэг харцаар гэрээ хэр аюулгүйг хэлнэ. Ногоон — нийцсэн, улаан — зөрчилтэй.",
  },
  {
    icon: BookOpen,
    title: "Хуулийн ишлэл",
    body: "Анхааруулга бүр Иргэний хуулийн тодорхой зүйл, заалттай холбогдоно. Ишлэл дээр дарж эх бичвэрийг нь уншина.",
  },
  {
    icon: Table2,
    title: "Гэрээний мэдээлэл автоматаар",
    body: "Талууд, төлбөрийн дүн, барьцаа, эхлэх/дуусах огноо, төлбөрийн өдрийг гэрээнээс автоматаар уншиж нэг дор харуулна.",
  },
  {
    icon: Mail,
    title: "Засварын захидал",
    body: `Олдсон зөрчил дээр тулгуурлан гэрээний нөгөө тал руу илгээхэд бэлэн албан ёсны захидлыг боловсруулж өгнө. Шинжилгээний үнэд багтсан — нэг гэрээнд ${PROPOSAL_RUNS_PER_AUDIT} хүртэл хувилбар үүсгэнэ.`,
  },
  {
    icon: BellRing,
    title: "Хугацааны сануулга",
    body: "Гэрээ дуусах хугацаа ойртоход сануулж, шинэчлэх эсэхээ шийдэх боломжийг тань олгоно.",
  },
  {
    icon: ScanLine,
    title: "Сканыг ч уншина",
    body: "Гар утсаар авсан зураг, скан хийсэн хуудсыг Google Cloud Vision-оор бичвэр болгож шинжилнэ.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-b border-border bg-background py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-6xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <Eyebrow>
            Боломжууд
          </Eyebrow>
          <h2 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-balance text-foreground sm:text-4xl">
            Зөвхөн «эрсдэлтэй» гэж хэлээд орхихгүй.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-pretty text-muted-foreground">
            Аль заалт, ямар хуулийг, яагаад зөрчиж байгаа, юу хийвэл зөв болохыг
            нь хамт хэлнэ.
          </p>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3 lg:gap-y-12">
          {features.map((feature) => (
            <div key={feature.title}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10">
                <feature.icon className="size-5 text-brand" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
