import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { getLegalArticle } from "@/lib/legal-articles";
import { getAuthenticatedUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Return the stored statute text for a cited article so the audit UI can show
 * the actual law behind a finding. `{ article: null }` when nothing matches —
 * a valid outcome, not an error.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const law = searchParams.get("law")?.trim();
    const article = searchParams.get("article")?.trim();
    if (!law || !article) {
      return NextResponse.json(
        { error: "law болон article шаардлагатай" },
        { status: 400 },
      );
    }

    const found = await getLegalArticle(law, article);
    return NextResponse.json({ article: found });
  } catch (error) {
    return NextResponse.json({ error: formatUserError(error) }, { status: 500 });
  }
}
