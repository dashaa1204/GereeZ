import { generateText } from "ai";
import { getAuditModel, getAuditProvider, hasAuditApiKey } from "@/lib/ai";
import { resolveContractLabels } from "@/lib/contract-labels";
import type { AuditAlert, Contract } from "@/lib/types/contract";

/** Only actionable issues belong in a correction letter, worst first. */
function selectAlertsForProposal(alerts: AuditAlert[]): AuditAlert[] {
  const actionable = alerts.filter(
    (a) => a.severity === "high" || a.severity === "medium",
  );
  const picked = actionable.length > 0 ? actionable : alerts;
  const rank = { high: 0, medium: 1, low: 2, info: 3 } as const;
  return [...picked].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

function buildIssueList(alerts: AuditAlert[]): string {
  return alerts
    .map((a, i) => {
      const clause = a.contractClause?.trim() || "холбогдох заалт";
      const law = [a.lawName, a.articleReference].filter(Boolean).join(" ");
      return [
        `${i + 1}. Гэрээний заалт: ${clause}`,
        `   Асуудал: ${a.title}. ${a.description}`,
        `   Хуулийн үндэслэл: ${law}`,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Turn an audit into a ready-to-send correction letter — the outcome a plain
 * chatbot won't assemble for the user: it takes the weaker party's side, cites
 * the exact law behind each finding, and proposes concrete fixes. Returns the
 * letter text in Mongolian.
 */
export async function generateCorrectionProposal(
  contract: Contract,
): Promise<string> {
  if (!hasAuditApiKey()) {
    throw new Error(
      "AI API key байхгүй тул захидал үүсгэх боломжгүй. .env.local тохиргоогоо шалгана уу.",
    );
  }

  const summary = contract.audit_summary;
  const alerts = summary?.alerts ?? [];
  if (alerts.length === 0) {
    throw new Error("Энэ гэрээнд засах шаардлагатай зүйл олдсонгүй.");
  }

  const labels = resolveContractLabels(summary?.metadata, summary?.contractType);
  const contractTitle = labels.typeLabel ?? "гэрээ";
  const senderName = summary?.metadata?.tenantName?.trim() || "[Таны нэр]";
  const recipientName = summary?.metadata?.landlordName?.trim();
  const selected = selectAlertsForProposal(alerts);

  const system = `Та ${labels.tenantLabel}-д туслаж, ${labels.landlordLabel}-т илгээх албан ёсны, эелдэг боловч шаардлагатай захидал бичиж байна. Захидлын зорилго: "${contractTitle}"-ний зөрчилтэй заалтуудыг хуулийн үндэслэлтэйгээр засуулах.

Дүрэм:
- Зөвхөн захидлын эх бичвэрийг МОНГОЛ хэлээр буцаа. Тайлбар, markdown тэмдэглэгээ, \`\`\` кодын хашилт бүү нэм.
- Албан ёсны, хүндэтгэлтэй өнгө аяс хадгал. Доромжлол, заналхийлэл бүү оруул.
- Заалт бүрийн хувьд: аль заалтыг, ямар шалтгаанаар, аль хуулийн зүйлд тулгуурлан, ямар засвар хийхийг тодорхой бич.
- Хуулийн зүйлийг ЯГ өгсөн хэлбэрээр иш тат. Шинэ хууль, зүйл бүү зохио.
- Товч, ойлгомжтой, шууд илгээхэд бэлэн байлга.

Захидлын бүтэц:
1. ${labels.landlordLabel}-т хандсан мэндчилгээ${recipientName ? ` (${recipientName})` : ""}
2. Оршил: гэрээг нягтлан үзсэн, доорх заалтуудыг засахыг хүсэж байгаа тухай
3. Дугаарласан жагсаалт — асуудал бүрд нэг догол мөр
4. Хэлэлцэж, тохиролцохыг хүссэн эелдэг төгсгөл
5. Доор гарын үсэг: ${senderName}`;

  const prompt = `Гэрээ: "${contractTitle}"
Илгээгч (${labels.tenantLabel}): ${senderName}
Хүлээн авагч (${labels.landlordLabel}): ${recipientName ?? "тодорхойгүй"}

Засуулах шаардлагатай заалтууд:

${buildIssueList(selected)}

Дээрх мэдээлэлд үндэслэн захидлыг бүрэн бичиж өг.`;

  const provider = getAuditProvider();

  const { text } = await generateText({
    model: getAuditModel(),
    temperature: 0.3,
    ...(provider === "google"
      ? { providerOptions: { google: { structuredOutputs: false } } }
      : {}),
    system,
    prompt,
  });

  return text.trim();
}
