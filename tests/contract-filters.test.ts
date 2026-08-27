import { describe, expect, it } from "vitest";
import {
  CONTRACT_FILTERS,
  matchesFilter,
  parseFilter,
} from "@/lib/contract-filters";
import { PROPOSAL_RUNS_PER_AUDIT } from "@/lib/proposal-quota";
import type { ContractVM } from "@/lib/view-models";

function contract(overrides: Partial<ContractVM>): ContractVM {
  return {
    id: "c1",
    label: "гэрээ.pdf",
    typeLabel: null,
    tenant: "—",
    tenantLabel: "Түрээслэгч",
    landlord: "—",
    landlordLabel: "Эзэмшигч",
    rent: null,
    rentLabel: "Сарын түрээс",
    deposit: null,
    startDate: "—",
    endDate: "—",
    payDay: null,
    score: null,
    status: "pending",
    paid: false,
    hasFile: false,
    pages: null,
    summary: null,
    findings: [],
    strengths: [],
    expiry: null,
    expiringSoon: false,
    expired: false,
    highRisk: false,
    proposal: null,
    proposalRunsLeft: PROPOSAL_RUNS_PER_AUDIT,
    ...overrides,
  };
}

describe("parseFilter", () => {
  it("accepts every filter the chips render", () => {
    for (const f of CONTRACT_FILTERS) {
      expect(parseFilter(f.value)).toBe(f.value);
    }
  });

  it("falls back to the full list for junk, absent or repeated params", () => {
    expect(parseFilter(undefined)).toBe("all");
    expect(parseFilter("bogus")).toBe("all");
    expect(parseFilter("")).toBe("all");
    // `?filter=a&filter=b` arrives as an array; the first valid one wins.
    expect(parseFilter(["high-risk", "expiring"])).toBe("high-risk");
    expect(parseFilter(["bogus"])).toBe("all");
  });
});

describe("matchesFilter", () => {
  const risky = contract({ id: "risky", highRisk: true });
  const soon = contract({ id: "soon", expiringSoon: true });
  const quiet = contract({ id: "quiet" });
  const all = [risky, soon, quiet];

  it("keeps everything under the default filter", () => {
    expect(all.filter((c) => matchesFilter(c, "all"))).toHaveLength(3);
  });

  it("selects exactly the contracts the summary figures count", () => {
    expect(all.filter((c) => matchesFilter(c, "high-risk"))).toEqual([risky]);
    expect(all.filter((c) => matchesFilter(c, "expiring"))).toEqual([soon]);
  });

  it("lets a contract be both risky and expiring", () => {
    const both = contract({ id: "both", highRisk: true, expiringSoon: true });
    expect(matchesFilter(both, "high-risk")).toBe(true);
    expect(matchesFilter(both, "expiring")).toBe(true);
  });
});
