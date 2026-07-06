import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { generateCorrectionProposal } from "@/lib/proposal";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient, getAuthenticatedUser } from "@/lib/supabase-server";
import type { Contract } from "@/lib/types/contract";

export const runtime = "nodejs";

/**
 * Generate a ready-to-send correction letter from a contract's audit findings.
 * The letter takes the weaker party's side and cites the exact law behind each
 * issue — the outcome a plain chatbot won't assemble for the user.
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
    const proposal = await generateCorrectionProposal(contractRow);

    // Persist into the audit_summary JSON so the letter survives navigation.
    // Fail soft — the user still gets the letter even if the save fails.
    if (contractRow.audit_summary) {
      const { error: saveError } = await supabase
        .from("contracts")
        .update({
          audit_summary: { ...contractRow.audit_summary, proposal },
        })
        .eq("id", id);
      if (saveError) {
        console.error("proposal save failed:", saveError.message);
      }
    }

    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
