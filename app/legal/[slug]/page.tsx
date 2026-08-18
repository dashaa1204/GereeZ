import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import {
  LegalContentBody,
  LegalFooter,
} from "@/components/legal/LegalFooter";
import { getSiteContent, isValidSiteContentSlug } from "@/lib/site-content";
import type { SiteContentSlug } from "@/lib/types/site-content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return [
    { slug: "disclaimer" },
    { slug: "privacy_policy" },
    { slug: "terms_of_service" },
  ];
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidSiteContentSlug(slug)) {
    return { title: "Олдсонгүй" };
  }

  const content = await getSiteContent(slug as SiteContentSlug);
  return {
    title: `${content.title} | GereeZ`,
    description: content.title,
  };
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;

  if (!isValidSiteContentSlug(slug)) {
    notFound();
  }

  const content = await getSiteContent(slug as SiteContentSlug);
  const updatedAt = new Date(content.updated_at);

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3 lg:px-8 lg:py-4">
        <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-3xl">
          <Link
            href="/"
            className="flex size-8 items-center justify-center rounded-lg text-navy hover:bg-muted"
            aria-label="Буцах"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold text-navy">{content.title}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 lg:max-w-3xl lg:px-8 lg:py-10">
        <LegalContentBody content={content.content} />
        {updatedAt.getTime() > 0 && (
          <p className="mt-8 text-[11px] text-muted-foreground">
            Сүүлд шинэчлэгдсэн:{" "}
            {updatedAt.toLocaleDateString("mn-MN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </main>

      <LegalFooter />
    </div>
  );
}
