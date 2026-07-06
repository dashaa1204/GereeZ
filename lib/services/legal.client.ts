import type { LegalArticle } from "@/lib/legal-articles";

/**
 * Fetch the statute text behind a citation. Resolves to null when the article
 * isn't in the knowledge base; throws on network/server errors.
 */
export async function fetchLegalArticle(
  law: string,
  article: string,
): Promise<LegalArticle | null> {
  const params = new URLSearchParams({ law, article });
  const response = await fetch(`/api/legal/article?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Хуулийн эх бичвэр татаж чадсангүй");
  }
  const data = await response.json();
  return (data.article as LegalArticle | null) ?? null;
}
