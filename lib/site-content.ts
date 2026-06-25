import { createAdminClient } from "@/lib/supabase-server";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content-defaults";
import type { SiteContent, SiteContentSlug } from "@/lib/types/site-content";
import { SITE_CONTENT_SLUGS } from "@/lib/types/site-content";

function fallbackContent(slug: SiteContentSlug): SiteContent {
  const defaults = DEFAULT_SITE_CONTENT[slug];
  return {
    slug,
    title: defaults.title,
    content: defaults.content,
    updated_at: new Date(0).toISOString(),
  };
}

export function isValidSiteContentSlug(slug: string): slug is SiteContentSlug {
  return SITE_CONTENT_SLUGS.includes(slug as SiteContentSlug);
}

export async function getSiteContent(
  slug: SiteContentSlug,
): Promise<SiteContent> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("slug, title, content, updated_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return fallbackContent(slug);
    }

    return data as SiteContent;
  } catch {
    return fallbackContent(slug);
  }
}

export async function getAllSiteContent(): Promise<SiteContent[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_content")
      .select("slug, title, content, updated_at")
      .order("slug");

    if (error || !data?.length) {
      return SITE_CONTENT_SLUGS.map(fallbackContent);
    }

    const bySlug = new Map(
      (data as SiteContent[]).map((row) => [row.slug, row]),
    );

    return SITE_CONTENT_SLUGS.map(
      (slug) => bySlug.get(slug) ?? fallbackContent(slug),
    );
  } catch {
    return SITE_CONTENT_SLUGS.map(fallbackContent);
  }
}

export async function updateSiteContent(
  slug: SiteContentSlug,
  input: { title?: string; content: string },
): Promise<SiteContent> {
  const defaults = DEFAULT_SITE_CONTENT[slug];
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("site_content")
    .upsert(
      {
        slug,
        title: input.title?.trim() || defaults.title,
        content: input.content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("slug, title, content, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Агуулга хадгалахад алдаа гарлаа");
  }

  return data as SiteContent;
}
