import { NextResponse } from "next/server";
import { formatUserError } from "@/lib/api-errors";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getAllSiteContent, updateSiteContent, isValidSiteContentSlug } from "@/lib/site-content";
import type { SiteContentSlug } from "@/lib/types/site-content";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await getAllSiteContent();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      slug?: string;
      title?: string;
      content?: string;
    };

    if (!body.slug || !isValidSiteContentSlug(body.slug)) {
      return NextResponse.json(
        { error: "Буруу slug (disclaimer, privacy_policy, terms_of_service)" },
        { status: 400 },
      );
    }

    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json(
        { error: "Агуулга хоосон байж болохгүй" },
        { status: 400 },
      );
    }

    const item = await updateSiteContent(body.slug as SiteContentSlug, {
      title: body.title,
      content: body.content,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: formatUserError(error) },
      { status: 500 },
    );
  }
}
