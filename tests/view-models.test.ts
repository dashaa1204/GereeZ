import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// mapContract/buildAlerts are pure, but the module also exports loadAppData,
// which pulls in server-only dependencies — stub those out.
vi.mock("@/lib/contracts", () => ({ getDashboardData: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getAuthenticatedUser: vi.fn() }));
vi.mock("@/lib/credits", () => ({ getBalance: vi.fn() }));
vi.mock("@/lib/alerts", () => ({ getReadAlertIds: vi.fn() }));

import { buildAlerts, mapContract } from "@/lib/view-models";
import type { DashboardAlert } from "@/lib/contracts";
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

function makeDashboardAlert(overrides: Partial<DashboardAlert> = {}): DashboardAlert {
  return {
    contractId: "contract-1",
    contractName: "гэрээ.pdf",
    severity: "high",
    title: "Зөрчил",
    description: "Тайлбар",
    lawName: "Иргэний хууль",
    articleReference: "295 дүгээр зүйл",
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
  });
});

describe("buildAlerts", () => {
  it("keeps compliance alert ids stable when another contract is added", () => {
    const c1 = makeContract({ id: "c1" });
    const c2 = makeContract({ id: "c2", file_name: "хоёрдугаар.pdf" });
    const a1 = makeDashboardAlert({ contractId: "c1", title: "Нэг" });
    const a2 = makeDashboardAlert({ contractId: "c1", title: "Хоёр", severity: "medium" });

    const before = buildAlerts([c1], [a1, a2]);
    // A new contract's high-severity alert lands between c1's alerts in the
    // severity-sorted feed — c1's ids must not shift.
    const inserted = makeDashboardAlert({ contractId: "c2", title: "Шинэ" });
    const after = buildAlerts([c1, c2], [a1, inserted, a2]);

    const idsBefore = before.filter((a) => a.id.startsWith("c-c1")).map((a) => a.id);
    const idsAfter = after.filter((a) => a.id.startsWith("c-c1")).map((a) => a.id);
    expect(idsAfter).toEqual(idsBefore);
  });

  it("marks alerts read from the persisted id set", () => {
    const c1 = makeContract({ id: "c1" });
    const alerts = buildAlerts([c1], [makeDashboardAlert({ contractId: "c1" })], new Set(["c-c1-0"]));
    expect(alerts[0].read).toBe(true);
  });

  it("derives expiry alerts with the status in the id", () => {
    const expiring = makeContract({ id: "soon", end_date: "2026-07-20" });
    const expired = makeContract({ id: "gone", end_date: "2026-01-01" });
    const active = makeContract({ id: "fine", end_date: "2027-07-01" });

    const alerts = buildAlerts([expiring, expired, active], []);
    const ids = alerts.map((a) => a.id);
    expect(ids).toContain("e-soon-expiring-soon");
    expect(ids).toContain("e-gone-expired");
    expect(ids.some((id) => id.startsWith("e-fine"))).toBe(false);
  });

  it("re-surfaces an escalated expiry alert as unread", () => {
    // Read while expiring-soon…
    const readIds = new Set(["e-c1-expiring-soon"]);
    // …then the contract expires: new id, so it must come back unread.
    const expired = makeContract({ id: "c1", end_date: "2026-06-01" });
    const alerts = buildAlerts([expired], [], readIds);
    expect(alerts[0].id).toBe("e-c1-expired");
    expect(alerts[0].read).toBe(false);
  });

  it("sorts by severity then date descending", () => {
    const c1 = makeContract({ id: "c1", end_date: "2026-07-20" }); // expiring → medium
    const high = makeDashboardAlert({ contractId: "c1", title: "Ноцтой" });
    const alerts = buildAlerts([c1], [high]);
    expect(alerts[0].severity).toBe("high");
    expect(alerts[1].type).toBe("expiry");
  });
});
