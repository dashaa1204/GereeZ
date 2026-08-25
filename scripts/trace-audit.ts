/**
 * Trace where a finding's legal citation came from.
 *
 *   npm run trace:audit -- 287                     # every audit citing art. 287
 *   npm run trace:audit -- <contract-uuid>         # one contract, all findings
 *
 * The audit itself is not logged anywhere, but every run stores enough in
 * `contracts.audit_summary` to reconstruct the important part: which articles
 * RAG actually retrieved (`retrievedArticles`, with similarity scores) versus
 * which article the model ended up citing (`alerts[].articleReference`). When a
 * cited article is missing from the retrieved set, the citation did not come
 * from the knowledge base — it came from the model, most likely anchored on the
 * "287–301" range that lib/audit/prompt.ts and the empty-retrieval fallbacks
 * name in plain text.
 *
 * Read-only. Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import type { AuditSummary, Contract } from "../lib/types/contract";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !serviceKey) throw new Error("Missing Supabase env vars");

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Same rule as `parseArticleNumber` in lib/legal-articles.ts — inlined because
 * that module pulls in the Next.js request context, which a plain script has
 * no business loading.
 */
function parseArticleNumber(articleReference: string): string | null {
  const match = articleReference.match(/\d{1,3}/);
  return match ? match[0] : null;
}

function line(char = "─", n = 72) {
  console.log(char.repeat(n));
}

/** Stored statute text for a citation — the same lookup the finding card does. */
async function storedArticle(lawName: string, articleNumber: string) {
  const { data } = await supabase
    .from("legal_documents")
    .select("section_title, content")
    .eq("law_name", lawName)
    .eq("article_number", articleNumber)
    .order("section_title", { ascending: true });
  if (!data || data.length === 0) return null;
  return {
    sectionTitle: (data[0].section_title as string | null) ?? null,
    content: data.map((r) => (r.content as string).trim()).join("\n\n"),
  };
}

async function report(contract: Contract, onlyArticle: string | null) {
  const s = contract.audit_summary as AuditSummary | null;
  line("═");
  console.log(`Гэрээ:      ${contract.file_name}`);
  console.log(`id:         ${contract.id}`);
  console.log(`Шинжилсэн:  ${contract.updated_at}  (оноо: ${contract.compliance_score})`);
  if (!s) {
    console.log("audit_summary хоосон — мөрдөх мэдээлэл алга.");
    return;
  }
  console.log(
    `Төрөл:      ${s.contractType ?? "(тодорхойгүй — хуучин audit, rental-аар ажилласан)"}`,
  );
  console.log(
    `Горим:      demoMode=${s.demoMode ?? false}  cachedFromPriorAudit=${
      s.cachedFromPriorAudit ?? false
    }`,
  );

  const retrieved = s.retrievedArticles ?? [];
  console.log(`\nRAG-аас татсан зүйлүүд (${retrieved.length}):`);
  if (retrieved.length === 0) {
    console.log(
      "  ⚠ ХООСОН. Retrieval ажиллаагүй эсвэл хадгалагдаагүй → модель prompt дахь\n" +
        "    «түрээст хамаарах зүйлс (287–301)» гэсэн хүрээнээс иш таталт авсан байх магадлалтай.",
    );
  } else {
    for (const r of retrieved) {
      console.log(
        `  • ${String(r.articleNumber ?? "?").padStart(4)} — ${(r.similarity * 100).toFixed(1)}%  ${
          r.sectionTitle ?? ""
        }`,
      );
    }
  }
  const retrievedNumbers = new Set(
    retrieved.map((r) => r.articleNumber).filter(Boolean) as string[],
  );

  for (const alert of s.alerts ?? []) {
    const cited = parseArticleNumber(alert.articleReference);
    if (onlyArticle && cited !== onlyArticle) continue;

    line();
    console.log(`[${alert.severity}] ${alert.title}`);
    console.log(`  ${alert.description}`);
    if (alert.contractClause) console.log(`  Гэрээний заалт: ${alert.contractClause}`);
    console.log(`  Иш таталт:      ${alert.lawName} — ${alert.articleReference}`);
    console.log(`  confidence:     ${alert.confidence ?? "(байхгүй)"}`);

    if (!cited) {
      console.log("  → Зүйлийн дугааргүй иш таталт, шалгах зүйлгүй.");
      continue;
    }

    const inContext = retrievedNumbers.has(cited);
    console.log(
      inContext
        ? `  → ${cited} дугаар зүйл RAG контекстэд БАЙСАН — иш таталт эх сурвалжаас гаралтай.`
        : `  → ⚠ ${cited} дугаар зүйл RAG контекстэд БАЙГААГҮЙ — модель өөрөө нэмсэн\n` +
            "     (prompt дахь 287–301 хүрээ, эсвэл зохиомол иш таталт).",
    );

    const article = await storedArticle(alert.lawName, cited);
    if (!article) {
      console.log(`  → Мэдлэгийн санд ${alert.lawName} ${cited} дугаар зүйл алга.`);
      continue;
    }
    console.log(`  Санд хадгалсан текст: ${article.sectionTitle ?? "(гарчиггүй)"}`);
    console.log(
      article.content
        .split("\n")
        .slice(0, 6)
        .map((l) => `    ${l}`)
        .join("\n"),
    );
  }
}

async function main() {
  const arg = process.argv[2]?.trim();
  if (!arg) {
    throw new Error(
      "Ашиглах: npm run trace:audit -- <зүйлийн дугаар | contract uuid>",
    );
  }

  if (UUID.test(arg)) {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", arg)
      .single();
    if (error || !data) throw new Error(`Гэрээ олдсонгүй: ${error?.message}`);
    await report(data as Contract, null);
    return;
  }

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("status", "completed")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const hits = (data as Contract[]).filter((c) =>
    (c.audit_summary?.alerts ?? []).some(
      (a) => parseArticleNumber(a.articleReference) === arg,
    ),
  );

  console.log(
    `Сүүлийн ${data.length} шинжилгээнээс ${arg} дугаар зүйлийг иш татсан нь: ${hits.length}\n`,
  );
  for (const contract of hits) await report(contract, arg);
}

main().catch((err) => {
  console.error("\nTRACE ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
