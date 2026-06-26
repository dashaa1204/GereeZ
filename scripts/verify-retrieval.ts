import { analyzeContractText } from "../lib/audit";
import {
  buildContractSearchQueries,
  extractTenancyKeywords,
} from "../lib/vector-store";
import { hasEmbeddingApiKey } from "../lib/env";

const sampleContract = `
ТҮРЭЭСИЙН ГЭРЭЭ
Түрээслүүлэгч: Батбаяр
Түрээслэгч: Эрдэнэ-Очир
Орон сууц: Шангри-Ла #402
Сарын түрээс: 4,500,000 төгрөг
Хугацаа: 12 сар
Барьцаа: 2 сарын түрээс
Гэрээг хугацаанаас өмнө цуцлах тохиолдолд түрээслэгч 1 сарын түрээс төлнө.
Түрээслүүлэгч хүссэн үедээ урьдчилан мэдэгдэлгүйгээр гэрээг цуцалж болно.
Барьцааг ямар ч тохиолдолд буцаан олгохгүй.
`;

function section(title: string) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

async function main() {
  section("1) Keyword-focusing шалгалт (миний өөрчлөлт)");
  const keywords = extractTenancyKeywords(sampleContract);
  const keywordList = keywords.split(", ");
  console.log("Олдсон keyword-ууд:", keywords);
  console.log("Тоо:", keywordList.length);
  console.assert(
    keywordList.length <= 4,
    "FAIL: keyword тоо 4-өөс хэтэрсэн",
  );
  console.log(keywordList.length <= 4 ? "✓ дээд тал нь 4 keyword" : "✗ хэт олон");

  const queries = buildContractSearchQueries(sampleContract);
  console.log(`\nҮүсгэсэн query тоо: ${queries.length}`);
  queries.forEach((q, i) =>
    console.log(`  [${i + 1}] ${q.slice(0, 90).replace(/\n/g, " ")}…`),
  );

  section("2) Retrieval зам");
  console.log(
    hasEmbeddingApiKey()
      ? "Embedding key БАЙНА → vector RAG (threshold 0.4) идэвхтэй"
      : "Embedding key БАЙХГҮЙ → keyword fallback (ilike) ашиглана.\n" +
          "  ⚠ Vector threshold 0.4 + keyword-focusing өөрчлөлт энд идэвхжихгүй.",
  );

  section("3) Бүрэн audit (end-to-end)");
  const result = await analyzeContractText(sampleContract);
  console.log("Compliance score:", result.complianceScore);
  console.log("Retrieved articles:", result.retrievedContext.matches.length);
  console.log(`\nSummary:\n${result.summary}`);
  console.log(`\nAlerts (${result.alerts.length}):`);
  for (const a of result.alerts) {
    const conf = a.confidence ? `, итгэл: ${a.confidence}` : "";
    console.log(`\n  • [${a.severity}${conf}] ${a.title}`);
    if (a.description) console.log(`    ${a.description}`);
    if (a.contractClause) console.log(`    Гэрээний заалт: ${a.contractClause}`);
    console.log(`    Хуулийн үндэслэл: ${a.lawName} — ${a.articleReference}`);
  }
  console.log(`\nStrengths (${result.strengths.length}):`);
  for (const s of result.strengths) console.log(`  + ${s}`);
}

main().catch((err) => {
  console.error("\nVERIFY ERROR:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) console.error("Cause:", err.cause);
  process.exit(1);
});
