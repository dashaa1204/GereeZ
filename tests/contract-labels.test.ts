import { describe, expect, it } from "vitest";
import { resolveContractLabels } from "@/lib/contract-labels";
import { normalizeAuditResult } from "@/lib/audit/normalize";
import type { AuditResultSchema } from "@/lib/audit/schema";
import type { ContractMetadata } from "@/lib/types/contract";

function meta(
  overrides: Partial<AuditResultSchema["metadata"]> = {},
): AuditResultSchema["metadata"] {
  return {
    tenantName: null,
    landlordName: null,
    monthlyRent: null,
    deposit: null,
    startDate: null,
    endDate: null,
    paymentDay: null,
    contractTitle: null,
    tenantLabel: null,
    landlordLabel: null,
    paymentLabel: null,
    ...overrides,
  };
}

describe("resolveContractLabels", () => {
  it("prefers wording extracted from the contract itself", () => {
    // A sale contract detects as "rental" (civil-code default) but the
    // extracted labels must win over the rental fallback.
    const labels = resolveContractLabels(
      meta({
        contractTitle: "Худалдах, худалдан авах гэрээ",
        tenantLabel: "Худалдан авагч",
        landlordLabel: "Худалдагч",
        paymentLabel: "Гэрээний үнэ",
      }),
      "rental",
    );
    expect(labels).toEqual({
      typeLabel: "Худалдах, худалдан авах гэрээ",
      tenantLabel: "Худалдан авагч",
      landlordLabel: "Худалдагч",
      rentLabel: "Гэрээний үнэ",
    });
  });

  it("falls back to employment wording for label-less employment audits", () => {
    // Audit stored before label extraction shipped: metadata has no label fields.
    const preLabelMetadata: ContractMetadata = {
      tenantName: "С.Сараа",
      landlordName: "Номин Трейд ХХК",
      monthlyRent: 2_000_000,
      deposit: null,
      startDate: null,
      endDate: null,
      paymentDay: 10,
    };
    const labels = resolveContractLabels(preLabelMetadata, "employment");
    expect(labels).toEqual({
      typeLabel: "Хөдөлмөрийн гэрээ",
      tenantLabel: "Ажилтан",
      landlordLabel: "Ажил олгогч",
      rentLabel: "Сарын цалин",
    });
  });

  it("uses rental wording but no type tag when nothing is known", () => {
    const labels = resolveContractLabels(null, undefined);
    expect(labels).toEqual({
      typeLabel: null,
      tenantLabel: "Түрээслэгч",
      landlordLabel: "Эзэмшигч",
      rentLabel: "Сарын түрээс",
    });
  });

  it("resolves each label independently", () => {
    const labels = resolveContractLabels(
      meta({ tenantLabel: "Гүйцэтгэгч" }),
      "rental",
    );
    expect(labels.tenantLabel).toBe("Гүйцэтгэгч");
    expect(labels.landlordLabel).toBe("Эзэмшигч");
    expect(labels.typeLabel).toBe("Түрээсийн гэрээ");
  });
});

describe("normalizeAuditResult label handling", () => {
  function normalize(metadata: AuditResultSchema["metadata"]) {
    return normalizeAuditResult({
      complianceScore: 80,
      summary: "Дүгнэлт",
      alerts: [],
      strengths: [],
      metadata,
    }).metadata;
  }

  it("strips wrapping quotes, colons and whitespace from labels", () => {
    const normalized = normalize(
      meta({
        contractTitle: " «Хамтран ажиллах гэрээ» ",
        tenantLabel: '"Худалдан авагч": ',
        paymentLabel: "Гэрээний  үнэ",
      }),
    );
    expect(normalized.contractTitle).toBe("Хамтран ажиллах гэрээ");
    expect(normalized.tenantLabel).toBe("Худалдан авагч");
    expect(normalized.paymentLabel).toBe("Гэрээний үнэ");
  });

  it("drops runaway or empty labels to null", () => {
    const normalized = normalize(
      meta({
        tenantLabel: "",
        landlordLabel: "  ",
        paymentLabel:
          "Талуудын харилцан тохиролцсон сар бүр төлөх түрээсийн төлбөрийн нийт дүн",
      }),
    );
    expect(normalized.tenantLabel).toBeNull();
    expect(normalized.landlordLabel).toBeNull();
    expect(normalized.paymentLabel).toBeNull();
  });
});
