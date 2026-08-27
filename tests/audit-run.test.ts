import { describe, expect, it } from "vitest";
import { auditRunHint, auditRunMode, contractCardState } from "@/lib/audit-run";
import type { ContractVM } from "@/lib/view-models";

function vm(over: Partial<Pick<ContractVM, "status" | "score">>) {
  return { status: "pending" as ContractVM["status"], score: null, ...over };
}

// The three runs cost different things, so the button has to know which one it
// is offering: a retry was already refunded, a re-run is a second audit at full
// price. Getting this backwards prices a paid run as free.
describe("auditRunMode", () => {
  it("calls the first run on an unaudited contract fresh", () => {
    expect(auditRunMode(vm({ status: "pending" }))).toBe("fresh");
  });

  it("calls a run after a failure a retry", () => {
    expect(auditRunMode(vm({ status: "failed" }))).toBe("retry");
  });

  it("calls a run on a finished audit a re-run", () => {
    expect(auditRunMode(vm({ status: "compliant", score: 82 }))).toBe("rerun");
  });

  // A re-run that failed leaves the earlier score on screen. What the user does
  // next is still a retry of the attempt that broke — which was refunded — so
  // the failure has to outrank the leftover score.
  it("reads a failed re-run as a retry, not another re-run", () => {
    expect(auditRunMode(vm({ status: "failed", score: 82 }))).toBe("retry");
  });
});

// The hint is the only place the user is told what a run costs them — in
// credits, and in what it overwrites.
describe("auditRunHint", () => {
  it("promises the refund on a first run, with the price", () => {
    const hint = auditRunHint("fresh", { price: 6 });
    expect(hint).toContain("6 кредит");
    expect(hint).toContain("буцаана");
  });

  it("tells a retry its credits already came back", () => {
    expect(auditRunHint("retry", { price: 6 })).toContain("буцаагдсан");
  });

  // The bug this replaced: "өмнөх дүн хадгалагдсан хэвээр" reads as "your
  // previous result is kept", which is true only of a re-run that fails.
  it("says a re-run replaces the audit it is run on", () => {
    const hint = auditRunHint("rerun", { price: 6 });
    expect(hint).toContain("орлоно");
    expect(hint).not.toContain("хадгалагдсан хэвээр");
  });

  it("names the letter too when there is one to lose", () => {
    expect(auditRunHint("rerun", { price: 6, hasProposal: true })).toContain("захидлыг");
    expect(auditRunHint("rerun", { price: 6 })).not.toContain("захидлыг");
  });

  it("still prices an unquoted contract in words", () => {
    const hint = auditRunHint("rerun", { price: null });
    expect(hint).toContain("кредит");
  });
});

// A delivered audit outranks a later failure: a failed re-run used to replace
// the result card with a failure card, and the score the user paid for
// disappeared from the list.
describe("contractCardState", () => {
  it("shows the result of an audit that was delivered", () => {
    expect(contractCardState(vm({ status: "compliant", score: 82 }))).toBe("result");
  });

  it("keeps showing it after a re-run fails", () => {
    expect(contractCardState(vm({ status: "failed", score: 82 }))).toBe("result");
  });

  it("shows the failure when there is nothing else to show", () => {
    expect(contractCardState(vm({ status: "failed" }))).toBe("failed");
  });

  it("shows an unaudited contract as unaudited", () => {
    expect(contractCardState(vm({ status: "pending" }))).toBe("unaudited");
    expect(contractCardState(vm({ status: "running" }))).toBe("unaudited");
  });
});
