import { canonicalLawName } from "@/lib/contract-type";
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

/**
 * When each law in the knowledge base was last ingested, keyed by law name.
 *
 * `ingestLegalText` replaces a law's rows wholesale, so the newest `created_at`
 * under a law name is that law's current version stamp. The notification feed
 * compares it against each audit's timestamp to flag contracts that were
 * measured against superseded text (see lib/notifications.ts).
 *
 * Fails soft to an empty map — a missing `law_last_updated` RPC (migration 013
 * not run yet) must not take the app down, it just means no such alerts.
 */
let lawVersionsUnavailable = false;

export async function getLawLastUpdated(): Promise<Map<string, string>> {
  // Every app page load asks for this. Once we know the RPC isn't there, stop
  // asking (and stop logging) rather than repeating the same miss per request.
  if (lawVersionsUnavailable) return new Map();

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("law_last_updated");
    if (error) {
      // PGRST202: the function doesn't exist — migration 013 hasn't been run.
      if (error.code === "PGRST202") {
        lawVersionsUnavailable = true;
        console.warn(
          "law_last_updated RPC missing (run migration 013) — law-update alerts are off.",
        );
      } else {
        console.error("getLawLastUpdated failed:", error.message);
      }
      return new Map();
    }
    const rows = (data ?? []) as { law_name: string; last_updated: string }[];
    // Keyed the same way `lawsBehindAudit` names the laws it reads out of an
    // audit, or the comparison is folded on one side only: an audit that says
    // «Иргэний хууль» would look up a row stored under a decorated spelling
    // and find nothing, which reads as "the law has not moved" — the failure
    // nobody sees. Two spellings of one law collapse to their newest ingest,
    // since that is the version the chunks under either name now hold.
    const versions = new Map<string, string>();
    for (const row of rows) {
      const law = canonicalLawName(row.law_name) ?? row.law_name;
      const seen = versions.get(law);
      if (seen && !(Date.parse(row.last_updated) > Date.parse(seen))) continue;
      versions.set(law, row.last_updated);
    }
    return versions;
  } catch (err) {
    // Missing service-role env: same fail-soft as a query error.
    lawVersionsUnavailable = true;
    console.error("getLawLastUpdated failed:", err);
    return new Map();
  }
}
