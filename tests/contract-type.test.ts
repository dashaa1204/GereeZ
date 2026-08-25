import { describe, expect, it } from "vitest";
import {
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
