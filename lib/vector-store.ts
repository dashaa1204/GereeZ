import { embedTexts, embedText } from "@/lib/embeddings";
import { chunkLegalDocument, type LegalChunk } from "@/lib/legal-chunker";
import { createAdminClient } from "@/lib/supabase-server";

export interface LegalDocumentMatch {
  id: string;
  law_name: string;
  article_number: string | null;
  section_title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface IngestResult {
  lawName: string;
  chunksIngested: number;
}

export interface SearchOptions {
  matchCount?: number;
  matchThreshold?: number;
  lawName?: string;
}

export interface RetrievedLegalContext {
  matches: LegalDocumentMatch[];
  contextText: string;
}

const DEFAULT_LAW_NAME = "Иргэний хууль";

function buildChunkEmbeddingText(chunk: LegalChunk, lawName: string): string {
  const header = [
    lawName,
    chunk.articleNumber ? `${chunk.articleNumber} дүгээр зүйл` : null,
    chunk.sectionTitle,
  ]
    .filter(Boolean)
    .join(" | ");

  return `${header}\n\n${chunk.content}`;
}

/** Ingest a full legal text file into Supabase pgvector. */
export async function ingestLegalText(
  lawName: string,
  rawText: string,
  options?: { replaceExisting?: boolean },
): Promise<IngestResult> {
  const supabase = createAdminClient();

  if (options?.replaceExisting !== false) {
    const { error: deleteError } = await supabase
      .from("legal_documents")
      .delete()
      .eq("law_name", lawName);

    if (deleteError) {
      throw new Error(`Failed to clear existing documents: ${deleteError.message}`);
    }
  }

  const chunks = chunkLegalDocument(rawText);
  if (chunks.length === 0) {
    throw new Error("No chunks produced from legal document text");
  }

  const embeddingTexts = chunks.map((chunk) =>
    buildChunkEmbeddingText(chunk, lawName),
  );

  console.log(`Embedding ${embeddingTexts.length} chunks (free tier: ~8 min)…`);

  const embeddings = await embedTexts(embeddingTexts, (done, total) => {
    if (done % 25 === 0 || done === total) {
      console.log(`  Embedded ${done}/${total} chunks…`);
    }
  });

  const rows = chunks.map((chunk, index) => ({
    law_name: lawName,
    article_number: chunk.articleNumber,
    section_title: chunk.sectionTitle,
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddings[index],
  }));

  const INSERT_BATCH = 50;
  let chunksIngested = 0;

  for (let i = 0; i < rows.length; i += INSERT_BATCH) {
    const batch = rows.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from("legal_documents").insert(batch);
    if (error) {
      throw new Error(`Failed to insert legal chunks: ${error.message}`);
    }
    chunksIngested += batch.length;
  }

  return { lawName, chunksIngested };
}

/** Cosine similarity search against stored legal embeddings. */
export async function searchLegalDocuments(
  query: string,
  options?: SearchOptions,
): Promise<LegalDocumentMatch[]> {
  const queryEmbedding = await embedText(query);
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_legal_documents", {
    query_embedding: queryEmbedding,
    match_threshold: options?.matchThreshold ?? 0.35,
    match_count: options?.matchCount ?? 12,
    filter_law_name: options?.lawName ?? null,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data ?? []) as LegalDocumentMatch[];
}

/** Retrieve articles by keyword when Gemini embeddings are unavailable. */
export async function retrieveLegalContextByKeywords(
  lawName: string = DEFAULT_LAW_NAME,
): Promise<RetrievedLegalContext> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, law_name, article_number, section_title, content, metadata")
    .eq("law_name", lawName)
    .or("content.ilike.%түрээс%,content.ilike.%lease%,content.ilike.%түрээсл%")
    .limit(6);

  if (error) {
    throw new Error(`Keyword search failed: ${error.message}`);
  }

  const matches: LegalDocumentMatch[] = (data ?? []).map((row) => ({
    id: row.id,
    law_name: row.law_name,
    article_number: row.article_number,
    section_title: row.section_title,
    content: row.content,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    similarity: 0.7,
  }));

  return {
    matches,
    contextText: formatLegalContext(matches),
  };
}

/** Retrieve relevant Civil Code articles for a rental contract (RAG retrieval step). */
export async function retrieveLegalContext(
  contractText: string,
  options?: { lawName?: string },
): Promise<RetrievedLegalContext> {
  const lawName = options?.lawName ?? DEFAULT_LAW_NAME;
  const queries = buildContractSearchQueries(contractText);
  const merged = new Map<string, LegalDocumentMatch>();

  for (const query of queries) {
    const results = await searchLegalDocuments(query, {
      matchCount: 8,
      matchThreshold: 0.3,
      lawName,
    });

    for (const match of results) {
      const existing = merged.get(match.id);
      if (!existing || match.similarity > existing.similarity) {
        merged.set(match.id, match);
      }
    }
  }

  const matches = Array.from(merged.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 15);

  return {
    matches,
    contextText: formatLegalContext(matches),
  };
}

function buildContractSearchQueries(contractText: string): string[] {
  const excerpt = contractText.slice(0, 8_000);
  const keywords = extractTenancyKeywords(contractText);

  return [
    `Түрээсийн гэрээ хуулийн нийцэл ${keywords}: ${excerpt.slice(0, 2_000)}`,
    `Түрээс цуцлах барьцаа төлбөр эрх үүрэг: ${keywords}`,
    `Иргэний хууль түрээсийн гэрээ: ${excerpt.slice(2_000, 5_000)}`,
  ];
}

function extractTenancyKeywords(text: string): string {
  const keywords = [
    "түрээс",
    "түрээслүүлэгч",
    "түрээслэгч",
    "байр",
    "орон сууц",
    "барьцаа",
    "deposit",
    "rent",
    "lease",
    "termination",
    "eviction",
    "хугацаа",
    "төлбөр",
  ];

  const lower = text.toLowerCase();
  const found = keywords.filter((keyword) => lower.includes(keyword));
  return found.length > 0 ? found.join(", ") : "түрээс, барьцаа, төлбөр, цуцлах";
}

export function formatLegalContext(matches: LegalDocumentMatch[]): string {
  if (matches.length === 0) {
    return "Холбогдох зүйл олдсонгүй. Иргэний хуулийн түрээсийн ерөнхий зарчмууд (287–301 дүгээр зүйл) дээр тулгуурлан шинжил. Иш таталт тодорхой бус бол description-д тодорхой бич.";
  }

  return matches
    .map((match, index) => {
      const citation = [
        match.law_name,
        match.article_number ? `${match.article_number} дүгээр зүйл` : null,
        match.section_title,
      ]
        .filter(Boolean)
        .join(" — ");

      return `[Эх сурвалж ${index + 1}] ${citation} (тохирол: ${(match.similarity * 100).toFixed(1)}%)\n${match.content}`;
    })
    .join("\n\n---\n\n");
}

export function formatRetrievedArticlesForStorage(
  matches: LegalDocumentMatch[],
): Array<{
  lawName: string;
  articleNumber: string | null;
  sectionTitle: string | null;
  similarity: number;
}> {
  return matches.map((match) => ({
    lawName: match.law_name,
    articleNumber: match.article_number,
    sectionTitle: match.section_title,
    similarity: match.similarity,
  }));
}
