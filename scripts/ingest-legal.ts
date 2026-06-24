/**
 * Ingest a legal document from knowledge-base/ into Supabase pgvector.
 *
 * Usage:
 *   npm run ingest:legal
 *   npm run ingest:legal -- "knowledge-base/ИРГЭНИЙ ХУУЛЬ.pdf"
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractPdfText } from "../lib/pdf";
import { ingestLegalText } from "../lib/vector-store";

const DEFAULT_FILE = path.join("knowledge-base", "ИРГЭНИЙ ХУУЛЬ.pdf");
const DEFAULT_LAW_NAME = "Иргэний хууль";

async function readDocumentText(filePath: string): Promise<string> {
  const absolute = path.resolve(filePath);
  const buffer = await readFile(absolute);

  if (filePath.toLowerCase().endsWith(".pdf")) {
    return extractPdfText(buffer);
  }

  return buffer.toString("utf-8");
}

async function main() {
  const filePath = process.argv[2] ?? DEFAULT_FILE;
  const lawName = process.argv[3] ?? DEFAULT_LAW_NAME;

  console.log(`Reading: ${filePath}`);
  const rawText = await readDocumentText(filePath);

  if (rawText.trim().length < 100) {
    throw new Error(
      "Extracted text is too short. The PDF may be scanned/image-based.",
    );
  }

  console.log(`Extracted ${rawText.length.toLocaleString()} characters`);
  console.log(`Ingesting into vector store as "${lawName}"…`);

  const result = await ingestLegalText(lawName, rawText, {
    replaceExisting: true,
  });

  console.log(`Done — ${result.chunksIngested} chunks ingested.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
