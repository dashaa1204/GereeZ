const PAGE_BATCH_SIZE = 3;

/**
 * High sanity ceiling on pages sent to the AI audit. Per-page credit charging
 * (see lib/credits.ts) is what actually bounds cost now — the user pays for what
 * they audit — so this is only a guard against a pathological file (thousands of
 * pages). Reject over this, don't truncate.
 */
export const MAX_AUDIT_PAGES = 100;

export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    return info.total;
  } finally {
    await parser.destroy();
  }
}

async function extractPageBatch(
  buffer: Buffer,
  pages: number[],
): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText({ partial: pages, pageJoiner: "\n" });
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

/** Extract text from a PDF buffer, using a fresh parser per batch to limit memory. */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  const totalPages = await getPdfPageCount(buffer);

  if (!totalPages) {
    return extractPageBatch(buffer, []);
  }

  const parts: string[] = [];

  for (let start = 1; start <= totalPages; start += PAGE_BATCH_SIZE) {
    const end = Math.min(start + PAGE_BATCH_SIZE - 1, totalPages);
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const text = await extractPageBatch(buffer, pages);
    if (text) parts.push(text);
  }

  return parts.join("\n\n").trim();
}
