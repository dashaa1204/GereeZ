import { NextResponse } from "next/server";
import { analyzeContractText, extractPdfText } from "@/lib/audit";
import { hashContractText } from "@/lib/audit/content-hash";
import { formatUserError } from "@/lib/api-errors";
import { generateDemoAudit, isDemoMode } from "@/lib/demo-audit";
import type { AuditSummary } from "@/lib/types/contract";
import { formatRetrievedArticlesForStorage } from "@/lib/vector-store";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let contractId: string | undefined;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const body = await request.json();
    contractId = body?.contractId as string | undefined;

    if (!contractId) {
      return NextResponse.json(
        { error: "contractId шаардлагатай" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: contract, error: fetchError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .single();

    // 404 (not 403) when the contract belongs to someone else — don't leak existence.
    if (fetchError || !contract || contract.user_id !== user.id) {
      return NextResponse.json(
        { error: "Гэрээ олдсонгүй" },
        { status: 404 },
      );
    }

    await supabase
      .from("contracts")
      .update({ status: "processing" })
      .eq("id", contractId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(contract.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from("contracts")
        .update({ status: "failed" })
        .eq("id", contractId);
      return NextResponse.json(
        { error: `PDF татахад алдаа: ${downloadError?.message}` },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const contractText = await extractPdfText(buffer);
    const contentHash = hashContractText(contractText);

    let cachedFromPriorAudit = false;
    let cachedSummary: AuditSummary | null = null;

    let audit = isDemoMode()
      ? generateDemoAudit(contractText)
      : null;

    if (!audit) {
      const { data: cachedContract } = await supabase
        .from("contracts")
        .select("compliance_score, audit_summary")
        .eq("status", "completed")
        .eq("user_id", user.id)
        .neq("id", contractId)
        .filter("audit_summary->>contentHash", "eq", contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      cachedSummary = cachedContract?.audit_summary as AuditSummary | null;

      if (
        cachedContract &&
        cachedSummary?.alerts &&
        cachedSummary.contentHash === contentHash
      ) {
        cachedFromPriorAudit = true;
        audit = {
          complianceScore: cachedContract.compliance_score ?? 0,
          summary: cachedSummary.summary,
          alerts: cachedSummary.alerts,
          strengths: cachedSummary.strengths ?? [],
          retrievedContext: { matches: [], contextText: "" },
        };
      } else {
        audit = await analyzeContractText(contractText);
      }
    }

    const auditSummary: AuditSummary = {
      summary: audit.summary,
      alerts: audit.alerts,
      strengths: audit.strengths,
      contentHash,
      retrievedArticles: cachedFromPriorAudit
        ? (cachedSummary?.retrievedArticles ?? [])
        : formatRetrievedArticlesForStorage(audit.retrievedContext.matches),
      demoMode: isDemoMode(),
      ...(cachedFromPriorAudit ? { cachedFromPriorAudit: true } : {}),
    };

    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({
        compliance_score: audit.complianceScore,
        audit_summary: auditSummary,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Шинжилгээ хадгалахад алдаа: ${updateError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ contract: updatedContract });
  } catch (error) {
    if (contractId) {
      try {
        const supabase = createAdminClient();
        await supabase
          .from("contracts")
          .update({ status: "failed" })
          .eq("id", contractId);
      } catch {
        // Best-effort status update
      }
    }

    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}
