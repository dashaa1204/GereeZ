import { describe, expect, it } from "vitest";
import {
  auditStillCurrent,
  lawMovedSince,
  lawsBehindAudit,
} from "@/lib/law-freshness";
import type { AuditSummary } from "@/lib/types/contract";

const CIVIL = "Иргэний хууль";
const LABOR = "Хөдөлмөрийн тухай хууль";
const RAN = "2026-06-01T00:00:00Z";

function summary(over: Partial<AuditSummary> = {}): AuditSummary {
  return {
    summary: "Дүгнэлт",
    alerts: [
      {
        severity: "high",
        title: "Зөрчил",
        description: "Тайлбар",
        lawName: CIVIL,
        articleReference: "295 дугаар зүйл",
      },
    ],
    strengths: [],
    ...over,
  };
}

describe("lawsBehindAudit", () => {
  it("counts the laws its findings cite", () => {
    expect([...lawsBehindAudit(summary())]).toEqual([CIVIL]);
  });

  // Retrieval shapes the answer even where it produced no finding, so a law
  // that was read but not cited still dates the audit.
  it("counts the laws retrieval put in front of the model", () => {
    const laws = lawsBehindAudit(
      summary({
        retrievedArticles: [
          { lawName: LABOR, articleNumber: "21", sectionTitle: null, similarity: 0.8 },
        ],
      }),
    );
    expect([...laws].sort()).toEqual([CIVIL, LABOR].sort());
  });

  it("has nothing behind a missing audit", () => {
    expect(lawsBehindAudit(null).size).toBe(0);
  });
});

describe("lawMovedSince", () => {
  it("reports a law re-ingested after the audit ran", () => {
    const moved = lawMovedSince(RAN, summary(), new Map([[CIVIL, "2026-08-01T00:00:00Z"]]));
    expect(moved?.law).toBe(CIVIL);
  });

  it("says nothing when the ingest predates the audit", () => {
    expect(lawMovedSince(RAN, summary(), new Map([[CIVIL, "2026-01-01T00:00:00Z"]]))).toBeNull();
  });

  it("ignores a law the audit never touched", () => {
    expect(lawMovedSince(RAN, summary(), new Map([[LABOR, "2026-08-01T00:00:00Z"]]))).toBeNull();
  });

  it("reports the newest of several", () => {
    const moved = lawMovedSince(
      RAN,
      summary({
        retrievedArticles: [
          { lawName: LABOR, articleNumber: "21", sectionTitle: null, similarity: 0.8 },
        ],
      }),
      new Map([
        [CIVIL, "2026-07-01T00:00:00Z"],
        [LABOR, "2026-08-01T00:00:00Z"],
      ]),
    );
    expect(moved?.law).toBe(LABOR);
  });
});

describe("auditStillCurrent", () => {
  const moved = new Map([[CIVIL, "2026-08-01T00:00:00Z"]]);

  it("lets a cache hit through while the law has stood still", () => {
    expect(auditStillCurrent(RAN, summary(), new Map([[CIVIL, "2026-01-01T00:00:00Z"]]))).toBe(true);
  });

  it("refuses one the law has outrun", () => {
    expect(auditStillCurrent(RAN, summary(), moved)).toBe(false);
  });

  // Not provably current, and the two mistakes do not cost the same: charging
  // for an audit that runs beats handing back an old reading of a new law.
  it("refuses an audit it cannot date", () => {
    expect(auditStillCurrent(null, summary(), moved)).toBe(false);
    expect(auditStillCurrent("not a date", summary(), moved)).toBe(false);
  });

  // Migration 013 not run: nothing is known to have moved, so reuse stands
  // rather than every cache hit turning into a paid audit.
  it("keeps reusing when no law versions are recorded at all", () => {
    expect(auditStillCurrent(null, summary(), new Map())).toBe(true);
    expect(auditStillCurrent(RAN, summary(), new Map())).toBe(true);
  });
});
