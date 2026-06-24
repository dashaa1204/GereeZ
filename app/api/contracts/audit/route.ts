import { NextResponse } from "next/server";
import { analyzeContractText, extractPdfText } from "@/lib/audit";
import { formatUserError } from "@/lib/api-errors";
import { generateDemoAudit, isDemoMode } from "@/lib/demo-audit";
import { formatRetrievedArticlesForStorage } from "@/lib/vector-store";
import { CONTRACTS_BUCKET, createAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let contractId: string | undefined;

  try {
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

    if (fetchError || !contract) {
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
    const audit = isDemoMode()
      ? generateDemoAudit(contractText)
      : await analyzeContractText(contractText);

    const auditSummary = {
      summary: audit.summary,
      alerts: audit.alerts,
      strengths: audit.strengths,
      retrievedArticles: formatRetrievedArticlesForStorage(
        audit.retrievedContext.matches,
      ),
      demoMode: isDemoMode(),
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
