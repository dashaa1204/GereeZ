/** Read the first non-empty env var from a list of candidate names. */
export function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function getAnthropicApiKey(): string | undefined {
  return readEnv("ANTHROPIC_API_KEY", "Anthropic_API_KEY");
}

export function getGroqApiKey(): string | undefined {
  return readEnv("GROQ_API_KEY");
}

export function getGoogleApiKey(): string | undefined {
  return readEnv(
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINI_API_KEY",
  );
}

export function hasEmbeddingApiKey(): boolean {
  return Boolean(getGoogleApiKey());
}

export function normalizeAnthropicModel(modelId?: string): string {
  const raw = modelId?.trim() || "claude-haiku-4-5";
  if (raw.startsWith("claude-")) return raw;

  const aliases: Record<string, string> = {
    "haiku-4-5": "claude-haiku-4-5",
    "haiku": "claude-haiku-4-5",
    "sonnet-4-5": "claude-sonnet-4-5",
  };

  return aliases[raw] ?? `claude-${raw}`;
}
