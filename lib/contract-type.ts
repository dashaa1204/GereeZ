import type { ContractType } from "@/lib/types/contract";

export type { ContractType };

/** Which law each contract type is audited against — must match `law_name` in the vector store. */
export const LAW_NAME_BY_CONTRACT_TYPE: Record<ContractType, string> = {
  rental: "Иргэний хууль",
  employment: "Хөдөлмөрийн тухай хууль",
};

/**
 * The law names the knowledge base actually uses, and the only ones an audit
 * may be stored under.
 *
 * A law name is a join key, not prose: `law_last_updated` groups the ingested
 * chunks by it, and an audit is matched to a law update by comparing the two
 * strings. So a finding stored as «Иргэний хууль (Mongolian Civil Code)» — or
 * «Иргэній хууль», with a Ukrainian і the model slipped in — belongs to no law
 * at all as far as the app is concerned: it can never be flagged when that law
 * changes, and never re-checked against it.
 *
 * All three of those are in the live data, from findings whose name came
 * straight out of the model. This maps such a string back to the name the
 * knowledge base knows, or returns null when it is nothing we recognise.
 */
const CANONICAL_LAW_NAMES: readonly string[] = Object.values(
  LAW_NAME_BY_CONTRACT_TYPE,
);

/**
 * Cyrillic letters that look like the ones we want and are not them. The model
 * reaches for these occasionally; a reader cannot tell the difference and the
 * database can tell nothing else.
 */
const CONFUSABLES: Record<string, string> = {
  "і": "и", // і (Ukrainian) → и
  "ї": "й", // ї → й
  "ӏ": "и", // ӏ → и
};

/** Comparison form: letters only, confusables folded, lower case. */
function lawNameKey(name: string): string {
  // Composed first. «й» has a decomposed form — и plus a combining breve — and
  // text that has been through a macOS file name or some PDF extractors
  // arrives that way. The breve is a mark, not a letter, so the strip below
  // would drop it and leave «иргэнии», a name that matches nothing.
  return [...name.normalize("NFC").trim().toLowerCase()]
    .map((ch) => CONFUSABLES[ch] ?? ch)
    .join("")
    .replace(/[^\p{L}]/gu, "");
}

/**
 * The knowledge base's name for this law, or null when the string names no law
 * we have. Tolerates the decoration the model adds — a trailing English gloss,
 * stray spaces, a confusable letter — because the alternative is a finding that
 * silently drops out of every law-update comparison.
 */
export function canonicalLawName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const key = lawNameKey(name);
  if (!key) return null;
  for (const canonical of CANONICAL_LAW_NAMES) {
    const canonicalKey = lawNameKey(canonical);
    // `startsWith` covers the gloss: "иргэнийхуульmongoliancivilcode".
    if (key === canonicalKey || key.startsWith(canonicalKey)) return canonical;
  }
  return null;
}

// Weighted markers, scored by occurrence count. Phrases that name the
// contract or a party outright weigh most; topic words that appear in both
// contract types (гэрээ, төлбөр, хугацаа, цуцлах…) are deliberately left out.
const RENTAL_MARKERS: ReadonlyArray<readonly [string, number]> = [
  ["түрээсийн гэрээ", 5],
  ["түрээслүүлэгч", 3],
  ["түрээслэгч", 3],
  ["хөлслүүлэгч", 2],
  ["хөлслөгч", 2],
  ["орон сууц", 2],
  ["түрээс", 1],
  ["барьцаа", 1],
  ["lease", 3],
  ["landlord", 3],
  ["tenant", 3],
];

const EMPLOYMENT_MARKERS: ReadonlyArray<readonly [string, number]> = [
  ["хөдөлмөрийн гэрээ", 5],
  ["хөдөлмөрийн тухай хууль", 4],
  ["ажил олгогч", 3],
  ["ажилтан", 2],
  ["цалин", 2],
  ["ээлжийн амралт", 2],
  ["нийгмийн даатгал", 2],
  ["ажлын цаг", 2],
  ["албан тушаал", 1],
  ["туршилтын хугацаа", 1],
  ["employment", 3],
  ["employer", 3],
  ["employee", 3],
];

// One runaway marker (e.g. "түрээс" in every clause) shouldn't drown out the
// rest of the signal, so per-marker counts are capped.
const MAX_COUNT_PER_MARKER = 10;

function scoreMarkers(
  text: string,
  markers: ReadonlyArray<readonly [string, number]>,
): number {
  let score = 0;
  for (const [marker, weight] of markers) {
    let count = 0;
    let index = text.indexOf(marker);
    while (index !== -1 && count < MAX_COUNT_PER_MARKER) {
      count += 1;
      index = text.indexOf(marker, index + marker.length);
    }
    score += count * weight;
  }
  return score;
}

/**
 * Classify contract text as rental or employment so the audit retrieves from
 * the right law. Keyword heuristic over the extracted text — no AI call.
 * Ties (including empty/unrecognizable text) default to rental, the product's
 * primary case.
 */
export function detectContractType(text: string): ContractType {
  const lower = text.toLowerCase();
  const employmentScore = scoreMarkers(lower, EMPLOYMENT_MARKERS);
  const rentalScore = scoreMarkers(lower, RENTAL_MARKERS);
  return employmentScore > rentalScore ? "employment" : "rental";
}
