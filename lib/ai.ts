import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  getAnthropicApiKey,
  getGoogleApiKey,
  normalizeAnthropicBaseUrl,
  normalizeAnthropicModel,
  readEnv,
} from "@/lib/env";

export type AuditProvider = "anthropic" | "google";

const GEMINI_AUDIT_MODEL = "gemini-2.0-flash-lite";

// The default `google` provider only reads GOOGLE_GENERATIVE_AI_API_KEY;
// route the key through getGoogleApiKey() so GOOGLE_API_KEY and
// GEMINI_API_KEY (see lib/env.ts) work too.
const google = createGoogleGenerativeAI({ apiKey: getGoogleApiKey() });

export function hasAuditApiKey(): boolean {
  return Boolean(getAnthropicApiKey() || getGoogleApiKey());
}

export function getAuditProvider(): AuditProvider {
  if (getAnthropicApiKey()) return "anthropic";
  return "google";
}

export function getAuditModelLabel(): string {
  const provider = getAuditProvider();
  if (provider === "anthropic") {
    return normalizeAnthropicModel(
      readEnv("ANTHROPIC_MODEL", "Anthropic_Model"),
    );
  }
  return GEMINI_AUDIT_MODEL;
}

export function getAuditModel() {
  const provider = getAuditProvider();

  if (provider === "anthropic") {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY олдсонгүй. .env.local файлд ANTHROPIC_API_KEY=sk-ant-... гэж нэмнэ үү.",
      );
    }
    const baseURL = normalizeAnthropicBaseUrl();
    // A custom base URL means a proxy/gateway, whose tokens need not look like
    // Anthropic keys — only enforce the `sk-ant-` shape on the official API.
    if (!baseURL && !apiKey.startsWith("sk-ant-")) {
      throw new Error(
        "ANTHROPIC_API_KEY буруу форматтай. console.anthropic.com/settings/keys-аас шинэ key хуулна уу.",
      );
    }

    const modelId = normalizeAnthropicModel(
      readEnv("ANTHROPIC_MODEL", "Anthropic_Model"),
    );
    const anthropic = createAnthropic(baseURL ? { apiKey, baseURL } : { apiKey });
    return anthropic(modelId);
  }

  return google(GEMINI_AUDIT_MODEL);
}

/** gemini-embedding-001 — used for RAG vector search (768 dims). */
export const embeddingModel = google.embedding("gemini-embedding-001");

export const EMBEDDING_DIMENSIONS = 768;
