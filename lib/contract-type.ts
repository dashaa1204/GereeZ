import type { ContractType } from "@/lib/types/contract";

export type { ContractType };

/** Which law each contract type is audited against — must match `law_name` in the vector store. */
export const LAW_NAME_BY_CONTRACT_TYPE: Record<ContractType, string> = {
  rental: "Иргэний хууль",
  employment: "Хөдөлмөрийн тухай хууль",
};

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
