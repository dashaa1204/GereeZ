import { z } from "zod";
import type { RetrievedLegalContext } from "@/lib/vector-store";

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
    .describe("Монгол хуультай нийцсэн зүйлсийн жагсаалт — монгол хэлээр"),
});

export type AuditResultSchema = z.infer<typeof auditResultSchema>;

export interface AnalyzeContractResult extends AuditResultSchema {
  retrievedContext: RetrievedLegalContext;
}
