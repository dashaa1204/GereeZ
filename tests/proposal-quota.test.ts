import { describe, expect, it } from "vitest";
import {
  inheritedProposalState,
  PROPOSAL_RUNS_PER_AUDIT,
  proposalRunsLeft,
  proposalRunsUsed,
} from "@/lib/proposal-quota";
import type { AuditSummary } from "@/lib/types/contract";

function makeSummary(extra: Partial<AuditSummary> = {}): AuditSummary {
  return {
    summary: "Товч дүгнэлт",
    alerts: [],
    strengths: [],
    ...extra,
  };
}

describe("proposalRunsUsed", () => {
  it("counts nothing used on an audit with no letter", () => {
    expect(proposalRunsUsed(makeSummary())).toBe(0);
  });

  it("reads the recorded count", () => {
    expect(proposalRunsUsed(makeSummary({ proposalRuns: 2 }))).toBe(2);
  });

  it("treats a letter saved before the counter shipped as one run", () => {
    expect(proposalRunsUsed(makeSummary({ proposal: "Эрхэм..." }))).toBe(1);
  });

  it("prefers the recorded count over the stored letter", () => {
    const summary = makeSummary({ proposal: "Эрхэм...", proposalRuns: 3 });
    expect(proposalRunsUsed(summary)).toBe(3);
  });

  it("counts nothing used when there is no audit at all", () => {
    expect(proposalRunsUsed(null)).toBe(0);
  });
});

describe("proposalRunsLeft", () => {
  it("gives a fresh audit its full allowance", () => {
    expect(proposalRunsLeft(makeSummary())).toBe(PROPOSAL_RUNS_PER_AUDIT);
  });

  it("counts down as runs are spent", () => {
    expect(proposalRunsLeft(makeSummary({ proposalRuns: 1 }))).toBe(
      PROPOSAL_RUNS_PER_AUDIT - 1,
    );
  });

  it("runs out at the allowance", () => {
    const spent = makeSummary({ proposalRuns: PROPOSAL_RUNS_PER_AUDIT });
    expect(proposalRunsLeft(spent)).toBe(0);
  });

  // A count above the allowance would otherwise read as a negative balance,
  // and `runsLeft > 0` is what both the route and the card gate on.
  it("never goes negative on an over-counted row", () => {
    const overspent = makeSummary({ proposalRuns: PROPOSAL_RUNS_PER_AUDIT + 5 });
    expect(proposalRunsLeft(overspent)).toBe(0);
  });
});

// A cache hit is the source's audit copied onto another contract, and it is
// charged nothing. If its letters did not come with it, re-uploading the same
// document would mint a fresh allowance each time — free model calls bought
// once.
describe("inheritedProposalState", () => {
  it("carries the letter and what it cost", () => {
    const source = makeSummary({ proposal: "Эрхэм...", proposalRuns: 2 });
    expect(inheritedProposalState(source)).toEqual({
      proposal: "Эрхэм...",
      proposalRuns: 2,
    });
  });

  it("counts a letter saved before the counter as one run spent", () => {
    expect(inheritedProposalState(makeSummary({ proposal: "Эрхэм..." }))).toEqual({
      proposal: "Эрхэм...",
      proposalRuns: 1,
    });
  });

  it("leaves an untouched allowance untouched", () => {
    expect(inheritedProposalState(makeSummary())).toEqual({ proposalRuns: 0 });
  });

  // A spent allowance with no letter to show still has to travel, or the
  // duplicate is a way to buy three more.
  it("carries a spent allowance even with no letter", () => {
    expect(inheritedProposalState(makeSummary({ proposalRuns: 3 }))).toEqual({
      proposalRuns: 3,
    });
  });

  it("has nothing to inherit from a missing audit", () => {
    expect(inheritedProposalState(null)).toEqual({});
    expect(inheritedProposalState(undefined)).toEqual({});
  });
});
