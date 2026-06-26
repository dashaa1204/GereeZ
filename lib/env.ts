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

/**
 * Google Cloud Vision API key — a GCP Console key (NOT a Gemini/AI Studio key),
 * scoped to the Cloud Vision API. Used to OCR scanned PDFs and image uploads.
 */
export function getGoogleVisionApiKey(): string | undefined {
  return readEnv("GOOGLE_VISION_API_KEY", "GOOGLE_CLOUD_VISION_API_KEY");
}

/**
 * Resolve the Anthropic base URL, tolerating a bare host set without the `/v1`
 * suffix. The SDK appends `/messages` to whatever baseURL it gets, so a value
 * like `https://api.anthropic.com` yields a 404 — append `/v1` in that case.
 * A URL that already carries a path (e.g. a proxy/gateway like
 * `https://gw.example/anthropic`) is left untouched, since we can't know its
 * routing scheme. Returns undefined when unset so the SDK uses its own default.
 */
export function normalizeAnthropicBaseUrl(): string | undefined {
  const raw = readEnv("ANTHROPIC_BASE_URL", "Anthropic_Base_URL");
  if (!raw) return undefined;

  const trimmed = raw.replace(/\/+$/, "");

  let pathname: string;
  try {
    pathname = new URL(trimmed).pathname;
  } catch {
    return trimmed;
  }

  // Only fix up a bare host with no path of its own; trust any explicit path.
  return pathname === "" || pathname === "/" ? `${trimmed}/v1` : trimmed;
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
