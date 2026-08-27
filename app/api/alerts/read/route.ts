import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { markAlertsRead } from "@/lib/alerts";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_IDS_PER_REQUEST = 200;
const MAX_ID_LENGTH = 100;

/** Mark the given alert ids as read for the signed-in user. */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    // The per-request caps below bound one call; this bounds the sequence of
    // them. Every other authenticated write has a ceiling, and this one writes
    // rows that nothing ages out.
    const rateLimit = await checkRateLimit("alerts", user.id);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await request.json().catch(() => null);
    const rawIds = body?.ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return NextResponse.json({ error: "ids шаардлагатай" }, { status: 400 });
    }

    // Ids are opaque strings we generated; still bound their size and count so
    // a hostile client can't stuff the table with junk rows.
    const ids = rawIds
      .filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && id.length <= MAX_ID_LENGTH,
      )
      .slice(0, MAX_IDS_PER_REQUEST);

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids буруу байна" }, { status: 400 });
    }

    await markAlertsRead(user.id, ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
