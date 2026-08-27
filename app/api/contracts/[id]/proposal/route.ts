import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { generateCorrectionProposal } from "@/lib/proposal";
import {
  PROPOSAL_RUNS_PER_AUDIT,
  proposalRunsLeft,
  proposalRunsUsed,
} from "@/lib/proposal-quota";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase-server";
import type { AuditSummary, Contract } from "@/lib/types/contract";

export const runtime = "nodejs";

/**
 * Generate a ready-to-send correction letter from a contract's audit findings.
 * The letter takes the weaker party's side and cites the exact law behind each
 * issue — the outcome a plain chatbot won't assemble for the user.
 *
 * The letter is not billed separately: it is one of the things the audit's
 * per-page charge buys, which is what the landing page promises. Paid-for and
 * unlimited are different things, though, and this is a full model call — so
 * the audit covers a fixed number of runs on its own contract
 * (`lib/proposal-quota.ts`), and there is no letter at all on a contract whose
 * audit never completed and so never paid for one.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit("proposal", user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Хэт олон хүсэлт. Хэсэг хүлээгээд дахин оролдоно уу." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // 404 (not 403) when it belongs to someone else — don't leak existence.
    if (error || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: "Гэрээ олдсонгүй" }, { status: 404 });
    }

    const contractRow = contract as Contract;
    const summary = contractRow.audit_summary;

    // The audit is what pays for the letter, so there has to be one. A row
    // still processing, or failed and refunded, has bought nothing yet.
    if (contractRow.status !== "completed" || !summary) {
      return NextResponse.json(
        { error: "Эхлээд гэрээний шинжилгээ дуусах шаардлагатай." },
        { status: 409 },
      );
    }

    const usedBefore = proposalRunsUsed(summary);
    if (proposalRunsLeft(summary) === 0) {
      return NextResponse.json(
        {
          error: `Энэ шинжилгээнд багтсан ${PROPOSAL_RUNS_PER_AUDIT} захидлыг ашиглаж дууссан байна. Сүүлд үүсгэсэн захидал хэвээр хадгалагдаж байгаа тул хуулж авах боломжтой.`,
          runsLeft: 0,
        },
        { status: 403 },
      );
    }

    // Spend the run before the model call, not after: two taps that both read
    // the same balance would otherwise both bill. `updated_at` is stamped by a
    // trigger on every write (migration 014), so matching the value we just
    // read is a compare-and-swap — whoever writes first owns the run, and the
    // loser is told a letter is already being written rather than starting a
    // second one.
    const reserved: AuditSummary = { ...summary, proposalRuns: usedBefore + 1 };
    const { data: claimed, error: claimError } = await supabase
      .from("contracts")
      .update({
        audit_summary: reserved,
        // Stamped by hand as well as by the trigger, so the swap below still
        // moves the row on a database that has not run migration 014.
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("updated_at", contractRow.updated_at)
      .select("id");

    if (claimError) {
      return NextResponse.json(
        { error: `Захидал үүсгэж чадсангүй: ${claimError.message}` },
        { status: 500 },
      );
    }
    if (!claimed || claimed.length === 0) {
      return NextResponse.json(
        { error: "Захидал үүсгэж байна. Дуусахыг хүлээнэ үү." },
        { status: 409 },
      );
    }

    let proposal: string;
    try {
      proposal = await generateCorrectionProposal(contractRow);
    } catch (generateError) {
      // Nothing was generated, so the run was not used. Hand it back — the
      // same bargain the audit route makes with credits.
      const { error: releaseError } = await supabase
        .from("contracts")
        .update({ audit_summary: { ...summary, proposalRuns: usedBefore } })
        .eq("id", id);
      if (releaseError) {
        console.error("proposal run release failed:", releaseError.message);
      }
      throw generateError;
    }

    // Persist into the audit_summary JSON so the letter survives navigation.
    // Fail soft — the user still gets the letter even if the save fails. The
    // run stays spent either way: the model call happened.
    const { error: saveError } = await supabase
      .from("contracts")
      .update({ audit_summary: { ...reserved, proposal } })
      .eq("id", id);
    if (saveError) {
      console.error("proposal save failed:", saveError.message);
    }

    return NextResponse.json({
      proposal,
      runsLeft: proposalRunsLeft(reserved),
    });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
