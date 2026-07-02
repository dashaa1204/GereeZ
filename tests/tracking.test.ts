import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  daysUntil,
  expiryLabel,
  formatDateMn,
  formatMNT,
  getTrackStatus,
  sortByExpiry,
} from "@/lib/tracking";
import type { Contract } from "@/lib/types/contract";

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "test-id",
    user_id: "user-1",
    file_name: "test.pdf",
    file_url: null,
    storage_path: "path/test.pdf",
    compliance_score: null,
    audit_summary: null,
    status: "completed",
    start_date: null,
    end_date: null,
    page_count: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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

describe("daysUntil", () => {
  it("counts whole days to a future date", () => {
    expect(daysUntil("2026-07-05")).toBe(3);
  });

  it("is 0 for today regardless of time of day", () => {
    expect(daysUntil("2026-07-02")).toBe(0);
  });

  it("is negative for past dates", () => {
    expect(daysUntil("2026-06-30")).toBe(-2);
  });

  it("is null for missing or invalid dates", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil("огноогүй")).toBeNull();
  });
});

describe("getTrackStatus", () => {
  it("is unknown without an end date", () => {
    expect(getTrackStatus(makeContract())).toBe("unknown");
  });

  it("is expired the day after the end date", () => {
    expect(getTrackStatus(makeContract({ end_date: "2026-07-01" }))).toBe("expired");
  });

  it("is expiring-soon on the end date and within 30 days", () => {
    expect(getTrackStatus(makeContract({ end_date: "2026-07-02" }))).toBe("expiring-soon");
    expect(getTrackStatus(makeContract({ end_date: "2026-08-01" }))).toBe("expiring-soon");
  });

  it("is active beyond 30 days", () => {
    expect(getTrackStatus(makeContract({ end_date: "2026-08-02" }))).toBe("active");
  });

  it("falls back to audit_summary metadata when the column is empty", () => {
    const contract = makeContract({
      audit_summary: {
        summary: "",
        alerts: [],
        strengths: [],
        metadata: {
          tenantName: null,
          landlordName: null,
          monthlyRent: null,
          deposit: null,
          startDate: null,
          endDate: "2026-06-01",
          paymentDay: null,
        },
      },
    });
    expect(getTrackStatus(contract)).toBe("expired");
  });
});

describe("expiryLabel", () => {
  it("labels today, tomorrow, future, and past", () => {
    expect(expiryLabel(makeContract({ end_date: "2026-07-02" }))).toBe("Өнөөдөр дуусна");
    expect(expiryLabel(makeContract({ end_date: "2026-07-03" }))).toBe("Маргааш дуусна");
    expect(expiryLabel(makeContract({ end_date: "2026-07-10" }))).toBe("8 хоногийн дараа дуусна");
    expect(expiryLabel(makeContract({ end_date: "2026-06-27" }))).toBe("5 хоногийн өмнө дууссан");
    expect(expiryLabel(makeContract())).toBeNull();
  });
});

describe("formatMNT", () => {
  it("formats amounts with the currency sign and passes null through", () => {
    expect(formatMNT(1500000)).toMatch(/^1[,. ]500[,. ]000₮$/u);
    expect(formatMNT(null)).toBeNull();
  });
});

describe("formatDateMn", () => {
  it("builds the Mongolian date from ISO parts", () => {
    expect(formatDateMn("2026-09-01")).toBe("2026 оны 9 сарын 1");
  });

  it("rejects non-ISO input", () => {
    expect(formatDateMn("01/09/2026")).toBeNull();
    expect(formatDateMn(null)).toBeNull();
  });
});

describe("sortByExpiry", () => {
  it("orders expiring-soon first, then active, expired, unknown", () => {
    const expiring = makeContract({ id: "expiring", end_date: "2026-07-10" });
    const active = makeContract({ id: "active", end_date: "2026-12-01" });
    const expired = makeContract({ id: "expired", end_date: "2026-01-01" });
    const unknown = makeContract({ id: "unknown" });

    const sorted = sortByExpiry([unknown, expired, active, expiring]);
    expect(sorted.map((c) => c.id)).toEqual(["expiring", "active", "expired", "unknown"]);
  });

  it("sorts soonest-first within a status", () => {
    const later = makeContract({ id: "later", end_date: "2026-07-20" });
    const sooner = makeContract({ id: "sooner", end_date: "2026-07-05" });
    const sorted = sortByExpiry([later, sooner]);
    expect(sorted.map((c) => c.id)).toEqual(["sooner", "later"]);
  });
});
