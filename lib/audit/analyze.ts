import { generateObject } from "ai";
import { getAuditModel, getAuditProvider, hasAuditApiKey } from "@/lib/ai";
import { hasEmbeddingApiKey } from "@/lib/env";
import type { RetrievedLegalContext } from "@/lib/vector-store";
import {
  formatLegalContext,
  retrieveLegalContext,
  retrieveLegalContextByKeywords,
} from "@/lib/vector-store";
import { buildRAGSystemPrompt } from "./prompt";
import { normalizeAuditResult } from "./normalize";
import {
  auditResultSchema,
  type AnalyzeContractResult,
  type AuditResultSchema,
} from "./schema";

/** Groq free tier TPM is 8000 — keep total prompt under ~6000 tokens. */
const GROQ_MAX_CONTRACT_CHARS = 5_000;
const GROQ_MAX_LEGAL_ARTICLES = 5;
const GROQ_MAX_CHARS_PER_ARTICLE = 450;

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

  const retrievedContext = await retrieveLegalContextSafe(contractText);

  const truncated =
    contractText.length > 80_000
      ? `${contractText.slice(0, 80_000)}\n\n[Шинжилгээний хэмжээнд тасалсан]`
      : contractText;

  const provider = getAuditProvider();
  const { contractText: promptContract, legalContext } = trimAuditContext(
    truncated,
    retrievedContext,
    provider,
  );

  const object = await generateAuditWithRetry(
    promptContract,
    buildRAGSystemPrompt(legalContext.contextText),
    provider,
  );

  return {
    ...normalizeAuditResult(object),
    retrievedContext: legalContext,
  };
}

function trimAuditContext(
  contractText: string,
  context: RetrievedLegalContext,
  provider: ReturnType<typeof getAuditProvider>,
): { contractText: string; legalContext: RetrievedLegalContext } {
  if (provider === "anthropic" || provider === "google") {
    return { contractText, legalContext: context };
  }

  const trimmedMatches = context.matches
    .slice(0, GROQ_MAX_LEGAL_ARTICLES)
    .map((match) => ({
      ...match,
      content:
        match.content.length > GROQ_MAX_CHARS_PER_ARTICLE
          ? `${match.content.slice(0, GROQ_MAX_CHARS_PER_ARTICLE)}…`
          : match.content,
    }));

  const legalContext: RetrievedLegalContext = {
    matches: trimmedMatches,
    contextText: formatLegalContext(trimmedMatches),
  };

  const contractTextTrimmed =
    contractText.length > GROQ_MAX_CONTRACT_CHARS
      ? `${contractText.slice(0, GROQ_MAX_CONTRACT_CHARS)}\n\n[API хязгаарын улмаас тасалсан]`
      : contractText;

  return { contractText: contractTextTrimmed, legalContext };
}

async function retrieveLegalContextSafe(
  contractText: string,
): Promise<RetrievedLegalContext> {
  if (hasEmbeddingApiKey()) {
    try {
      return await retrieveLegalContext(contractText);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Vector RAG failed, using keyword fallback:", message);
    }
  }

  try {
    return await retrieveLegalContextByKeywords();
  } catch (fallbackError) {
    console.warn("Keyword fallback failed:", fallbackError);
    return {
      matches: [],
      contextText:
        "Хуулийн мэдлэгийн сангаас мэдээлэл татах боломжгүй. Иргэний хуулийн түрээсийн ерөнхий зарчмууд (287–301 дүгээр зүйл) дээр тулгуурлан шинжил.",
    };
  }
}

async function generateAuditWithRetry(
  contractText: string,
  system: string,
  provider: ReturnType<typeof getAuditProvider>,
): Promise<AuditResultSchema> {
  const maxRetries = 4;

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
          : provider === "groq"
            ? {
                providerOptions: {
                  groq: { structuredOutputs: true, strictJsonSchema: false },
                },
              }
            : {}),
        system,
        prompt: `Доорх Монгол түрээсийн гэрээг системийн зааварт өгсөн ХУУЛИЙН ЭХ СУУРЬ-тай харьцуулан шинжил. Дүгнэлтийг бүхэлд нь монгол хэлээр бич:\n\n${contractText}`,
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
