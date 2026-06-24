import { readFile } from "node:fs/promises";
import { extractPdfText } from "../lib/pdf";
import { chunkLegalDocument } from "../lib/legal-chunker";

async function main() {
  const buffer = await readFile("knowledge-base/ИРГЭНИЙ ХУУЛЬ.pdf");
  const text = await extractPdfText(buffer);
  const chunks = chunkLegalDocument(text);

  console.log("Characters:", text.length);
  console.log("Chunks:", chunks.length);
  console.log(
    "Sample articles:",
    chunks
      .filter((c) => c.articleNumber)
      .slice(0, 10)
      .map((c) => c.articleNumber),
  );
}

main().catch(console.error);
