import { describe, expect, it } from "vitest";
import {
  canonicalLawName,
  detectContractType,
  LAW_NAME_BY_CONTRACT_TYPE,
} from "@/lib/contract-type";
import { buildContractSearchQueries } from "@/lib/vector-store";

const RENTAL_CONTRACT = `ОРОН СУУЦНЫ ТҮРЭЭСИЙН ГЭРЭЭ

Нэг талаас түрээслүүлэгч Д.Дорж, нөгөө талаас түрээслэгч Б.Болд нар
дараах нөхцөлөөр тохиролцов.

1.1. Түрээслүүлэгч нь Баянзүрх дүүрэг дэх 2 өрөө орон сууцыг
түрээслэгчид ашиглуулна.
2.1. Сарын түрээсийн төлбөр 1,500,000 төгрөг байна.
2.2. Түрээслэгч барьцаа болгон 3,000,000 төгрөг төлнө.
3.1. Гэрээг цуцлах бол 30 хоногийн өмнө мэдэгдэнэ.`;

const EMPLOYMENT_CONTRACT = `ХӨДӨЛМӨРИЙН ГЭРЭЭ

Нэг талаас ажил олгогч "Номин Трейд" ХХК, нөгөө талаас ажилтан
С.Сараа нар Хөдөлмөрийн тухай хуулийн дагуу дараах нөхцөлөөр тохиролцов.

1.1. Ажилтан нь нягтлан бодогчийн албан тушаалд ажиллана.
2.1. Сарын үндсэн цалин 2,000,000 төгрөг байна.
2.2. Цалинг сар бүрийн 10-ны өдөр олгоно.
3.1. Ажлын цаг өдөрт 8 цаг байна.
3.2. Ажилтан жил бүр ээлжийн амралт эдэлнэ.
4.1. Ажил олгогч нийгмийн даатгалын шимтгэл төлнө.
5.1. Туршилтын хугацаа 3 сар байна.`;

describe("detectContractType", () => {
  it("classifies a rental contract as rental", () => {
    expect(detectContractType(RENTAL_CONTRACT)).toBe("rental");
  });

  it("classifies an employment contract as employment", () => {
    expect(detectContractType(EMPLOYMENT_CONTRACT)).toBe("employment");
  });

  it("defaults to rental for empty or unrecognizable text", () => {
    expect(detectContractType("")).toBe("rental");
    expect(detectContractType("Энгийн баримт бичиг, огноо, гарын үсэг.")).toBe(
      "rental",
    );
  });

  it("is case-insensitive", () => {
    expect(detectContractType(EMPLOYMENT_CONTRACT.toUpperCase())).toBe(
      "employment",
    );
  });

  it("classifies employment even when rental words appear in passing", () => {
    // Real employment contracts may mention housing support (байрны түрээс).
    const text = `${EMPLOYMENT_CONTRACT}\n6.1. Ажил олгогч байрны түрээсийн зардлын 50%-ийг нөхөн олгоно.`;
    expect(detectContractType(text)).toBe("employment");
  });
});

describe("LAW_NAME_BY_CONTRACT_TYPE", () => {
  it("maps rental to the Civil Code and employment to the Labor Law", () => {
    expect(LAW_NAME_BY_CONTRACT_TYPE.rental).toBe("Иргэний хууль");
    expect(LAW_NAME_BY_CONTRACT_TYPE.employment).toBe("Хөдөлмөрийн тухай хууль");
  });
});

describe("buildContractSearchQueries", () => {
  it("builds rental-flavored queries by default", () => {
    const queries = buildContractSearchQueries(RENTAL_CONTRACT);
    expect(queries.join(" ")).toContain("Түрээсийн гэрээ");
    expect(queries.join(" ")).toContain("Иргэний хууль");
  });

  it("builds employment-flavored queries for employment contracts", () => {
    const queries = buildContractSearchQueries(EMPLOYMENT_CONTRACT, "employment");
    const joined = queries.join(" ");
    expect(joined).toContain("Хөдөлмөрийн гэрээ");
    expect(joined).toContain("Хөдөлмөрийн тухай хууль");
    expect(joined).not.toContain("Түрээсийн гэрээ");
  });

  it("leads with the contract's own text, then asks each topic separately", () => {
    const queries = buildContractSearchQueries(RENTAL_CONTRACT);

    // A blended topic query returns the lease chapter for every topic at once,
    // so each dispute area gets its own query and its own retrieval slots.
    expect(queries.length).toBeGreaterThan(3);
    expect(queries[0]).toContain(RENTAL_CONTRACT.slice(0, 40));
    expect(queries.some((q) => q.includes("Дэнчин"))).toBe(true);
    expect(queries.some((q) => q.includes("анз"))).toBe(true);
  });
});

