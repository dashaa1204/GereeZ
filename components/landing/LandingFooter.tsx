import Link from "next/link";
import { BrandMark } from "@/components/app/BrandMark";
import type { SiteContentSlug } from "@/lib/types/site-content";

const productLinks = [
  { href: "#how", label: "Хэрхэн ажилладаг" },
  { href: "#features", label: "Боломжууд" },
  { href: "#pricing", label: "Үнэ" },
  { href: "#faq", label: "Түгээмэл асуулт" },
];

const legalLinks: { slug: SiteContentSlug; label: string }[] = [
  { slug: "disclaimer", label: "Анхааруулга" },
  { slug: "privacy_policy", label: "Нууцлалын бодлого" },
  { slug: "terms_of_service", label: "Үйлчилгээний нөхцөл" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandMark className="size-8 text-foreground" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                GereeZ
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Монгол улсын гэрээний хуулийн нийцлийг AI-аар шалгаж, эрсдэлийг
              ойлгомжтой хэлээр тайлбарлах платформ.
            </p>
          </div>

          <nav aria-label="Бүтээгдэхүүн">
            <p className="text-sm font-semibold text-foreground">
              Бүтээгдэхүүн
            </p>
            <ul className="mt-4 space-y-2.5">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Хууль эрх зүй">
            <p className="text-sm font-semibold text-foreground">
              Хууль эрх зүй
            </p>
            <ul className="mt-4 space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`/legal/${link.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Нэвтрэх
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GereeZ
          </p>
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-right">
            GereeZ нь мэргэжлийн хууль зүйн зөвлөгөө биш. Шинжилгээний үр дүнг
            зөвхөн мэдээллийн зорилгоор ашиглана уу.
          </p>
        </div>
      </div>
    </footer>
  );
}
