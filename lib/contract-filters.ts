import type { ContractVM } from "./view-models";

/**
 * The subsets of the contract list the home screen's summary figures link
 * into. A card that reads "Өндөр эрсдэл — 3" has to land on those three
 * contracts and nothing else, so every figure up there has a filter here that
 * selects contracts the same way the figure counts them.
 *
 * Kept out of the screen component so the server page can validate the query
 * string against the same list the client renders chips from.
 */
export const CONTRACT_FILTERS = [
  { value: "all", label: "Бүгд" },
  { value: "high-risk", label: "Өндөр эрсдэл" },
  { value: "expiring", label: "Удахгүй дуусна" },
] as const;

export type ContractFilter = (typeof CONTRACT_FILTERS)[number]["value"];

/** The line under the empty state, worded for the filter that emptied it. */
export const FILTER_EMPTY_HINT: Record<ContractFilter, string> = {
  all: "Нүүр хуудаснаас гэрээгээ оруулна уу.",
  "high-risk": "Өндөр эрсдэлтэй заалт илэрсэн гэрээ алга байна.",
  expiring: "Ойрын 30 хоногт дуусах гэрээ алга байна.",
};

/** An unknown or absent `?filter=` falls back to the full list. */
export function parseFilter(
  value: string | string[] | undefined,
): ContractFilter {
  const first = Array.isArray(value) ? value[0] : value;
  return CONTRACT_FILTERS.some((f) => f.value === first)
    ? (first as ContractFilter)
    : "all";
}

export function matchesFilter(c: ContractVM, filter: ContractFilter): boolean {
  if (filter === "high-risk") return c.highRisk;
  if (filter === "expiring") return c.expiringSoon;
  return true;
}
