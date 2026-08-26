import { describe, expect, it, vi } from "vitest";

// The size gate runs before retrieval and before the model, so both are stubbed
// to throw: an over-long contract must not reach either, and a contract at the
// limit must reach the second one.
vi.mock("@/lib/ai", () => ({
  hasAuditApiKey: () => true,
  getAuditProvider: () => "anthropic",
  getAuditModel: () => {
    throw new Error("the model was called");
  },
  // Read at import time by lib/embeddings, which citations pulls in.
  embeddingModel: {},
  EMBEDDING_DIMENSIONS: 768,
}));

vi.mock("@/lib/vector-store", () => ({
  retrieveLegalContext: () => {
    throw new Error("retrieval was called");
  },
  retrieveLegalContextByKeywords: () => {
    throw new Error("retrieval was called");
  },
  formatRetrievedArticlesForStorage: () => [],
}));

import { analyzeContractText, MAX_ANALYZED_CHARS } from "@/lib/audit/analyze";

const contract = (chars: number) => "Гэрээ. ".repeat(Math.ceil(chars / 7)).slice(0, chars);

describe("the analysis size limit", () => {
  it("refuses a contract longer than it can read, and says by how much", async () => {
    const text = contract(MAX_ANALYZED_CHARS + 1);
    await expect(analyzeContractText(text)).rejects.toThrow(
      new RegExp(`${text.length.toLocaleString()}`),
    );
    // The old behaviour: silently cut the text at 80,000 and audit the first
    // third of a contract the user was billed for by the page.
    await expect(analyzeContractText(text)).rejects.toThrow(/хэсэгчлэн/);
  });

  it("refuses before spending anything on retrieval or the model", async () => {
    await expect(
      analyzeContractText(contract(MAX_ANALYZED_CHARS + 5_000)),
    ).rejects.not.toThrow(/was called/);
  });

  it("lets a contract at the limit through to the audit itself", async () => {
    // Proof the gate is the length and nothing else: at exactly the ceiling the
    // failure comes from the stubbed model, i.e. from past the check.
    await expect(analyzeContractText(contract(MAX_ANALYZED_CHARS))).rejects.toThrow(
      /the model was called/,
    );
  });
});
