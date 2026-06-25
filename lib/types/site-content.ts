export const SITE_CONTENT_SLUGS = [
  "disclaimer",
  "privacy_policy",
  "terms_of_service",
] as const;

export type SiteContentSlug = (typeof SITE_CONTENT_SLUGS)[number];

export type SiteContent = {
  slug: SiteContentSlug;
  title: string;
  content: string;
  updated_at: string;
};

export type SiteContentUpdate = {
  title?: string;
  content: string;
};
