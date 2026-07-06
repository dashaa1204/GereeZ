import { createAdminClient } from "@/lib/supabase-server";

/** The stored statute text behind a cited article, shown under a finding. */
export interface LegalArticle {
  lawName: string;
  /** Top-level article number, e.g. "296". */
  articleNumber: string;
  /** Header line of the article (e.g. "296 дугаар зүйл. Барьцаа"). */
  sectionTitle: string | null;
  /** Full article body from the legal knowledge base. */
  content: string;
}

/**
 * Pull the top-level article number out of a citation string.
 * Sub-clause refs collapse to their parent article, whose stored content
 * already contains the sub-clauses: "296.1 дүгээр зүйл" → "296". Ranges take
 * the first article: "287–301 дүгээр зүйлүүд" → "287". Null when there's no
 * number to look up.
 */
export function parseArticleNumber(articleReference: string): string | null {
  const match = articleReference.match(/\d{1,3}/);
  return match ? match[0] : null;
}

/**
 * Fetch the full statute text for a cited article so the audit can show the
 * user the actual Mongolian law behind a finding — the thing a plain chatbot
 * can't produce. Returns null when the citation can't be matched to a stored
 * article (older/looser citations, or laws not yet ingested).
 */
export async function getLegalArticle(
  lawName: string,
  articleReference: string,
): Promise<LegalArticle | null> {
  const articleNumber = parseArticleNumber(articleReference);
  if (!articleNumber) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("law_name, article_number, section_title, content")
    .eq("law_name", lawName)
    .eq("article_number", articleNumber)
    // Oversized articles are stored as "… (part 1)", "(part 2)" — keep order.
    .order("section_title", { ascending: true });

  if (error) {
    console.error("getLegalArticle failed:", error.message);
    return null;
  }
  if (!data || data.length === 0) return null;

  return {
    lawName: data[0].law_name as string,
    articleNumber,
    sectionTitle: (data[0].section_title as string | null) ?? null,
    content: data
      .map((row) => (row.content as string).trim())
      .join("\n\n")
      .trim(),
  };
}
