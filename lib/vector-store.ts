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
  /** True when the article was included because the chapter governs this
   *  contract type, not because a query matched it — `similarity` is then a
   *  sort key, not a measurement. */
  pinned?: boolean;
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

/** Which retrieval path produced the context — stored with the audit so a
 *  silent degradation is visible afterwards instead of having to be inferred
 *  from similarity scores (see scripts/trace-audit.ts). */
export type RetrievalMode = "vector" | "keyword" | "none";

export interface RetrievedLegalContext {
  matches: LegalDocumentMatch[];
  contextText: string;
  mode: RetrievalMode;
}

const DEFAULT_CONTRACT_TYPE: ContractType = "rental";

/** Vector hits kept alongside the pinned chapter. */
const MAX_SEARCHED_MATCHES = 18;

/** Top hits each topic query keeps before the rest compete on similarity. */
const PER_QUERY_RESERVED = 2;

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

/**
 * Articles that are relevant to a contract type BY DEFINITION, pinned into the
 * context regardless of what similarity search returns.
 *
 * The Civil Code's lease chapter (287–301) governs every rental contract, but
 * embedding search does not reliably surface all of it: a query about a rent
 * increase scores «330 Гэрээний хугацааг сунгах» above «295 Эд хөрөнгө хөлслөх
 * гэрээ дуусгавар болох». The prompt used to paper over this by *telling* the
 * model it could cite 287–301 from memory, which is how audits ended up citing
 * articles no one had retrieved — and misdescribing them. Pinning the real text
 * fixes the cause: the chapter is always in front of the model, so the citation
 * rule can be an absolute "cite only what you were given".
 *
 * Employment has no equally tidy range in the Labor Law, so it stays purely
 * vector-retrieved.
 */
const PINNED_ARTICLES: Record<ContractType, string[]> = {
  rental: Array.from({ length: 15 }, (_, i) => String(287 + i)),
  employment: [],
};

/** Fetch pinned chapter articles as matches, ranked above vector hits. */
async function fetchPinnedArticles(
  contractType: ContractType,
): Promise<LegalDocumentMatch[]> {
  const articles = PINNED_ARTICLES[contractType];
  if (articles.length === 0) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("id, law_name, article_number, section_title, content, metadata")
    .eq("law_name", LAW_NAME_BY_CONTRACT_TYPE[contractType])
    .in("article_number", articles);

  if (error) {
    // Pinning is an enhancement — a failure here must not lose the vector hits.
    console.warn("Pinned article fetch failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    law_name: row.law_name,
    article_number: row.article_number,
    section_title: row.section_title,
    content: row.content,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    // Not a measured score: these are included because the chapter governs the
    // contract type, not because a query matched them.
    similarity: 1,
    pinned: true,
  }));
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
    mode: "keyword",
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
  const perQuery: LegalDocumentMatch[][] = [];

  for (const query of queries) {
    const results = await searchLegalDocuments(query, {
      matchCount: 8,
      matchThreshold: 0.4,
      lawName,
    });

    perQuery.push(results);
    for (const match of results) {
      const existing = merged.get(match.id);
      if (!existing || match.similarity > existing.similarity) {
        merged.set(match.id, match);
      }
    }
  }

  const pinned = await fetchPinnedArticles(contractType);
  for (const match of pinned) merged.delete(match.id);

  // Each topic keeps its own best hits before the leftovers compete globally.
  // Ranking by similarity alone would hand every slot to the lease chapter,
  // whose articles score 0.73+ against anything, and drop «232 Анз» (0.69 on
  // the penalty query) — the article a penalty finding needs to cite.
  const kept = new Map<string, LegalDocumentMatch>();
  for (const results of perQuery) {
    for (const match of results.slice(0, PER_QUERY_RESERVED)) {
      if (merged.has(match.id)) kept.set(match.id, merged.get(match.id)!);
    }
  }

  const leftovers = Array.from(merged.values())
    .filter((match) => !kept.has(match.id))
    .sort((a, b) => b.similarity - a.similarity);

  const searched = [
    ...Array.from(kept.values()),
    ...leftovers.slice(0, Math.max(0, MAX_SEARCHED_MATCHES - kept.size)),
  ].sort((a, b) => b.similarity - a.similarity);

  const matches = [...pinned, ...searched];

  return {
    matches,
    contextText: formatLegalContext(matches, contractType),
    mode: "vector",
  };
}

