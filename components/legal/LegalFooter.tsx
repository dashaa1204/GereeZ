import Link from "next/link";
import type { SiteContentSlug } from "@/lib/types/site-content";

const LEGAL_LINKS: { slug: SiteContentSlug; label: string }[] = [
  { slug: "disclaimer", label: "Анхааруулга" },
  { slug: "privacy_policy", label: "Нууцлалын бодлого" },
  { slug: "terms_of_service", label: "Үйлчилгээний нөхцөл" },
];

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-white px-4 py-6">
      <div className="mx-auto max-w-md space-y-3">
        <p className="text-center text-[10px] text-muted-foreground">
          GereeZ нь мэргэжлийн хууль зүйн зөвлөгөө биш. Шинжилгээний үр дүнг
          зөвхөн мэдээллийн зорилгоор ашиглана уу.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.slug}
              href={`/legal/${link.slug}`}
              className="text-[11px] font-medium text-navy underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function LegalContentBody({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-foreground">
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split("\n");
        const isBulletBlock = lines.every(
          (line) => line.trim().startsWith("•") || line.trim() === "",
        );

        if (isBulletBlock) {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 text-muted-foreground">
              {lines
                .filter((line) => line.trim().startsWith("•"))
                .map((line) => (
                  <li key={line}>{line.replace(/^•\s*/, "")}</li>
                ))}
            </ul>
          );
        }

        return (
          <p key={index} className="whitespace-pre-wrap text-muted-foreground">
            {paragraph}
          </p>
        );
      })}
    </div>
  );
}
