import { z } from "zod";
import type { RetrievedLegalContext } from "@/lib/vector-store";
import type { ContractMetadata } from "@/lib/types/contract";

/**
 * Structured facts the audit pulls out of the contract for the tracking view.
 * Every field is nullable: the model returns null when the contract does not
 * state it, rather than guessing.
 */
export const contractMetadataSchema = z.object({
  tenantName: z
    .string()
    .nullable()
    .describe("Түрээслэгч (хөлслөгч)-ийн нэр. Гэрээнд байхгүй бол null."),
  landlordName: z
    .string()
    .nullable()
    .describe("Түрээслүүлэгч (эзэн)-ийн нэр. Гэрээнд байхгүй бол null."),
  monthlyRent: z
    .number()
    .nullable()
    .describe("Сарын түрээсийн төлбөр төгрөгөөр, зөвхөн тоо. Байхгүй бол null."),
  deposit: z
    .number()
    .nullable()
    .describe("Барьцаа/батлан даалтын мөнгө төгрөгөөр, зөвхөн тоо. Байхгүй бол null."),
  startDate: z
    .string()
    .nullable()
    .describe('Гэрээ эхэлсэн огноо "YYYY-MM-DD" хэлбэрээр. Байхгүй бол null.'),
  endDate: z
    .string()
    .nullable()
    .describe('Гэрээ дуусах огноо "YYYY-MM-DD" хэлбэрээр. Байхгүй бол null.'),
  paymentDay: z
    .number()
    .int()
    .nullable()
    .describe("Сар бүр төлбөр төлөх өдөр (1-31). Байхгүй бол null."),
});

/** All-null metadata for paths that have no extracted facts (demo, cache). */
export function emptyContractMetadata(): ContractMetadata {
  return {
    tenantName: null,
    landlordName: null,
    monthlyRent: null,
    deposit: null,
    startDate: null,
    endDate: null,
    paymentDay: null,
  };
}

export const auditResultSchema = z.object({
  complianceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("0–100 хүртэлх хуулийн нийцлийн оноо"),
  summary: z
    .string()
    .describe("Гэрээний хуулийн байдлын товч дүгнэлт — монгол хэлээр"),
  alerts: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low", "info"]),
      confidence: z
        .enum(["high", "medium", "low"])
        .optional()
        .describe(
          'Энэ анхааруулга бодит зөрчил мөн гэдэгт AI хэр итгэлтэй байгаа. Хуулийн эх сурвалжид тодорхой тулгуурлаж байвал "high", дам/эргэлзээтэй бол "medium", эх сурвалж хүрэлцэхгүй эсвэл таамаг бол "low". Severity (ноцтой байдал)-аас тусдаа: бага итгэлтэй ч ноцтой байж болно. Үнэнчээр үнэл.',
        ),
      title: z.string().describe("Анхааруулгын гарчиг — монгол хэлээр"),
      description: z.string().describe("Дэлгэрэнгүй тайлбар — монгол хэлээр"),
      contractClause: z
        .string()
        .optional()
        .describe(
          'Гэрээний аль заалт/хэсэгт энэ асуудал байгаа. Гэрээнд дугаар байвал яг бич (жишээ нь "8.13-р заалт"), байхгүй бол холбогдох өгүүлбэрийг богино эш тат. Олдохгүй бол хоосон үлдээ.',
        ),
      lawName: z
        .string()
        .describe('Иш татсан хуулийн нэр, жишээ нь "Иргэний хууль"'),
      articleReference: z
        .string()
        .describe('Зүйлийн дугаар, жишээ нь "296.1 дүгээр зүйл"'),
    }),
  ),
  strengths: z
    .array(z.string())
    .describe(
      "Түрээслэгчид ашигтай эсвэл хуулийн шаардлагад нийцсэн давуу зүйлс — монгол хэлээр. Түрээслэгчийн үүрэг, хязгаарлалт биш. alerts-д орсон асуудалтай ижил сэдэв, заалтыг давхардуулж бүү бич.",
    ),
  metadata: contractMetadataSchema.describe(
    "Гэрээнээс гаргаж авсан үндсэн мэдээлэл (тал, дүн, огноо) — хяналтын самбарт ашиглана.",
  ),
});

export type AuditResultSchema = z.infer<typeof auditResultSchema>;

export interface AnalyzeContractResult extends AuditResultSchema {
  retrievedContext: RetrievedLegalContext;
}
