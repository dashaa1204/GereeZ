import { createHash } from "crypto";

/** Stable hash for identical PDF text — ignores whitespace differences. */
export function hashContractText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Hash of the raw uploaded bytes. Catches byte-identical re-uploads (the same
 * photo or PDF sent again) before any OCR or AI cost is incurred — the cheapest
 * possible duplicate-spam gate. Distinct from {@link hashContractText}, which
 * only matches after text extraction.
 */
export function hashRawFile(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