// A law name is a join key: `law_last_updated` groups by it, and an audit is
// matched to a law update by string comparison. The live data holds three
// names for one law — a gloss, a stray space, and a Ukrainian і — and each of
// them belongs to no law at all as far as the comparison is concerned.
describe("canonicalLawName", () => {
  it("passes the knowledge base's own names through", () => {
    expect(canonicalLawName("Иргэний хууль")).toBe("Иргэний хууль");
    expect(canonicalLawName("Хөдөлмөрийн тухай хууль")).toBe("Хөдөлмөрийн тухай хууль");
  });

  it("strips the English gloss the model adds", () => {
    expect(canonicalLawName("Иргэний хууль (Mongolian Civil Code)")).toBe("Иргэний хууль");
  });

  it("folds a confusable letter back", () => {
    // «Иргэній» — Ukrainian і (U+0456) where и belongs. Indistinguishable on
    // screen, and a different string to every comparison.
    expect(canonicalLawName("Иргэн\u0456й хууль (Mongolian Civil Code)")).toBe("Иргэний хууль");
  });

  it("folds a decomposed «й» back", () => {
    // и + U+0306 renders as й and is what some PDF extractors and macOS file
    // names hand over. The breve is a mark, not a letter, so a key built
    // without composing first reads «иргэнии» and matches nothing.
    for (const name of Object.values(LAW_NAME_BY_CONTRACT_TYPE)) {
      expect(name.normalize("NFD")).not.toBe(name);
      expect(canonicalLawName(name.normalize("NFD"))).toBe(name);
    }
  });

  it("folds a Latin letter that crossed into the middle of a name", () => {
    // Both scripts are on the same keyboard, and the model is already writing
    // Latin in the gloss beside the name.
    expect(canonicalLawName("Иpгэний хууль")).toBe("Иргэний хууль"); // Latin p
    expect(canonicalLawName("Иргэний хyyль")).toBe("Иргэний хууль"); // Latin y
    expect(canonicalLawName("Хөдөлмөрийн туxaй хууль")).toBe(
      "Хөдөлмөрийн тухай хууль",
    ); // Latin x, a
    // Twins only as capitals, so the fold has to survive lower-casing.
    expect(canonicalLawName("ИPГЭНИЙ ХУУЛЬ")).toBe("Иргэний хууль"); // Latin P
  });

  it("reads a law cited in a case ending, which is how Mongolian cites one", () => {
    expect(canonicalLawName("Иргэний хуулийн 296.1 дүгээр зүйл")).toBe(
      "Иргэний хууль",
    );
    expect(canonicalLawName("Иргэний хуульд")).toBe("Иргэний хууль");
    expect(canonicalLawName("Иргэний хуулиар")).toBe("Иргэний хууль");
    expect(canonicalLawName("Хөдөлмөрийн тухай хуулийн 21 дүгээр зүйл")).toBe(
      "Хөдөлмөрийн тухай хууль",
    );
  });

  it("knows the Labor Law by its everyday name", () => {
    // Not a decoration of «Хөдөлмөрийн тухай хууль» — «тухай» is simply absent,
    // and no folding recovers a missing word.
    expect(canonicalLawName("Хөдөлмөрийн хууль")).toBe("Хөдөлмөрийн тухай хууль");
    expect(canonicalLawName("Хөдөлмөрийн хуулийн 21.2")).toBe(
      "Хөдөлмөрийн тухай хууль",
    );
  });

  it("ignores spacing and case", () => {
    expect(canonicalLawName("  иргэний   хууль ")).toBe("Иргэний хууль");
  });

  it("returns null for a law we do not hold", () => {
    expect(canonicalLawName("Эрүүгийн хууль")).toBeNull();
    expect(canonicalLawName("")).toBeNull();
    expect(canonicalLawName(null)).toBeNull();
    expect(canonicalLawName(undefined)).toBeNull();
  });

  it("does not swallow a different law that starts out sounding like ours", () => {
    // The looser the fold, the more this matters: these are separate statutes
    // we hold no text for, and answering with the wrong one is worse than
    // answering with nothing.
    expect(canonicalLawName("Иргэний нисэхийн тухай хууль")).toBeNull();
    expect(
      canonicalLawName("Иргэний хэрэг шүүхэд хянан шийдвэрлэх тухай хууль"),
    ).toBeNull();
    expect(canonicalLawName("Хөдөлмөр эрхлэлтийг дэмжих тухай хууль")).toBeNull();
    expect(canonicalLawName("Нийгмийн даатгалын тухай хууль")).toBeNull();
    // A gloss on its own names nothing: the Cyrillic name is what we match.
    expect(canonicalLawName("Mongolian Civil Code")).toBeNull();
  });
});
