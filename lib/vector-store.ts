import { LAW_NAME_BY_CONTRACT_TYPE, type ContractType } from "@/lib/contract-type";
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

const DEFAULT_CONTRACT_TYPE: ContractType = "rental";

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

// ilike terms the keyword fallback uses to pull the most on-topic articles.
const KEYWORD_FALLBACK_FILTERS: Record<ContractType, string> = {
  rental: "content.ilike.%түрээс%,content.ilike.%lease%,content.ilike.%түрээсл%",
  employment:
    "content.ilike.%цалин%,content.ilike.%хөдөлмөрийн гэрээ%,content.ilike.%ажил олгогч%",
};

/** Retrieve articles by keyword when Gemini embeddings are unavailable. */
export async function retrieveLegalContextByKeywords(
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
): Promise<RetrievedLegalContext> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, law_name, article_number, section_title, content, metadata")
    .eq("law_name", LAW_NAME_BY_CONTRACT_TYPE[contractType])
    .or(KEYWORD_FALLBACK_FILTERS[contractType])
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
    contextText: formatLegalContext(matches, contractType),
  };
}

/** Retrieve relevant law articles for a contract (RAG retrieval step). The law is picked by contract type. */
export async function retrieveLegalContext(
  contractText: string,
  options?: { lawName?: string; contractType?: ContractType },
): Promise<RetrievedLegalContext> {
  const contractType = options?.contractType ?? DEFAULT_CONTRACT_TYPE;
  const lawName = options?.lawName ?? LAW_NAME_BY_CONTRACT_TYPE[contractType];
  const queries = buildContractSearchQueries(contractText, contractType);
  const merged = new Map<string, LegalDocumentMatch>();

  for (const query of queries) {
    const results = await searchLegalDocuments(query, {
      matchCount: 8,
      matchThreshold: 0.4,
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
    contextText: formatLegalContext(matches, contractType),
  };
}

export function buildContractSearchQueries(
  contractText: string,
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
): string[] {
  const excerpt = contractText.slice(0, 8_000);
  const keywords = extractContractKeywords(contractText, contractType);

  if (contractType === "employment") {
    return [
      `Хөдөлмөрийн гэрээ хуулийн нийцэл ${keywords}: ${excerpt.slice(0, 2_000)}`,
      `Цалин хөлс ажлын цаг амралт гэрээ цуцлах эрх үүрэг: ${keywords}`,
      `Хөдөлмөрийн тухай хууль хөдөлмөрийн гэрээ: ${excerpt.slice(2_000, 5_000)}`,
    ];
  }

  return [
    `Түрээсийн гэрээ хуулийн нийцэл ${keywords}: ${excerpt.slice(0, 2_000)}`,
    `Түрээс цуцлах барьцаа төлбөр эрх үүрэг: ${keywords}`,
    `Иргэний хууль түрээсийн гэрээ: ${excerpt.slice(2_000, 5_000)}`,
  ];
}

// Ordered by discriminating value for legal retrieval: specific dispute terms
// first, generic topic words (which appear in nearly every such contract) last.
const TENANCY_KEYWORDS = [
  "барьцаа",
  "deposit",
  "цуцлах",
  "termination",
  "eviction",
  "төлбөр",
  "rent",
  "хугацаа",
  "түрээслэгч",
  "түрээслүүлэгч",
  "lease",
  "орон сууц",
  "байр",
  "түрээс",
];

const EMPLOYMENT_QUERY_KEYWORDS = [
  "туршилтын хугацаа",
  "сахилгын шийтгэл",
  "илүү цаг",
  "нөхөн олговор",
  "чөлөөлөх",
  "цуцлах",
  "ээлжийн амралт",
  "нийгмийн даатгал",
  "ажлын цаг",
  "цалин",
  "ажил олгогч",
  "ажилтан",
];

const QUERY_KEYWORDS: Record<
  ContractType,
  { keywords: string[]; fallback: string }
> = {
  rental: {
    keywords: TENANCY_KEYWORDS,
    fallback: "түрээс, барьцаа, төлбөр, цуцлах",
  },
  employment: {
    keywords: EMPLOYMENT_QUERY_KEYWORDS,
    fallback: "цалин, ажлын цаг, амралт, цуцлах",
  },
};

const MAX_QUERY_KEYWORDS = 4;

export function extractContractKeywords(
  text: string,
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
): string {
  const { keywords, fallback } = QUERY_KEYWORDS[contractType];
  const lower = text.toLowerCase();
  // Keep only the few most important matches so the search query stays focused
  // on one semantic direction rather than being diluted by every term found.
  const found = keywords
    .filter((keyword) => lower.includes(keyword))
    .slice(0, MAX_QUERY_KEYWORDS);
  return found.length > 0 ? found.join(", ") : fallback;
}

export function extractTenancyKeywords(text: string): string {
  return extractContractKeywords(text, "rental");
}

// What the audit prompt should lean on when retrieval comes back empty.
const EMPTY_CONTEXT_MESSAGES: Record<ContractType, string> = {
  rental:
    "Холбогдох зүйл олдсонгүй. Иргэний хуулийн түрээсийн ерөнхий зарчмууд (287–301 дүгээр зүйл) дээр тулгуурлан шинжил. Иш таталт тодорхой бус бол description-д тодорхой бич.",
  employment:
    "Холбогдох зүйл олдсонгүй. Хөдөлмөрийн тухай хуулийн хөдөлмөрийн гэрээний ерөнхий зарчмууд дээр тулгуурлан шинжил. Иш таталт тодорхой бус бол description-д тодорхой бич.",
};

export function formatLegalContext(
  matches: LegalDocumentMatch[],
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
): string {
  if (matches.length === 0) {
    return EMPTY_CONTEXT_MESSAGES[contractType];
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
