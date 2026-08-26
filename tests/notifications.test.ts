import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildAlerts, type BuildAlertsOptions } from "@/lib/notifications";
import type { AuditAlert, Contract } from "@/lib/types/contract";

const TODAY = "2026-07-02T12:00:00";

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
    audited_at: null,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-15T08:00:00Z",
    ...overrides,
  };
}

function makeFinding(overrides: Partial<AuditAlert> = {}): AuditAlert {
  return {
    severity: "high",
    title: "Зөрчил",
    description: "Тайлбар",
    lawName: "Иргэний хууль",
    articleReference: "295 дүгээр зүйл",
    ...overrides,
  };
}

/** A completed contract carrying the given findings and extracted facts. */
function audited(
  findings: AuditAlert[],
  metadata: Partial<NonNullable<Contract["audit_summary"]>["metadata"]> = {},
  overrides: Partial<Contract> = {},
): Contract {
  return makeContract({
    audit_summary: {
      summary: "Дүгнэлт",
      alerts: findings,
      strengths: [],
      metadata: {
        tenantName: null,
        landlordName: null,
        monthlyRent: null,
        deposit: null,
        startDate: null,
        endDate: null,
        paymentDay: null,
        ...metadata,
      },
    },
    ...overrides,
  });
}

/**
 * The feed under a healthy credit balance, so the low-credit warning only
 * shows up in the tests that are actually about it.
 */
function feed(contracts: Contract[], options: BuildAlertsOptions = {}) {
  return buildAlerts(contracts, { credits: 100, ...options });
}

/** Ids only, for asserting what the feed does and doesn't contain. */
function ids(contracts: Contract[], options: BuildAlertsOptions = {}) {
  return feed(contracts, options).map((a) => a.id);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(TODAY));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("expiry alerts", () => {
  it("emits only the current countdown stage", () => {
    const c = makeContract({ end_date: "2026-07-16" }); // 14 days out
    expect(ids([c])).toEqual(["e-contract-1-d14"]);
  });

  it("replaces the row with a fresh unread one when the stage tightens", () => {
    const read = new Set(["e-contract-1-d14"]);
    const c = makeContract({ end_date: "2026-07-04" }); // 2 days out → d3
    const alerts = feed([c], { readIds: read });
    expect(alerts[0].id).toBe("e-contract-1-d3");
    expect(alerts[0].read).toBe(false);
    expect(alerts[0].severity).toBe("high");
  });

  it("stays quiet outside the 30-day window", () => {
    expect(ids([makeContract({ end_date: "2027-01-01" })])).toEqual([]);
  });

  it("ages long-expired contracts out of the feed", () => {
    const recent = makeContract({ id: "recent", end_date: "2026-06-20" });
    const ancient = makeContract({ id: "ancient", end_date: "2025-01-01" });
    const shown = ids([recent, ancient]);
    expect(shown).toContain("e-recent-expired");
    expect(shown.some((id) => id.startsWith("e-ancient"))).toBe(false);
  });
});

describe("notice-deadline alerts", () => {
  it("fires ahead of the deadline, not ahead of the end date", () => {
    // Ends 2026-08-01, 30 days' notice → deadline 2026-07-02 (today).
    const c = audited([], { endDate: "2026-08-01", noticePeriodDays: 30 });
    const alerts = feed([c]);
    const notice = alerts.find((a) => a.kind === "notice");
    expect(notice?.id).toBe("n-contract-1-2026-07-02");
    expect(notice?.severity).toBe("high");
  });

  it("stays quiet while the deadline is still far off", () => {
    const c = audited([], { endDate: "2026-09-01", noticePeriodDays: 30 });
    expect(feed([c]).some((a) => a.kind === "notice")).toBe(false);
  });

  it("stops once the deadline has passed", () => {
    const c = audited([], { endDate: "2026-07-20", noticePeriodDays: 30 });
    expect(feed([c]).some((a) => a.kind === "notice")).toBe(false);
  });
});

describe("payment alerts", () => {
  it("reminds a few days before the payment day and resets monthly", () => {
    const c = audited([], {
      paymentDay: 5,
      monthlyRent: 1500000,
      startDate: "2026-01-01",
      endDate: "2027-01-01",
    });
    const payment = feed([c]).find((a) => a.kind === "payment");
    expect(payment?.id).toBe("p-contract-1-2026-07-05");
    expect(payment?.body).toContain("1,500,000₮");
  });

  it("stays quiet when the payment day is still far off", () => {
    const c = audited([], { paymentDay: 25, startDate: "2026-01-01" });
    expect(feed([c]).some((a) => a.kind === "payment")).toBe(false);
  });

  it("clamps a 31st payment day to a short month's last day", () => {
    vi.setSystemTime(new Date("2026-02-27T12:00:00"));
    const c = audited([], { paymentDay: 31, startDate: "2026-01-01" });
    const payment = feed([c]).find((a) => a.kind === "payment");
    expect(payment?.id).toBe("p-contract-1-2026-02-28");
  });

  it("does not chase payments on a contract that already ended", () => {
    const c = audited([], {
      paymentDay: 3,
      startDate: "2025-01-01",
      endDate: "2026-07-01",
    });
    expect(feed([c]).some((a) => a.kind === "payment")).toBe(false);
  });

  it("does not chase payments before the contract starts", () => {
    const c = audited([], { paymentDay: 3, startDate: "2026-08-01" });
    expect(feed([c]).some((a) => a.kind === "payment")).toBe(false);
  });
});

