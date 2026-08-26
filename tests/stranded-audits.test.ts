import { describe, expect, it } from "vitest";
import { isStrandedAudit } from "@/lib/stranded-audits";
import { STALE_AUDIT_HOURS } from "@/lib/notifications";
import type { Contract, ContractStatus } from "@/lib/types/contract";

const NOW = Date.parse("2026-08-26T12:00:00Z");

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 60 * 60 * 1000).toISOString();
}

function makeContract(
  status: ContractStatus,
  updated_at: string,
): Contract {
  return {
    id: "test-id",
    user_id: "user-1",
    file_name: "test.pdf",
    file_url: null,
    storage_path: "path/test.pdf",
    compliance_score: null,
    audit_summary: null,
    status,
    start_date: null,
    end_date: null,
    page_count: null,
    created_at: hoursAgo(48),
    updated_at,
  };
}

describe("isStrandedAudit", () => {
  it("strands a processing audit older than the staleness threshold", () => {
    const contract = makeContract("processing", hoursAgo(STALE_AUDIT_HOURS + 1));
    expect(isStrandedAudit(contract, NOW)).toBe(true);
  });

  it("leaves a running audit alone", () => {
    // The route caps at 300s, so anything inside the window may still be live —
    // refunding it would take the credits off an audit that then succeeds.
    const contract = makeContract("processing", hoursAgo(STALE_AUDIT_HOURS / 2));
    expect(isStrandedAudit(contract, NOW)).toBe(false);
  });

  it("treats the threshold itself as stranded", () => {
    const contract = makeContract("processing", hoursAgo(STALE_AUDIT_HOURS));
    expect(isStrandedAudit(contract, NOW)).toBe(true);
  });

  it("ignores every status other than processing", () => {
    for (const status of ["pending", "completed", "failed"] as const) {
      const contract = makeContract(status, hoursAgo(72));
      expect(isStrandedAudit(contract, NOW)).toBe(false);
    }
  });

  it("ignores a row with an unparseable timestamp", () => {
    const contract = makeContract("processing", "not-a-date");
    expect(isStrandedAudit(contract, NOW)).toBe(false);
  });
});
