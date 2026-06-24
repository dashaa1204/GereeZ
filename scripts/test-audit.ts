import { analyzeContractText } from "../lib/audit";

const sampleContract = `
ТҮРЭЭСИЙН ГЭРЭЭ
Түрээслүүлэгч: Батбаяр
Түрээслэгч: Эрдэнэ-Очир
Орон сууц: Шангри-Ла #402
Сарын түрээс: 4,500,000 төгрөг
Хугацаа: 12 сар
Барьцаа: 2 сарын түрээс
Гэрээг хугацаанаас өмнө цуцлах тохиолдолд түрээслэгч 1 сарын түрээс төлнө.
`;

async function main() {
  console.log("Running audit test…");
  const result = await analyzeContractText(sampleContract);
  console.log("Score:", result.complianceScore);
  console.log("Alerts:", result.alerts.length);
}

main().catch((err) => {
  console.error("AUDIT ERROR:", err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) {
    console.error("Cause:", err.cause);
  }
  process.exit(1);
});
