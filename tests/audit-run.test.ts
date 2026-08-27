import { describe, expect, it } from "vitest";
import { auditRunMode } from "@/lib/audit-run";
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
