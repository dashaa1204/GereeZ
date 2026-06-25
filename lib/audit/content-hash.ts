import { createHash } from "crypto";

/** Stable hash for identical PDF text — ignores whitespace differences. */
export function hashContractText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
