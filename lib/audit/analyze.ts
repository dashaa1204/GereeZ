import { generateObject } from "ai";
import { getAuditModel, getAuditProvider, hasAuditApiKey } from "@/lib/ai";
import {
  detectContractType,
  LAW_NAME_BY_CONTRACT_TYPE,
  type ContractType,
} from "@/lib/contract-type";
import { hasEmbeddingApiKey } from "@/lib/env";
import type { RetrievedLegalContext } from "@/lib/vector-store";
import {
  retrieveLegalContext,
  retrieveLegalContextByKeywords,
} from "@/lib/vector-store";
import { buildRAGSystemPrompt } from "./prompt";
import { verifyCitationRelevance } from "./citations";
import { groundCitations, normalizeAuditResult } from "./normalize";
import {
  auditResultSchema,
  type AnalyzeContractResult,
  type AuditResultSchema,
} from "./schema";

/** Article numbers the retrieval step actually supplied, for citation grounding. */
function retrievedArticleNumbers(context: RetrievedLegalContext): Set<string> {
  return new Set(
    context.matches
      .map((match) => match.article_number)
      .filter((n): n is string => Boolean(n)),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("quota") ||
    message.includes("rate") ||
    message.includes("429")
  );
}

export async function analyzeContractText(
  contractText: string,
): Promise<AnalyzeContractResult> {
  if (!hasAuditApiKey()) {
    throw new Error(
      "Audit API key байхгүй. .env.local файлд ANTHROPIC_API_KEY=sk-ant-... нэмээд npm run dev дахин эхлүүлнэ үү.",
    );
  }

  if (!contractText || contractText.length < 50) {
    throw new Error(
      "PDF-ээс хангалттай текст гаргаж чадсангүй. Сканнердсан зураг биш, тексттэй PDF ашиглана уу.",
    );
  }

  // Rental contracts are audited against the Civil Code, employment contracts
  // against the Labor Law — the type steers retrieval, prompt, and citations.
  const contractType = detectContractType(contractText);

  const retrievedContext = await retrieveLegalContextSafe(
    contractText,
    contractType,
  );

  const truncated =
    contractText.length > 80_000
      ? `${contractText.slice(0, 80_000)}\n\n[Шинжилгээний хэмжээнд тасалсан]`
      : contractText;

  const provider = getAuditProvider();

  const object = await generateAuditWithRetry(
    truncated,
    buildRAGSystemPrompt(retrievedContext.contextText, contractType),
    provider,
    contractType,
  );

  const normalized = normalizeAuditResult(
    object,
    LAW_NAME_BY_CONTRACT_TYPE[contractType],
  );

  // Two gates, in order of cost: the cheap one drops citations to articles that
  // were never retrieved, the paid one drops citations whose article does not
  // actually speak to the finding (see ./citations).
  const grounded = groundCitations(
    normalized.alerts,
    retrievedArticleNumbers(retrievedContext),
  );

  return {
    ...normalized,
    alerts: await verifyCitationRelevance(
      grounded,
      retrievedContext.matches,
    ),
    contractType,
    retrievedContext,
  };
}

// Naming an article range here is what taught the model to cite from memory:
// with no context to check against, "287–301 дээр тулгуурлан шинжил" came back
// as confident citations to articles nobody had retrieved. Without a source,
// the honest output is findings with no citation at all.
const RETRIEVAL_UNAVAILABLE_MESSAGES: Record<ContractType, string> = {
  rental:
    "Хуулийн мэдлэгийн сангаас мэдээлэл татаж чадсангүй. Гэрээний эрсдэлийг ерөнхий зарчмаар тэмдэглэ, гэхдээ ЯМАР Ч зүйлийн дугаар бүү иш тат — articleReference-ийг хоосон үлдээж, confidence-ийг \"low\" болго.",
  employment:
    "Хуулийн мэдлэгийн сангаас мэдээлэл татаж чадсангүй. Гэрээний эрсдэлийг ерөнхий зарчмаар тэмдэглэ, гэхдээ ЯМАР Ч зүйлийн дугаар бүү иш тат — articleReference-ийг хоосон үлдээж, confidence-ийг \"low\" болго.",
};

async function retrieveLegalContextSafe(
  contractText: string,
  contractType: ContractType,
): Promise<RetrievedLegalContext> {
  if (hasEmbeddingApiKey()) {
    try {
      return await retrieveLegalContext(contractText, { contractType });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Vector RAG failed, using keyword fallback:", message);
    }
  }

  try {
    return await retrieveLegalContextByKeywords(contractType);
  } catch (fallbackError) {
    console.warn("Keyword fallback failed:", fallbackError);
    return {
      matches: [],
      contextText: RETRIEVAL_UNAVAILABLE_MESSAGES[contractType],
      mode: "none",
    };
  }
}

async function generateAuditWithRetry(
  contractText: string,
  system: string,
  provider: ReturnType<typeof getAuditProvider>,
  contractType: ContractType,
): Promise<AuditResultSchema> {
  const maxRetries = 4;
  const contractKind =
    contractType === "employment" ? "хөдөлмөрийн" : "түрээсийн";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { object } = await generateObject({
        model: getAuditModel(),
        schema: auditResultSchema,
        temperature: 0,
        ...(provider === "google"
          ? {
              providerOptions: {
                google: { structuredOutputs: true },
              },
            }
          : {}),
        system,
        prompt: `Доорх Монгол ${contractKind} гэрээг системийн зааварт өгсөн ХУУЛИЙН ЭХ СУУРЬ-тай харьцуулан шинжил. Дүгнэлтийг бүхэлд нь монгол хэлээр бич:\n\n${contractText}`,
      });
      return object;
    } catch (error) {
      if (!isRateLimitError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      const waitMs = (attempt + 1) * 30_000;
      await sleep(waitMs);
    }
  }

  throw new Error("Audit failed after retries");
}
