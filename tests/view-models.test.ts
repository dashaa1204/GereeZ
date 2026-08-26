import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// mapContract is pure, but the module also exports loadAppData,
// which pulls in server-only dependencies — stub those out.
vi.mock("@/lib/contracts", () => ({ getDashboardData: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/credits", () => ({ getBalance: vi.fn() }));
vi.mock("@/lib/alerts", () => ({ getReadAlertIds: vi.fn() }));
vi.mock("@/lib/legal-articles", () => ({ getLawLastUpdated: vi.fn() }));

import { mapContract } from "@/lib/view-models";
import type { Contract } from "@/lib/types/contract";

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    user_id: "user-1",
    file_name: "гэрээ.pdf",
    file_url: null,
    storage_path: "path/гэрээ.pdf",
    compliance_score: 82,
    audit_summary: null,
    status: "completed",
    start_date: null,
    end_date: null,
    page_count: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-15T08:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-02T12:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("mapContract", () => {
  it("maps a completed audit to the screen shape", () => {
    const vm = mapContract(
      makeContract({
        compliance_score: 82,
        page_count: 6,
        end_date: "2026-12-31",
        audit_summary: {
          summary: "Дүгнэлт",
          alerts: [
            {
              severity: "high",
              title: "Зөрчил",
              description: "Тайлбар",
              contractClause: "7.3-р заалт",
              lawName: "Иргэний хууль",
              articleReference: "291 дүгээр зүйл",
            },
          ],
          strengths: ["Талууд тодорхой"],
          metadata: {
            tenantName: "Болд",
            landlordName: "Дорж",
            monthlyRent: 850000,
            deposit: 1700000,
            startDate: "2026-01-01",
            endDate: "2026-12-31",
            paymentDay: 5,
          },
        },
      }),
    );

    expect(vm.status).toBe("compliant");
    expect(vm.paid).toBe(true);
    expect(vm.pages).toBe(6);
    expect(vm.tenant).toBe("Болд");
    expect(vm.rent).toBe(850000);
    expect(vm.findings).toHaveLength(1);
    expect(vm.findings[0].clause).toBe("7.3-р заалт — Зөрчил");
    expect(vm.strengths).toEqual(["Талууд тодорхой"]);
  });

  it("derives status from the score", () => {
    expect(mapContract(makeContract({ compliance_score: 75 })).status).toBe("compliant");
    expect(mapContract(makeContract({ compliance_score: 60 })).status).toBe("warning");
    expect(mapContract(makeContract({ compliance_score: 30 })).status).toBe("risk");
    expect(mapContract(makeContract({ status: "pending", compliance_score: null })).status).toBe("pending");
    expect(mapContract(makeContract({ status: "processing", compliance_score: null })).status).toBe("pending");
  });

  it("keeps a failed audit apart from one still waiting", () => {
    // The list tells the user to wait for a "pending" contract. A failed one
    // waits for nothing — it needs them to start it again.
    const failed = mapContract(makeContract({ status: "failed", compliance_score: null }));
    expect(failed.status).toBe("failed");
    expect(failed.paid).toBe(false);
  });
});
