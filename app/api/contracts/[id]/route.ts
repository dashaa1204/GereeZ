import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Delete one of the signed-in user's contracts: the storage object first,
 * then the row (credit_charges cascades from the row). Credits already spent
 * on the audit are NOT refunded — the AI work was done.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const rateLimit = await checkRateLimit("upload", user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Хэт олон хүсэлт. Хэсэг хүлээгээд дахин оролдоно уу." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter) } },
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: contract, error: fetchError } = await supabase
      .from("contracts")
      .select("id, user_id, storage_path")
      .eq("id", id)
      .maybeSingle();

    // 404 (not 403) when it belongs to someone else — don't leak existence.
    if (fetchError || !contract || contract.user_id !== user.id) {
      return NextResponse.json({ error: "Гэрээ олдсонгүй" }, { status: 404 });
    }

    if (contract.storage_path) {
      const { error: removeError } = await supabase.storage
        .from(CONTRACTS_BUCKET)
        .remove([contract.storage_path]);
      // The row delete below is what the user sees; a stale private object is
      // only an internal leak. Log and continue.
      if (removeError) {
        console.error("contract delete: storage cleanup failed:", removeError.message);
      }
    }

    const { error: deleteError } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: `Гэрээ устгахад алдаа: ${deleteError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
