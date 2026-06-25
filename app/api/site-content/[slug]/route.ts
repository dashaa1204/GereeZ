import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { getSiteContent, isValidSiteContentSlug } from "@/lib/site-content";
import type { SiteContentSlug } from "@/lib/types/site-content";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!isValidSiteContentSlug(slug)) {
    return NextResponse.json({ error: "Олдсонгүй" }, { status: 404 });
  }

  try {
    const item = await getSiteContent(slug as SiteContentSlug);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}
