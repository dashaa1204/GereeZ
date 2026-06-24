import { embed } from "ai";
import { EMBEDDING_DIMENSIONS, embeddingModel } from "@/lib/ai";
import { hasEmbeddingApiKey } from "@/lib/env";

export { EMBEDDING_DIMENSIONS };

/** Free tier: ~100 embed requests/min — stay safely under limit. */
const DELAY_BETWEEN_EMBEDS_MS = 750;

const embedOptions = {
  providerOptions: {
    google: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  },
} as const;

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

async function embedWithRetry(text: string): Promise<number[]> {
  if (!hasEmbeddingApiKey()) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY байхгүй — vector embedding ашиглахгүй.");
  }

  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { embedding } = await embed({
        model: embeddingModel,
        value: text,
        ...embedOptions,
      });
      return embedding;
    } catch (error) {
      if (!isRateLimitError(error) || attempt === maxRetries - 1) {
        throw error;
      }
      const waitMs = (attempt + 1) * 20_000;
      console.warn(`Rate limited — waiting ${waitMs / 1000}s before retry…`);
      await sleep(waitMs);
    }
  }

  throw new Error("Embedding failed after retries");
}

export async function embedText(text: string): Promise<number[]> {
  return embedWithRetry(text);
}

export async function embedTexts(
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await sleep(DELAY_BETWEEN_EMBEDS_MS);

    const embedding = await embedWithRetry(texts[i]);
    allEmbeddings.push(embedding);
    onProgress?.(i + 1, texts.length);
  }

  return allEmbeddings;
}
