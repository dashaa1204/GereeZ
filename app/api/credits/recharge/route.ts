import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { RECHARGE_AMOUNT, rechargeCredits } from "@/lib/credits";
import { findCreditPack } from "@/lib/credit-packs";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Demo-only top-up: add credits for free. There is no real payment provider —
 * this stands in for a purchase flow. With no body it adds the flat demo
 * amount; with `{ credits }` it must match a known pack from CREDIT_PACKS
 * (never trust an arbitrary client-supplied amount). Rate-limited so it
 * can't be hammered.
 */
export async function POST(request: Request) {
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

    // Body is optional (legacy no-body calls get the flat demo amount).
    let amount = RECHARGE_AMOUNT;
    const body = await request.json().catch(() => null);
    if (body?.credits != null) {
      const pack = findCreditPack(Number(body.credits));
      if (!pack) {
        return NextResponse.json(
          { error: "Ийм кредитийн багц байхгүй" },
          { status: 400 },
        );
      }
      amount = pack.credits;
    }

    const balance = await rechargeCredits(user.id, amount);
    return NextResponse.json({ balance, added: amount });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
