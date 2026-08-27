import { NextResponse } from "next/server";
import {
  detectContractMediaType,
  getPdfPageCount,
} from "@/lib/audit";
import { formatUserError } from "@/lib/api-errors";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { auditCost, getBalance } from "@/lib/credits";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Price a contract before auditing it: count its pages, compute the credit cost,
 * and report the user's balance so the client can show a confirm/pay gate. This
 * is cheap (no OCR, no AI) — only PDF page counting or a single image page.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit("quote", user.id);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await request.json();
    const contractId = body?.contractId as string | undefined;
    if (!contractId) {
      return NextResponse.json(
        { error: "contractId шаардлагатай" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: contract, error: fetchError } = await supabase
      .from("contracts")
      .select("id, user_id, storage_path")
      .eq("id", contractId)
      .single();

    // 404 (not 403) when it belongs to someone else — don't leak existence.
    if (fetchError || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: "Гэрээ олдсонгүй" }, { status: 404 });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .download(contract.storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Файл татахад алдаа: ${downloadError?.message}` },
        { status: 500 },
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mediaType = detectContractMediaType(buffer);
    const pageCount =
      mediaType === "application/pdf" ? await getPdfPageCount(buffer) : 1;

    // Cache the count so the audit step and any later display reuse it.
    await supabase
      .from("contracts")
      .update({ page_count: pageCount })
      .eq("id", contractId);

    const balance = await getBalance(user.id);
    const cost = auditCost(pageCount);

    return NextResponse.json({
      pageCount,
      cost,
      balance,
      sufficient: balance >= cost,
    });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
