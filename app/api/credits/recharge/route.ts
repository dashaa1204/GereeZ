import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { RECHARGE_AMOUNT, rechargeCredits } from "@/lib/credits";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Demo-only top-up: add a fixed amount of credits for free. There is no real
 * payment provider — this stands in for a purchase flow. Rate-limited so it
 * can't be hammered.
 */
export async function POST() {
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

    const balance = await rechargeCredits(user.id, RECHARGE_AMOUNT);
    return NextResponse.json({ balance, added: RECHARGE_AMOUNT });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
