import { NextResponse } from "next/server";
import {
  analyzeContractText,
  detectContractMediaType,
  emptyContractMetadata,
  extractPdfText,
  extractTextWithOCR,
  getPdfPageCount,
  MAX_ANALYZED_CHARS,
  MAX_AUDIT_PAGES,
  MAX_OCR_PDF_PAGES,
} from "@/lib/audit";
import { hashContractText, hashRawFile } from "@/lib/audit/content-hash";
import { formatUserError } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { auditCost, chargeCredits, refundCredits } from "@/lib/credits";
import { generateDemoAudit, isDemoMode } from "@/lib/demo-audit";
import { isStrandedAudit } from "@/lib/stranded-audits";
import type { AuditSummary } from "@/lib/types/contract";
import { formatRetrievedArticlesForStorage } from "@/lib/vector-store";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 300;

// The ceiling on extracted text is MAX_ANALYZED_CHARS — how much the audit can
// actually read (lib/audit/analyze.ts). It used to be a separate 400,000 here
// while the analysis quietly cut the text at 80,000, so a long contract was
// billed by the page and audited by the third. One number now, checked before
// any credits move.

export async function POST(request: Request) {
  let contractId: string | undefined;
  let ownershipVerified = false;
  // Set the moment credits leave the balance. Every exit after that point has
  // to put them back: the user paid for an audit they are not going to get.
  let charged = false;

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit("audit", user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Хэт олон шинжилгээ. Хэсэг хүлээгээд дахин оролдоно уу." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
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

    ownershipVerified = true;

    // One audit at a time. Two runs on the same contract are two AI bills
    // against one charge — the ledger is idempotent — and a result that depends
    // on which of them finishes last. A row inside the route's own runtime
    // ceiling still has a request behind it and is left alone; past it, nothing
    // is running and this call takes the contract over.
    // Not failAudit: that would mark a live audit failed and refund it midway.
    if (contract.status === "processing" && !isStrandedAudit(contract)) {
      return NextResponse.json(
        { error: "Энэ гэрээний шинжилгээ хийгдэж байна. Дуусахыг хүлээнэ үү." },
        { status: 409 },
      );
    }

    // The single way out of a failed audit: refund whatever was charged, leave
    // the row in a state the user can retry from, and say what went wrong.
    // `updated_at` is stamped here as well as by the trigger from migration
    // 014, so a database that has not run it yet still dates the failure
    // correctly — the notification feed reads that date, and the stranded-audit
    // sweep (lib/stranded-audits.ts) measures staleness with it.
    const failAudit = async (message: string, status = 400) => {
      if (charged) {
        await refundCredits(contractId!);
        charged = false;
      }
      await supabase
        .from("contracts")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", contractId);
      return NextResponse.json({ error: message }, { status });
    };

    // Stamping `updated_at` here starts the staleness clock at the moment the
    // audit begins rather than at upload — without it, auditing a contract
    // uploaded hours ago would look abandoned to the sweep while it is running.
    await supabase
      .from("contracts")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", contractId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(contract.storage_path);

    if (downloadError || !fileData) {
      return failAudit(
        `PDF татахад алдаа: ${downloadError?.message}`,
        500,
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mediaType = detectContractMediaType(buffer);

    // Cheapest spam gate: a byte-identical re-upload reuses the prior audit
    // before paying for any OCR or AI. Runs ahead of extraction.
    const rawHash = hashRawFile(buffer);
    if (!isDemoMode()) {
      const { data: dupContract } = await supabase
        .from("contracts")
        .select("compliance_score, audit_summary")
        .eq("status", "completed")
        .eq("user_id", user.id)
        .neq("id", contractId)
        .filter("audit_summary->>rawHash", "eq", rawHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const dupSummary = dupContract?.audit_summary as AuditSummary | null;
      // Only reuse a *fresh* current-pipeline audit as a cache source: it must
      // carry `metadata` (pre-tracking audits don't) and must itself be an
      // original AI run, not a prior cache copy (those may have stamped-empty
      // metadata). This self-heals older copies instead of propagating blanks.
      if (
        dupContract &&
        dupSummary?.alerts &&
        dupSummary.metadata &&
        !dupSummary.cachedFromPriorAudit
      ) {
        const { data: reused, error: reuseError } = await supabase
          .from("contracts")
          .update({
            compliance_score: dupContract.compliance_score,
            audit_summary: { ...dupSummary, cachedFromPriorAudit: true },
            start_date: dupSummary.metadata?.startDate ?? null,
            end_date: dupSummary.metadata?.endDate ?? null,
            status: "completed",
            audited_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", contractId)
          .select()
          .single();
        if (reuseError) {
          return failAudit(`Шинжилгээ хадгалахад алдаа: ${reuseError.message}`, 500);
        }
        return NextResponse.json({ contract: reused });
      }
    }

    // Digital PDFs: extract embedded text (free, exact). Image files and
    // image-only/scanned PDFs have no extractable text — fall back to the
    // vision model to read them into text, then run the normal RAG audit.
    // Page counts are capped so a single large file can't run up an unbounded
    // AI bill; over-limit files are rejected, never silently truncated.
    let contractText = "";
    let pageCount = 1;
    if (mediaType === "application/pdf") {
      pageCount = await getPdfPageCount(buffer);
      if (pageCount > MAX_AUDIT_PAGES) {
        return failAudit(
          `Гэрээ хэт олон хуудастай байна (${pageCount}). Одоогоор ${MAX_AUDIT_PAGES} хүртэл хуудас дэмжинэ.`,
        );
      }
      contractText = await extractPdfText(buffer);
      if (contractText.length < 50 && !isDemoMode()) {
        // No embedded text → scanned PDF. OCR runs in 5-page chunks, capped at
        // MAX_OCR_PDF_PAGES to bound the (unbilled) Vision spend per file.
        if (pageCount > MAX_OCR_PDF_PAGES) {
          return failAudit(
            `Скан хийсэн PDF хэт олон хуудастай байна (${pageCount}). Зурган гэрээг ${MAX_OCR_PDF_PAGES} хүртэл хуудсаар оруулна уу.`,
          );
        }
        contractText = await extractTextWithOCR(buffer, mediaType, pageCount);
      }
    } else if (mediaType && !isDemoMode()) {
      contractText = await extractTextWithOCR(buffer, mediaType);
    }

    if (contractText.length > MAX_ANALYZED_CHARS) {
      return failAudit(
        `Гэрээний текст хэт урт байна (${contractText.length.toLocaleString()} тэмдэгт). Нэг шинжилгээгээр ${MAX_ANALYZED_CHARS.toLocaleString()} тэмдэгт хүртэл уншина — гэрээгээ хэсэгчлэн оруулна уу. Кредит зарцуулагдаагүй.`,
      );
    }

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
        cachedSummary.contentHash === contentHash &&
        // Reuse only a fresh current-pipeline audit (carries metadata, not a
        // prior cache copy) so pre-tracking and stamped-empty entries re-run.
        cachedSummary.metadata &&
        !cachedSummary.cachedFromPriorAudit
      ) {
        cachedFromPriorAudit = true;
        audit = {
          complianceScore: cachedContract.compliance_score ?? 0,
          summary: cachedSummary.summary,
          alerts: cachedSummary.alerts,
          strengths: cachedSummary.strengths ?? [],
          // Older cached audits may predate the label fields — fill the gaps.
          metadata: { ...emptyContractMetadata(), ...cachedSummary.metadata },
          // Pre-detection audits all ran against the Civil Code as rentals.
          contractType: cachedSummary.contractType ?? "rental",
          retrievedContext: { matches: [], contextText: "", mode: "none" },
        };
      } else {
        // Real AI work ahead — charge credits now (idempotent per contract, so
        // a retry won't double-bill). Demo and cache-hit paths above are free.
        const cost = auditCost(pageCount);
        const charge = await chargeCredits(user.id, contractId, cost);
        if (!charge.ok) {
          return failAudit(
            `Кредит хүрэлцэхгүй байна. Шинжилгээнд ${cost} кредит шаардлагатай, танд ${charge.balance} байна. Дахин цэнэглэнэ үү.`,
            402,
          );
        }
        charged = true;
        // Anything that throws from here on lands in the outer catch, which
        // refunds — no local catch needed to protect the charge.
        audit = await analyzeContractText(contractText);
      }
    }

    const metadata = audit.metadata ?? emptyContractMetadata();
    const auditSummary: AuditSummary = {
      summary: audit.summary,
      alerts: audit.alerts,
      strengths: audit.strengths,
      metadata,
      contractType: audit.contractType,
      contentHash,
      rawHash,
      retrievedArticles: cachedFromPriorAudit
        ? (cachedSummary?.retrievedArticles ?? [])
        : formatRetrievedArticlesForStorage(audit.retrievedContext.matches),
      retrievalMode: cachedFromPriorAudit
        ? cachedSummary?.retrievalMode
        : audit.retrievedContext.mode,
      demoMode: isDemoMode(),
      ...(cachedFromPriorAudit ? { cachedFromPriorAudit: true } : {}),
    };

    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({
        compliance_score: audit.complianceScore,
        audit_summary: auditSummary,
        start_date: metadata.startDate,
        end_date: metadata.endDate,
        page_count: pageCount,
        status: "completed",
        // What the law-update alert compares against. Separate from updated_at,
        // which any later write to the row (a saved correction letter) moves.
        audited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .select()
      .single();

    if (updateError) {
      // The AI work is done but unsaved, so the user has nothing to show for
      // the credits — refund and let them retry rather than bill for a result
      // that never reached the database.
      return failAudit(
        `Шинжилгээ хадгалахад алдаа: ${updateError.message}`,
        500,
      );
    }

    return NextResponse.json({ contract: updatedContract });
  } catch (error) {
    // Only touch the row once we've confirmed it belongs to this user, so an
    // early failure on an attacker-supplied contractId can't flip its status.
    if (contractId && ownershipVerified) {
      try {
        // The refund comes first: a failed status write still leaves the user
        // with their credits back, which is the part they'd notice.
        if (charged) await refundCredits(contractId);
        const supabase = createAdminClient();
        await supabase
          .from("contracts")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", contractId);
      } catch {
        // Best-effort refund and status update
      }
    }

    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}