/**
 * Topics a dispute over this kind of contract actually reaches, each as its own
 * query.
 *
 * One blended query ("Түрээс цуцлах барьцаа төлбөр эрх үүрэг") does not work:
 * the blend lands in the middle of the lease chapter and returns 318–332 for
 * every topic at once, so a deposit finding never sees «233 Дэнчин» (0.79 on
 * its own query) and a landlord's-lien finding never sees «301 Хөлслүүлэгчийн
 * саатуулан барих эрх» (0.79). Asked separately, each topic retrieves its own
 * chapter — which is what lets a finding be cited at all, since a citation now
 * has to survive a relevance check against the finding's own text.
 */
const TOPIC_QUERIES: Record<ContractType, string[]> = {
  rental: [
    "Барьцаа мөнгө буцаан олгох, барьцааны эрх дуусгавар болох",
    "Дэнчин, урьдчилгаа төлбөр, баталгааны мөнгө буцаах",
    "Хөлс төлөх журам, түрээсийн төлбөрийн хэмжээг өөрчлөх",
    "Эд хөрөнгө хөлслөх гэрээ цуцлах, дуусгавар болох, эд хөрөнгийг буцааж өгөх",
    "Гэрээний нөхцөлийг нэг талын санаачилгаар өөрчлөх, стандарт нөхцөл хүчин төгөлдөр бус байх",
    "Хохирол, анз, алданги, торгуулийн хэмжээ хязгаарлах",
    "Хөлслүүлэгчийн саатуулан барих эрх, хөлслөгчийн эд хөрөнгө",
    "Эд хөрөнгийн доголдол, засварын зардал, сайжруулалтын төлбөр",
  ],
  employment: [
    "Цалин хөлс олгох журам, хугацаа, суутгал",
    "Хөдөлмөрийн гэрээ цуцлах, ажлаас чөлөөлөх үндэслэл",
    "Ажлын цаг, илүү цагийн хөлс, ээлжийн амралт",
    "Туршилтын хугацаа, сахилгын шийтгэл, эд хөрөнгийн хариуцлага",
  ],
};

export function buildContractSearchQueries(
  contractText: string,
  contractType: ContractType = DEFAULT_CONTRACT_TYPE,
): string[] {
  const excerpt = contractText.slice(0, 8_000);
  const keywords = extractContractKeywords(contractText, contractType);

  // The first two queries are the contract in its own words, so retrieval stays
  // anchored to this document; the topic queries then cover the ground a blend
  // of them would miss.
  const document =
    contractType === "employment"
      ? [
          `Хөдөлмөрийн гэрээ хуулийн нийцэл ${keywords}: ${excerpt.slice(0, 2_000)}`,
          `Хөдөлмөрийн тухай хууль хөдөлмөрийн гэрээ: ${excerpt.slice(2_000, 5_000)}`,
        ]
      : [
          `Түрээсийн гэрээ хуулийн нийцэл ${keywords}: ${excerpt.slice(0, 2_000)}`,
          `Иргэний хууль түрээсийн гэрээ: ${excerpt.slice(2_000, 5_000)}`,
        ];

  return [...document, ...TOPIC_QUERIES[contractType]];
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

/**
 * Stored embeddings for a set of articles, keyed by article number. An article
 * can span several chunks, so each key carries every chunk's vector — a
 * citation is judged against its best-matching chunk.
 *
 * These vectors are already in the table from ingest, so checking a citation
 * costs one embedding call for the finding and nothing for the law.
 */
export async function fetchArticleEmbeddings(
  lawName: string,
  articleNumbers: string[],
): Promise<Map<string, number[][]>> {
  const byArticle = new Map<string, number[][]>();
  if (articleNumbers.length === 0) return byArticle;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("legal_documents")
    .select("article_number, embedding")
    .eq("law_name", lawName)
    .in("article_number", articleNumbers);

  if (error) throw new Error(`Article embedding fetch failed: ${error.message}`);

  for (const row of data ?? []) {
    const article = row.article_number as string | null;
    if (!article) continue;
    // pgvector comes back as a JSON-encoded string over PostgREST.
    const raw = row.embedding as unknown;
    const vector = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(vector)) continue;

    const existing = byArticle.get(article);
    if (existing) existing.push(vector as number[]);
    else byArticle.set(article, [vector as number[]]);
  }

  return byArticle;
}

export function formatRetrievedArticlesForStorage(
  matches: LegalDocumentMatch[],
): Array<{
  lawName: string;
  articleNumber: string | null;
  sectionTitle: string | null;
  similarity: number;
  pinned?: boolean;
}> {
  return matches.map((match) => ({
    lawName: match.law_name,
    articleNumber: match.article_number,
    sectionTitle: match.section_title,
    similarity: match.similarity,
    ...(match.pinned ? { pinned: true } : {}),
  }));
}
