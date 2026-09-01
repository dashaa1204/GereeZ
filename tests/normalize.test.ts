import { describe, expect, it } from "vitest";
import {
  computeComplianceScore,
  groundCitations,
  normalizeAuditResult,
} from "@/lib/audit/normalize";
import type { AuditResultSchema } from "@/lib/audit/schema";

type Alert = AuditResultSchema["alerts"][number];

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    severity: "medium",
    title: "Барьцааны нөхцөл тодорхой бус",
    description: "Барьцаа буцаах хугацаа заагаагүй.",
    contractClause: "5.1-р заалт",
    lawName: "Иргэний хууль",
    articleReference: "295 дүгээр зүйл",
    ...overrides,
  };
}

function makeResult(overrides: Partial<AuditResultSchema> = {}): AuditResultSchema {
  return {
    complianceScore: 100,
    summary: "Дүгнэлт.",
    alerts: [],
    strengths: [],
    metadata: {
      tenantName: null,
      landlordName: null,
      monthlyRent: null,
      deposit: null,
      startDate: null,
      endDate: null,
      paymentDay: null,
      noticePeriodDays: null,
      contractTitle: null,
      tenantLabel: null,
      landlordLabel: null,
      paymentLabel: null,
    },
    ...overrides,
  };
}

describe("computeComplianceScore", () => {
  it("deducts by severity from 100", () => {
    const alerts = [
      makeAlert({ severity: "high" }), // -10
      makeAlert({ severity: "medium", title: "Өөр асуудал" }), // -5
      makeAlert({ severity: "low", title: "Гурав дахь" }), // -2
      makeAlert({ severity: "info", title: "Дөрөв дэх" }), // -0
    ];
    expect(computeComplianceScore(alerts)).toBe(83);
  });

  it("never goes below 0", () => {
    const alerts = Array.from({ length: 15 }, (_, i) =>
      makeAlert({ severity: "high", title: `Зөрчил ${i}` }),
    );
    expect(computeComplianceScore(alerts)).toBe(0);
  });
});

describe("normalizeAuditResult — alerts", () => {
  it("dedupes same-title alerts keeping the highest severity", () => {
    const result = normalizeAuditResult(
      makeResult({
        alerts: [
          makeAlert({ severity: "low" }),
          makeAlert({ severity: "high" }),
        ],
      }),
    );
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].severity).toBe("high");
  });

  it("recomputes the score from the surviving alerts", () => {
    const result = normalizeAuditResult(
      makeResult({
        complianceScore: 12,
        alerts: [makeAlert({ severity: "high" })],
      }),
    );
    expect(result.complianceScore).toBe(90);
  });

  it("converts English article references to Mongolian", () => {
    const result = normalizeAuditResult(
      makeResult({ alerts: [makeAlert({ articleReference: "Article 295" })] }),
    );
    expect(result.alerts[0].articleReference).toBe("295 дүгээр зүйл");
  });

  it("defaults a missing law name", () => {
    const result = normalizeAuditResult(
      makeResult({ alerts: [makeAlert({ lawName: "  " })] }),
    );
    expect(result.alerts[0].lawName).toBe("Иргэний хууль");
  });

  it("keeps the citation of a law we hold, whatever the model called it", () => {
    const result = normalizeAuditResult(
      makeResult({
        alerts: [
          makeAlert({
            lawName: "Иргэний хуулийн (Mongolian Civil Code)",
            articleReference: "295 дүгээр зүйл",
            confidence: "high",
          }),
        ],
      }),
    );
    expect(result.alerts[0].lawName).toBe("Иргэний хууль");
    expect(result.alerts[0].articleReference).toBe("295 дүгээр зүйл");
    expect(result.alerts[0].confidence).toBe("high");
  });

  it("drops the citation when the finding names a law we do not hold", () => {
    // Retrieval put one law in front of the model, named in the prompt, so an
    // article beside a different law's name did not come from that context.
    // Carrying the number over to the audited law would print article 15 of
    // the Labor Law under a finding about social insurance.
    const result = normalizeAuditResult(
      makeResult({
        alerts: [
          makeAlert({
            lawName: "Нийгмийн даатгалын тухай хууль",
            articleReference: "15.1 дүгээр зүйл",
            confidence: "high",
          }),
        ],
      }),
      "Хөдөлмөрийн тухай хууль",
    );
    // The join key survives — the finding still belongs to the law this audit
    // was measured against, and moves when that law does.
    expect(result.alerts[0].lawName).toBe("Хөдөлмөрийн тухай хууль");
    expect(result.alerts[0].articleReference).toBe("");
    expect(result.alerts[0].confidence).toBe("low");
  });

  it("does not punish a finding that never claimed an article", () => {
    // Nothing was dropped, so nothing is owed: an unsourced observation about
    // the contract text is capped elsewhere, not pushed to "low" here.
    const result = normalizeAuditResult(
      makeResult({
        alerts: [
          makeAlert({
            lawName: "Нийгмийн даатгалын тухай хууль",
            articleReference: "",
            confidence: "medium",
          }),
        ],
      }),
    );
    expect(result.alerts[0].lawName).toBe("Иргэний хууль");
    expect(result.alerts[0].confidence).toBe("medium");
  });
});

