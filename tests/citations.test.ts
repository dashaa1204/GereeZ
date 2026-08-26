import { describe, expect, it } from "vitest";
import {
  applyCitationRanking,
  capUncitedConfidence,
  citedArticleNumber,
  MAX_CITATION_RANK,
} from "@/lib/audit/citations";
import type { AuditResultSchema } from "@/lib/audit/schema";

type Alert = AuditResultSchema["alerts"][number];

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    severity: "high",
    confidence: "high",
    title: "Барьцаа мөнгө буцаах хугацаа заагаагүй",
    description: "Гэрээнд буцаан олгох хугацаа тодорхойгүй байна.",
    contractClause: "5.10-р заалт",
    lawName: "Иргэний хууль",
    articleReference: "299 дүгээр зүйл",
    ...overrides,
  };
}

describe("citedArticleNumber", () => {
  it("reads the article out of a Mongolian citation", () => {
    expect(citedArticleNumber("296.1 дүгээр зүйл")).toBe("296");
    expect(citedArticleNumber("300 дугаар зүйл")).toBe("300");
  });

  it("returns null when there is no number to read", () => {
    expect(citedArticleNumber("")).toBeNull();
    expect(citedArticleNumber("Иргэний хууль")).toBeNull();
  });
});

describe("applyCitationRanking", () => {
  it("keeps a citation the finding's own text ranks first", () => {
    const alerts = [makeAlert({ articleReference: "295 дүгээр зүйл" })];
    const [checked] = applyCitationRanking(
      alerts,
      new Map([[0, ["295", "294", "292", "299"]]]),
    );

    expect(checked.articleReference).toBe("295 дүгээр зүйл");
    expect(checked.confidence).toBe("high");
  });

  it("keeps a citation that drifted to the last supported rank", () => {
    const ranked = ["295", "294", "292", "298", "289", "299", "300"];
    const cited = ranked[MAX_CITATION_RANK - 1];
    const alerts = [makeAlert({ articleReference: `${cited} дугаар зүйл` })];
    const [checked] = applyCitationRanking(alerts, new Map([[0, ranked]]));

    expect(checked.articleReference).toBe(`${cited} дугаар зүйл`);
  });

  it("drops the deposit finding's citation to the possession article", () => {
    // The case from the audit screen: «299 Хөлслөгч эзэмшлээ хамгаалах эрх»
    // carries nothing about deposits, and ranked 18th of 24 against the
    // finding's own text.
    const alerts = [makeAlert()];
    const ranked = [
      "295", "294", "292", "298", "289", "300", "288", "293",
      "296", "287", "290", "291", "297", "301", "318", "321",
      "332", "299", "302", "312",
    ];
    const [checked] = applyCitationRanking(alerts, new Map([[0, ranked]]));

    expect(checked.articleReference).toBe("");
    expect(checked.confidence).toBe("low");
    expect(checked.title).toBe(alerts[0].title);
    expect(checked.severity).toBe("high");
  });

  it("drops a citation to an article that was not ranked at all", () => {
    const alerts = [makeAlert({ articleReference: "287 дугаар зүйл" })];
    const [checked] = applyCitationRanking(
      alerts,
      new Map([[0, ["295", "294", "292"]]]),
    );

    expect(checked.articleReference).toBe("");
  });

  it("leaves an alert alone when verification did not run for it", () => {
    const alerts = [makeAlert()];
    const [checked] = applyCitationRanking(alerts, new Map());

    expect(checked.articleReference).toBe("299 дүгээр зүйл");
    expect(checked.confidence).toBe("high");
  });
});

describe("capUncitedConfidence", () => {
  it("caps a high-confidence finding that cites nothing", () => {
    const [capped] = capUncitedConfidence([
      makeAlert({ articleReference: "", confidence: "high" }),
    ]);

    expect(capped.confidence).toBe("medium");
  });

  it("leaves a cited finding's confidence alone", () => {
    const [capped] = capUncitedConfidence([
      makeAlert({ articleReference: "295 дүгээр зүйл", confidence: "high" }),
    ]);

    expect(capped.confidence).toBe("high");
  });

  it("does not raise a low-confidence finding", () => {
    const [capped] = capUncitedConfidence([
      makeAlert({ articleReference: "", confidence: "low" }),
    ]);

    expect(capped.confidence).toBe("low");
  });
});
