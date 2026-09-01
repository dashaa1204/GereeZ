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
 * Letters that look like the ones we want and are not them. The model reaches
 * for these occasionally; a reader cannot tell the difference and the database
 * can tell nothing else.
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic letters belonging to other alphabets. «Иргэній хууль» is in the
  // live data with the first of these.
  "і": "и", // і (Ukrainian) → и
  "ї": "й", // ї → й
  "ӏ": "и", // ӏ → и
  // Latin. Both scripts sit on the same keyboard and every English gloss the
  // model writes is already Latin, so one letter crossing over mid-word is the
  // likeliest way one of these names comes back wrong. The name is lower-cased
  // before the fold, which is why pairs that are twins only as capitals —
  // В/B, Н/H, К/K, М/M, Т/T — are listed here in lower case.
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
};

/**
 * Comparison form: letters only, confusables folded, lower case, and the soft
 * and hard signs dropped.
 *
 * Dropping ь is what lets a declined name match the nominative one the
 * knowledge base is keyed by. Mongolian cites a statute in the genitive —
 * «Иргэний хуулийн 296 дугаар зүйл» — and the prefix test below compares that
 * against «Иргэний хууль», where the ь is exactly the letter the suffix
 * replaces. Without this, every case ending («хуульд», «хуулиар», «хуулийн»)
 * is a law we do not recognise; with it, they all still open with the stem
 * «иргэнийхуул».
 */
function lawNameKey(name: string): string {
  // Composed first. «й» has a decomposed form — и plus a combining breve — and
  // text that has been through a macOS file name or some PDF extractors
  // arrives that way. The breve is a mark, not a letter, so the strip below
  // would drop it and leave «иргэнии», a name that matches nothing.
  return [...name.normalize("NFC").trim().toLowerCase()]
    .map((ch) => CONFUSABLES[ch] ?? ch)
    .join("")
    .replace(/[^\p{L}]/gu, "")
    .replace(/[ьъ]/g, "");
}

/**
 * What a law is called when nobody is reading its title page, paired with the
 * name the knowledge base holds it under.
 *
 * «Хөдөлмөрийн хууль» is how the Labor Law is named in ordinary Mongolian, and
 * it is not a decoration of «Хөдөлмөрийн тухай хууль» that any amount of
 * folding recovers — the words differ. A model writing a finding in plain
 * Mongolian reaches for the short form, and that finding then belongs to no
 * law at all.
 */
const LAW_NAME_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ["Хөдөлмөрийн хууль", LAW_NAME_BY_CONTRACT_TYPE.employment],
];

/**
 * The knowledge base's name for this law, or null when the string names no law
 * we have. Tolerates the decoration the model adds — a trailing English gloss,
 * stray spaces, a confusable letter, a case ending, the everyday short name —
 * because the alternative is a finding that silently drops out of every
 * law-update comparison.
 *
 * The prefix rule does mean that a *different* statute whose title opens with
 * one of these names folds into it — «Хөдөлмөрийн тухай хуулийг дагаж мөрдөх
 * журмын тухай хууль» reads as the Labor Law. That is the same trade the gloss
 * makes: we hold neither, so the alternative is not a better answer but no
 * answer, and the near miss at least points at the right subject.
 */
export function canonicalLawName(
  name: string | null | undefined,
): string | null {
  if (!name) return null;
  const key = lawNameKey(name);
  if (!key) return null;
  const candidates: ReadonlyArray<readonly [string, string]> = [
    ...CANONICAL_LAW_NAMES.map((canonical) => [canonical, canonical] as const),
    ...LAW_NAME_ALIASES,
  ];
  for (const [spelling, canonical] of candidates) {
    const spellingKey = lawNameKey(spelling);
    // `startsWith` covers the gloss ("иргэнийхуулmongoliancivilcode") and the
    // case ending ("иргэнийхуулийн296дугаарзүйл") alike — both are the stem
    // plus something.
    if (key === spellingKey || key.startsWith(spellingKey)) return canonical;
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
