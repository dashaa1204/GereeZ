import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { isDemoEmail } from "@/lib/demo-user";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  CONTRACTS_BUCKET,
  createAdminClient,
  getAuthenticatedUser,
} from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Permanently delete the signed-in user's account. DB rows (contracts,
 * credits, charges, alert reads) cascade from the auth.users row; storage
 * objects don't cascade, so they're removed first. Irreversible.
 */
export async function DELETE() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    // The demo account is shared by every visitor — one of them deleting it
    // would take the public demo down with it.
    if (isDemoEmail(user.email)) {
      return NextResponse.json(
        { error: "Демо бүртгэлийг устгах боломжгүй. Өөрийн бүртгэл үүсгэнэ үү." },
        { status: 403 },
      );
    }

    const rateLimit = await checkRateLimit("delete-account", user.id);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const supabase = createAdminClient();

    const { data: contracts, error: listError } = await supabase
      .from("contracts")
      .select("storage_path")
      .eq("user_id", user.id);
    if (listError) {
      return NextResponse.json(
        { error: `Гэрээ уншихад алдаа: ${listError.message}` },
        { status: 500 },
      );
    }

    const paths = (contracts ?? [])
      .map((c) => c.storage_path as string)
      .filter(Boolean);
    if (paths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(CONTRACTS_BUCKET)
        .remove(paths);
      // A failed file cleanup shouldn't strand a half-deleted account — the
      // bucket is private and the rows are about to cascade away. Log and go on.
      if (removeError) {
        console.error("account delete: storage cleanup failed:", removeError.message);
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json(
        { error: `Бүртгэл устгахад алдаа: ${deleteError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
