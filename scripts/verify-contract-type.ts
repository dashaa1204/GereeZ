/**
 * Verify contract-type detection and per-law retrieval against the live
 * vector store. Retrieval-only — no paid audit LLM call.
 *
 * Usage:
 *   node ./node_modules/tsx/dist/cli.mjs --env-file=.env.local scripts/verify-contract-type.ts
 */
import { detectContractType, LAW_NAME_BY_CONTRACT_TYPE } from "../lib/contract-type";
import { retrieveLegalContext } from "../lib/vector-store";
import { hasEmbeddingApiKey } from "../lib/env";

const employmentContract = `
ХӨДӨЛМӨРИЙН ГЭРЭЭ
Ажил олгогч: "Номин Трейд" ХХК
Ажилтан: С.Сараа
Албан тушаал: нягтлан бодогч
Сарын үндсэн цалин: 2,000,000 төгрөг, сар бүрийн 10-нд олгоно.
Ажлын цаг: өдөрт 8 цаг. Илүү цагаар ажиллуулбал нэмэгдэл хөлс олгоно.
Ажилтан жил бүр ээлжийн амралт эдэлнэ. Нийгмийн даатгалыг ажил олгогч төлнө.
Туршилтын хугацаа 6 сар байна.
Ажил олгогч гэрээг хэдийд ч нэг талын санаачилгаар цуцалж болно.
`;

const rentalContract = `
ТҮРЭЭСИЙН ГЭРЭЭ
Түрээслүүлэгч: Батбаяр
Түрээслэгч: Эрдэнэ-Очир
Орон сууц: Шангри-Ла #402
Сарын түрээс: 4,500,000 төгрөг. Барьцаа: 2 сарын түрээс.
Түрээслүүлэгч хүссэн үедээ урьдчилан мэдэгдэлгүйгээр гэрээг цуцалж болно.
`;

function section(title: string) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

async function checkRetrieval(name: string, contractText: string) {
  section(name);

  const contractType = detectContractType(contractText);
  const expectedLaw = LAW_NAME_BY_CONTRACT_TYPE[contractType];
  console.log(`Танигдсан төрөл: ${contractType} → ${expectedLaw}`);

  const context = await retrieveLegalContext(contractText, { contractType });
  console.log(`Татагдсан зүйл: ${context.matches.length}`);
  for (const match of context.matches.slice(0, 6)) {
    console.log(
      `  [${match.law_name}] ${match.article_number ?? "?"} зүйл — ${(match.similarity * 100).toFixed(1)}% — ${(match.section_title ?? "").slice(0, 55)}`,
    );
  }

  const wrongLaw = context.matches.filter((m) => m.law_name !== expectedLaw);
  if (context.matches.length === 0) {
    console.log("⚠ Юу ч татагдсангүй — мэдлэгийн сан эсвэл threshold-оо шалга");
  } else if (wrongLaw.length > 0) {
    console.log(`✗ ${wrongLaw.length} зүйл өөр хуулиас ирсэн!`);
  } else {
    console.log(`✓ Бүх зүйл «${expectedLaw}»-иас ирсэн`);
  }
}

async function main() {
  if (!hasEmbeddingApiKey()) {
    console.log(
      "Embedding key байхгүй — vector retrieval шалгах боломжгүй. .env.local-д GEMINI_API_KEY тохируулна уу.",
    );
    process.exit(1);
  }

  await checkRetrieval("Хөдөлмөрийн гэрээ → Хөдөлмөрийн тухай хууль", employmentContract);
  await checkRetrieval("Түрээсийн гэрээ → Иргэний хууль", rentalContract);
}

main().catch((err) => {
  console.error("\nVERIFY ERROR:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) console.error("Cause:", err.cause);
  process.exit(1);
});
