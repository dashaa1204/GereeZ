import type { AnalyzeContractResult } from "@/lib/audit";
import { hasAuditApiKey } from "@/lib/ai";
import { detectContractType } from "@/lib/contract-type";

export function isDemoMode(): boolean {
  if (hasAuditApiKey()) return false;
  return process.env.DEMO_MODE === "true";
}

/** Sample audit for UI/testing — no LLM API calls. */
export function generateDemoAudit(contractText: string): AnalyzeContractResult {
  const hasDeposit = /барьцаа|deposit/i.test(contractText);
  const hasTermination = /цуцлах|termination|eviction/i.test(contractText);

  const alerts: AnalyzeContractResult["alerts"] = [];

  if (hasTermination) {
    alerts.push({
      severity: "high",
      confidence: "high",
      title: "Шудармаг бус цуцлах нөхцөл",
      description:
        "[DEMO] Хугацаанаас өмнө цуцлах торгууль Иргэний хуулийн хамгаалалттай зөрчилдөж болзошгүй. Мэдэгдэл өгөх хугацааг дахин шалгана уу.",
      contractClause: "8.13-р заалт",
      lawName: "Иргэний хууль",
      articleReference: "295 дүгээр зүйл",
    });
  }

  if (!hasDeposit) {
    alerts.push({
      severity: "medium",
      confidence: "medium",
      title: "Барьцааны нөхцөл тодорхой бус",
      description:
        "[DEMO] Барьцаа буцаан олгох хугацаа, нөхцөл тодорхой заагаагүй байна.",
      contractClause: "Барьцааны тухай заалт байхгүй",
      lawName: "Иргэний хууль",
      articleReference: "296 дүгээр зүйл",
    });
  }

  alerts.push({
    severity: "info",
    confidence: "high",
    title: "Демо горим идэвхтэй",
    description:
      "Энэ бол жишээ үр дүн. Жинхэнэ AI шинжилгээний тулд ANTHROPIC_API_KEY тохируулна уу.",
    lawName: "Иргэний хууль",
    articleReference: "—",
  });

  return {
    contractType: detectContractType(contractText),
    complianceScore: hasTermination ? 72 : 85,
    summary:
      "[DEMO] Гэрээг Иргэний хуулийн жишээ шалгалтаар үзлээ. Бүрэн RAG шинжилгээний тулд ANTHROPIC_API_KEY нэмнэ үү.",
    alerts,
    strengths: [
      "Түрээслүүлэгч, түрээслэгчийн талууд тодорхойлогдсон",
      "Сарын түрээсийн дүн заасан",
    ],
    metadata: {
      tenantName: "Болд",
      landlordName: "Дорж",
      monthlyRent: 1500000,
      deposit: 3000000,
      startDate: "2024-09-01",
      endDate: "2025-09-01",
      paymentDay: 5,
      noticePeriodDays: 30,
      contractTitle: "Түрээсийн гэрээ",
      tenantLabel: "Түрээслэгч",
      landlordLabel: "Түрээслүүлэгч",
      paymentLabel: "Сарын түрээс",
    },
    retrievedContext: {
      matches: [
        {
          id: "demo-1",
          law_name: "Иргэний хууль",
          article_number: "295",
          section_title: "295 дугаар зүйл",
          content:
            "Түрээсийн гэрээг хугацаанаас өмнө цуцлах нөхцөл, мэдэгдэл өгөх хугацааг зохицуулна.",
          metadata: { demo: true },
          similarity: 0.91,
        },
        {
          id: "demo-2",
          law_name: "Иргэний хууль",
          article_number: "296",
          section_title: "296 дугаар зүйл",
          content: "Барьцаа хөрөнгийн буцаан өгөх журмыг тодорхой заана.",
          metadata: { demo: true },
          similarity: 0.87,
        },
      ],
      contextText: "[DEMO] Жишээ хуулийн эх сурвалж",
      mode: "vector",
    },
  };
}
