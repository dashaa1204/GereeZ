import { describe, expect, it } from "vitest";
import { auditCost, canAffordAudit, CREDITS_PER_PAGE } from "@/lib/audit-cost";

describe("auditCost", () => {
  it("charges per page", () => {
    expect(auditCost(6)).toBe(6 * CREDITS_PER_PAGE);
  });

  // Something was still read and the model was still asked about it.
  it("charges for a contract with no countable pages", () => {
    expect(auditCost(0)).toBe(CREDITS_PER_PAGE);
    expect(auditCost(-3)).toBe(CREDITS_PER_PAGE);
  });
});

describe("canAffordAudit", () => {
  it("covers an audit the balance is exactly enough for", () => {
    expect(canAffordAudit(6, 6)).toBe(true);
  });

  it("refuses one the balance is a credit short of", () => {
    expect(canAffordAudit(6, 5)).toBe(false);
  });

  // A contract nobody has quoted has no price to compare against. Locking the
  // card on a number that has not been computed would hide the audit behind
  // arithmetic; the route still refuses with 402 if the balance is short.
  it("treats an unpriced contract as affordable", () => {
    expect(canAffordAudit(null, 0)).toBe(true);
    expect(canAffordAudit(undefined, 0)).toBe(true);
  });

  // The floor in auditCost applies here too, or a zero-page contract would
  // look free on an empty balance and then be refused by the server.
  it("applies the one-credit floor to an empty balance", () => {
    expect(canAffordAudit(0, 0)).toBe(false);
    expect(canAffordAudit(0, 1)).toBe(true);
  });
});