describe("deposit alerts", () => {
  it("reminds the user to claim the deposit after the contract ends", () => {
    const c = audited([], { deposit: 3000000, endDate: "2026-06-25" });
    const deposit = feed([c]).find((a) => a.kind === "deposit");
    expect(deposit?.body).toContain("3,000,000₮");
  });

  it("says nothing when no deposit was extracted", () => {
    const c = audited([], { endDate: "2026-06-25" });
    expect(feed([c]).some((a) => a.kind === "deposit")).toBe(false);
  });

  it("stops nagging long after the contract ended", () => {
    const c = audited([], { deposit: 3000000, endDate: "2026-01-01" });
    expect(feed([c]).some((a) => a.kind === "deposit")).toBe(false);
  });
});

describe("audit-state alerts", () => {
  it("says nothing about a completed audit — the flow already showed it", () => {
    expect(ids([makeContract({ compliance_score: 90 })])).toEqual([]);
  });

  it("flags a failed audit and re-surfaces it after each retry", () => {
    const failed = makeContract({ status: "failed", updated_at: "2026-07-01T09:00:00Z" });
    expect(ids([failed])).toEqual(["a-contract-1-failed-2026-07-01"]);

    const retried = makeContract({ status: "failed", updated_at: "2026-07-02T09:00:00Z" });
    const alerts = feed([retried], {
      readIds: new Set(["a-contract-1-failed-2026-07-01"]),
    });
    expect(alerts[0].read).toBe(false);
  });

  it("flags an upload left stranded mid-audit, but not one still running", () => {
    const justStarted = makeContract({
      status: "processing",
      updated_at: new Date(TODAY).toISOString(),
    });
    expect(ids([justStarted])).toEqual([]);

    const stranded = makeContract({ status: "pending", updated_at: "2026-07-01T09:00:00Z" });
    expect(ids([stranded])).toEqual(["a-contract-1-stuck"]);
  });
});

describe("credit alerts", () => {
  it("warns on a low balance and shouts on an empty one", () => {
    expect(feed([], { credits: 4 })[0].severity).toBe("medium");
    expect(feed([], { credits: 0 })[0].severity).toBe("high");
  });

  it("stays quiet on a healthy balance", () => {
    expect(feed([], { credits: 50 })).toEqual([]);
  });

  it("skips account-level alerts for signed-out visitors", () => {
    expect(feed([], { credits: 0, signedIn: false })).toEqual([]);
  });

  it("can warn again next month after a top-up-and-drain cycle", () => {
    const read = new Set(feed([], { credits: 2 }).map((a) => a.id));
    vi.setSystemTime(new Date("2026-08-02T12:00:00"));
    expect(feed([], { credits: 2, readIds: read })[0].read).toBe(false);
  });
});

describe("law-update alerts", () => {
  const cited = audited([makeFinding({ lawName: "Иргэний хууль" })]);

  it("flags an audit measured against text that has since been re-ingested", () => {
    const alerts = feed([cited], {
      lawUpdatedAt: new Map([["Иргэний хууль", "2026-06-20T00:00:00Z"]]),
    });
    const law = alerts.find((a) => a.kind === "law");
    expect(law?.id).toBe("law-contract-1-2026-06-20");
    expect(law?.title).toBe("Иргэний хууль шинэчлэгдсэн");
  });

  it("says nothing when the law predates the audit", () => {
    const alerts = feed([cited], {
      lawUpdatedAt: new Map([["Иргэний хууль", "2026-06-01T00:00:00Z"]]),
    });
    expect(alerts.some((a) => a.kind === "law")).toBe(false);
  });

  it("dates the audit from audited_at, not from a later write to the row", () => {
    // Saving a correction letter writes to the contract, which moves
    // updated_at past the ingest. The audit itself still predates the new law
    // text, so the alert has to survive that write.
    const withLetter = audited([makeFinding({ lawName: "Иргэний хууль" })]);
    const alerts = feed(
      [{ ...withLetter, audited_at: "2026-06-15T08:00:00Z", updated_at: "2026-06-28T09:00:00Z" }],
      { lawUpdatedAt: new Map([["Иргэний хууль", "2026-06-20T00:00:00Z"]]) },
    );
    expect(alerts.some((a) => a.kind === "law")).toBe(true);
  });

  it("says nothing about a law the audit never cited", () => {
    const alerts = feed([cited], {
      lawUpdatedAt: new Map([["Хөдөлмөрийн тухай хууль", "2026-06-20T00:00:00Z"]]),
    });
    expect(alerts.some((a) => a.kind === "law")).toBe(false);
  });
});

describe("the feed as a whole", () => {
  it("never carries an audit finding — violations belong on the audit screen", () => {
    const c = audited([
      makeFinding({ severity: "high", title: "Ноцтой зөрчил" }),
      makeFinding({ severity: "medium", title: "Дунд зэргийн зөрчил" }),
    ]);
    expect(feed([c])).toEqual([]);
  });

  it("puts unread before read, then ranks by severity", () => {
    const soon = makeContract({ id: "soon", end_date: "2026-07-04" }); // high
    const later = makeContract({ id: "later", end_date: "2026-07-30" }); // medium
    const alerts = feed([soon, later], { readIds: new Set(["e-soon-d3"]) });
    expect(alerts.map((a) => a.read)).toEqual([false, true]);
    expect(alerts[0].id).toBe("e-later-d30");
  });
});