describe("normalizeAuditResult — metadata", () => {
  it("keeps valid extracted facts", () => {
    const result = normalizeAuditResult(
      makeResult({
        metadata: {
          tenantName: " Болд ",
          landlordName: "Дорж",
          monthlyRent: 1500000,
          deposit: 3000000,
          startDate: "2026-01-15",
          endDate: "2026-12-31",
          paymentDay: 5,
          noticePeriodDays: 30,
          contractTitle: "Түрээсийн гэрээ",
          tenantLabel: "Түрээслэгч",
          landlordLabel: "Түрээслүүлэгч",
          paymentLabel: "Сарын түрээс",
        },
      }),
    );
    expect(result.metadata).toEqual({
      tenantName: "Болд",
      landlordName: "Дорж",
      monthlyRent: 1500000,
      deposit: 3000000,
      startDate: "2026-01-15",
      endDate: "2026-12-31",
      paymentDay: 5,
      noticePeriodDays: 30,
      contractTitle: "Түрээсийн гэрээ",
      tenantLabel: "Түрээслэгч",
      landlordLabel: "Түрээслүүлэгч",
      paymentLabel: "Сарын түрээс",
    });
  });

  it("nulls impossible calendar dates instead of rolling them forward", () => {
    const result = normalizeAuditResult(
      makeResult({
        metadata: {
          tenantName: null,
          landlordName: null,
          monthlyRent: null,
          deposit: null,
          startDate: "2026-02-31",
          endDate: "31.12.2026",
          paymentDay: null,
          noticePeriodDays: null,
          contractTitle: null,
          tenantLabel: null,
          landlordLabel: null,
          paymentLabel: null,
        },
      }),
    );
    expect(result.metadata?.startDate).toBeNull();
    expect(result.metadata?.endDate).toBeNull();
  });

  it("nulls non-positive amounts and out-of-range payment days", () => {
    const result = normalizeAuditResult(
      makeResult({
        metadata: {
          tenantName: null,
          landlordName: null,
          monthlyRent: -500,
          deposit: 0,
          startDate: null,
          endDate: null,
          paymentDay: 32,
          noticePeriodDays: null,
          contractTitle: null,
          tenantLabel: null,
          landlordLabel: null,
          paymentLabel: null,
        },
      }),
    );
    expect(result.metadata?.monthlyRent).toBeNull();
    expect(result.metadata?.deposit).toBeNull();
    expect(result.metadata?.paymentDay).toBeNull();
  });

  it("nulls a notice period long enough to be a misread term length", () => {
    const withNotice = (noticePeriodDays: number | null) =>
      normalizeAuditResult(
        makeResult({
          metadata: {
            tenantName: null,
            landlordName: null,
            monthlyRent: null,
            deposit: null,
            startDate: null,
            endDate: null,
            paymentDay: null,
            noticePeriodDays,
            contractTitle: null,
            tenantLabel: null,
            landlordLabel: null,
            paymentLabel: null,
          },
        }),
      ).metadata?.noticePeriodDays;

    expect(withNotice(30)).toBe(30);
    expect(withNotice(365)).toBeNull(); // a one-year term, not a notice period
    expect(withNotice(0)).toBeNull();
  });
});

describe("groundCitations", () => {
  it("keeps a citation the retrieval step supplied", () => {
    const alerts = [makeAlert({ articleReference: "295 дүгээр зүйл" })];
    const [grounded] = groundCitations(alerts, new Set(["295"]));

    expect(grounded.articleReference).toBe("295 дүгээр зүйл");
    expect(grounded.confidence).toBeUndefined();
  });

  it("matches a sub-article citation against its parent article", () => {
    const alerts = [makeAlert({ articleReference: "289.2.5 дугаар зүйл" })];
    const [grounded] = groundCitations(alerts, new Set(["289"]));

    expect(grounded.articleReference).toBe("289.2.5 дугаар зүйл");
  });

  it("strips a citation to an article nobody retrieved", () => {
    const alerts = [
      makeAlert({ articleReference: "299 дүгээр зүйл", confidence: "high" }),
    ];
    const [grounded] = groundCitations(alerts, new Set(["287", "295"]));

    expect(grounded.articleReference).toBe("");
    expect(grounded.confidence).toBe("low");
    // the finding itself survives — only its unsourced reference is dropped
    expect(grounded.title).toBe(alerts[0].title);
    expect(grounded.severity).toBe(alerts[0].severity);
  });

  it("leaves an already-uncited finding alone", () => {
    const alerts = [makeAlert({ articleReference: "", confidence: "medium" })];
    const [grounded] = groundCitations(alerts, new Set(["295"]));

    expect(grounded.articleReference).toBe("");
    expect(grounded.confidence).toBe("medium");
  });
});
