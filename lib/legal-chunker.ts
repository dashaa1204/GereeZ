export interface LegalChunk {
  articleNumber: string | null;
  sectionTitle: string | null;
  content: string;
  metadata: Record<string, unknown>;
}

/** Matches article-level headers only — not sub-clauses like 1.1. or 1.2. */
const ARTICLE_HEADER =
  /^(\d{1,3})\s*(?:дугаар|дүгээр)\s*зүйл\.?/i;

const MAX_CHUNK_CHARS = 3_000;
const OVERLAP_CHARS = 200;

function detectArticleHeader(line: string): string | null {
  const trimmed = line.trim();

  const articleMatch = trimmed.match(ARTICLE_HEADER);
  if (articleMatch) return articleMatch[1];

  const zuilMatch = trimmed.match(/^(?:Зүйл|зүйл)\s+(\d{1,3})\.?/);
  if (zuilMatch) return zuilMatch[1];

  return null;
}

function splitOversizedChunk(chunk: LegalChunk): LegalChunk[] {
  if (chunk.content.length <= MAX_CHUNK_CHARS) return [chunk];

  const parts: LegalChunk[] = [];
  let start = 0;
  let partIndex = 0;

  while (start < chunk.content.length) {
    const end = Math.min(start + MAX_CHUNK_CHARS, chunk.content.length);
    parts.push({
      articleNumber: chunk.articleNumber,
      sectionTitle: chunk.sectionTitle
        ? `${chunk.sectionTitle} (part ${partIndex + 1})`
        : `Part ${partIndex + 1}`,
      content: chunk.content.slice(start, end).trim(),
      metadata: { ...chunk.metadata, part: partIndex + 1 },
    });
    if (end >= chunk.content.length) break;
    start = end - OVERLAP_CHARS;
    partIndex++;
  }

  return parts;
}

/**
 * Splits raw legal text into article-level chunks.
 * Handles Mongolian patterns: "287 дугаар зүйл", "1 дүгээр зүйл", "Зүйл 287".
 */
export function chunkLegalDocument(rawText: string): LegalChunk[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const rawChunks: LegalChunk[] = [];
  let currentArticle: string | null = null;
  let currentTitle: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content.length > 30) {
      rawChunks.push({
        articleNumber: currentArticle,
        sectionTitle: currentTitle,
        content,
        metadata: { source: "legal-chunker" },
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const article = detectArticleHeader(line);
    if (article) {
      flush();
      currentArticle = article;
      currentTitle = line.trim().slice(0, 200);
      buffer.push(line);
    } else if (line.trim()) {
      buffer.push(line);
    }
  }
  flush();

  if (rawChunks.length === 0) {
    return splitBySize(normalized);
  }

  return rawChunks.flatMap(splitOversizedChunk);
}

function splitBySize(text: string): LegalChunk[] {
  const chunks: LegalChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + MAX_CHUNK_CHARS, text.length);
    chunks.push({
      articleNumber: null,
      sectionTitle: `Section ${index + 1}`,
      content: text.slice(start, end).trim(),
      metadata: { source: "size-chunker", index },
    });
    if (end >= text.length) break;
    start = end - OVERLAP_CHARS;
    index++;
  }

  return chunks.filter((c) => c.content.length > 30);
}
