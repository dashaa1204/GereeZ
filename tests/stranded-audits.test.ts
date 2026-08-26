import { describe, expect, it } from "vitest";
import { AUDIT_MAX_RUNTIME_MS, isStrandedAudit } from "@/lib/stranded-audits";
import type { Contract, ContractStatus } from "@/lib/types/contract";

const NOW = Date.parse("2026-08-26T12:00:00Z");

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60 * 1000).toISOString();
}

const RUNTIME_MINUTES = AUDIT_MAX_RUNTIME_MS / 60_000;

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
    audited_at: null,
    created_at: minutesAgo(48 * 60),
    updated_at,
  };
}

describe("isStrandedAudit", () => {
  it("strands a processing audit older than the staleness threshold", () => {
    const contract = makeContract("processing", minutesAgo(RUNTIME_MINUTES + 1));
    expect(isStrandedAudit(contract, NOW)).toBe(true);
  });

  it("leaves a running audit alone", () => {
    // Inside the route own runtime ceiling the request may still be live —
    // refunding it would take the credits off an audit that then succeeds.
    const contract = makeContract("processing", minutesAgo(RUNTIME_MINUTES / 2));
    expect(isStrandedAudit(contract, NOW)).toBe(false);
  });

  it("treats the threshold itself as stranded", () => {
    const contract = makeContract("processing", minutesAgo(RUNTIME_MINUTES));
    expect(isStrandedAudit(contract, NOW)).toBe(true);
  });

  it("ignores every status other than processing", () => {
    for (const status of ["pending", "completed", "failed"] as const) {
      const contract = makeContract(status, minutesAgo(72 * 60));
      expect(isStrandedAudit(contract, NOW)).toBe(false);
    }
  });

  it("ignores a row with an unparseable timestamp", () => {
    const contract = makeContract("processing", "not-a-date");
    expect(isStrandedAudit(contract, NOW)).toBe(false);
  });
});
