import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { getBalance } from "@/lib/credits";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** Return the authenticated user's current credit balance. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }
    const balance = await getBalance(user.id);
    return NextResponse.json({ balance });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
