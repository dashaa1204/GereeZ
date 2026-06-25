import type { SiteContent, SiteContentUpdate } from "@/lib/types";

export async function fetchAllSiteContent(): Promise<SiteContent[]> {
  const res = await fetch("/api/site-content");
  if (!res.ok) {
    throw new Error("Агуулга ачаалахад алдаа гарлаа");
  }
  const data = (await res.json()) as { items: SiteContent[] };
  return data.items;
}

export async function updateSiteContentClient(
  slug: SiteContent["slug"],
  input: SiteContentUpdate,
  adminSecret: string,
): Promise<SiteContent> {
  const res = await fetch("/api/site-content", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: JSON.stringify({ slug, ...input }),
  });

  const data = (await res.json()) as { item?: SiteContent; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "Хадгалахад алдаа гарлаа");
  }

  if (!data.item) {
    throw new Error("Хадгалахад алдаа гарлаа");
  }

  return data.item;
}
