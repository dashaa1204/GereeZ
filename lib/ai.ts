import { createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import {
  getAnthropicApiKey,
  getGoogleApiKey,
  getGroqApiKey,
  normalizeAnthropicModel,
  readEnv,
} from "@/lib/env";

export type AuditProvider = "anthropic" | "groq" | "google";

const GROQ_AUDIT_MODEL = "openai/gpt-oss-20b";
const GEMINI_AUDIT_MODEL = "gemini-2.0-flash-lite";
const DEFAULT_ANTHROPIC_AUDIT_MODEL = "claude-haiku-4-5";

export function hasAuditApiKey(): boolean {
  return Boolean(
    getAnthropicApiKey() || getGroqApiKey() || getGoogleApiKey(),
  );
}

export function getAuditProvider(): AuditProvider {
  if (getAnthropicApiKey()) return "anthropic";
  if (getGroqApiKey()) return "groq";
  return "google";
}

export function getAuditModelLabel(): string {
  const provider = getAuditProvider();
  if (provider === "anthropic") {
    return normalizeAnthropicModel(
      readEnv("ANTHROPIC_MODEL", "Anthropic_Model"),
    );
  }
  if (provider === "groq") return GROQ_AUDIT_MODEL;
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
    if (!apiKey.startsWith("sk-ant-")) {
      throw new Error(
        "ANTHROPIC_API_KEY буруу форматтай. console.anthropic.com/settings/keys-аас шинэ key хуулна уу.",
      );
    }

    const modelId = normalizeAnthropicModel(
      readEnv("ANTHROPIC_MODEL", "Anthropic_Model"),
    );
    const anthropic = createAnthropic({ apiKey });
    return anthropic(modelId);
  }

  if (provider === "groq") {
    return groq(GROQ_AUDIT_MODEL);
  }

  return google(GEMINI_AUDIT_MODEL);
}

/** gemini-embedding-001 — used for RAG vector search (768 dims). */
export const embeddingModel = google.embedding("gemini-embedding-001");

export const EMBEDDING_DIMENSIONS = 768;
