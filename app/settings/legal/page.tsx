"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_CONTENT_LABELS } from "@/lib/site-content-defaults";
import {
  fetchAllSiteContent,
  updateSiteContentClient,
} from "@/lib/services/site-content.client";
import type { SiteContent, SiteContentSlug } from "@/lib/types";
import { SITE_CONTENT_SLUGS } from "@/lib/types";

const ADMIN_SECRET_KEY = "gereez-admin-secret";

export default function LegalSettingsPage() {
  const [items, setItems] = useState<SiteContent[]>([]);
  const [activeSlug, setActiveSlug] = useState<SiteContentSlug>("disclaimer");
  const [adminSecret, setAdminSecret] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Applies the editable fields from the matching item. Called from events
  // (initial load, tab switch) rather than an effect to avoid setState-in-effect
  // cascades.
  function applyActiveItem(source: SiteContent[], slug: SiteContentSlug) {
    const active = source.find((item) => item.slug === slug);
    if (active) {
      setTitle(active.title);
      setContent(active.content);
      setSaved(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAllSiteContent();
        if (cancelled) return;
        setItems(data);
        applyActiveItem(data, activeSlug);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ачаалахад алдаа");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
      const stored = sessionStorage.getItem(ADMIN_SECRET_KEY);
      if (stored && !cancelled) setAdminSecret(stored);
    })();
    return () => {
      cancelled = true;
    };
    // Mount-only load; activeSlug is its initial default here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectSlug(slug: SiteContentSlug) {
    setActiveSlug(slug);
    applyActiveItem(items, slug);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      sessionStorage.setItem(ADMIN_SECRET_KEY, adminSecret);
      const updated = await updateSiteContentClient(
        activeSlug,
        { title, content },
        adminSecret,
      );
      setItems((prev) =>
        prev.map((item) => (item.slug === updated.slug ? updated : item)),
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалахад алдаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-8">
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-3xl">
          <Link
            href="/"
            className="flex size-8 items-center justify-center rounded-lg text-navy hover:bg-muted"
            aria-label="Буцах"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-navy">Хуулийн текст</h1>
            <p className="text-[11px] text-muted-foreground">
              Анхааруулга, нууцлал, үйлчилгээний нөхцөл
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-5 lg:max-w-3xl lg:px-8 lg:py-8">
        <section className="rounded-lg border border-border bg-white p-4">
          <label className="text-xs font-medium text-foreground">
            Админ нууц (LEGAL_INGEST_SECRET)
          </label>
          <input
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder="Хадгалахын тулд нууц оруулна уу"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Dev орчинд нууцгүйгээр хадгалах боломжтой. Production дээр
            .env.local дахь LEGAL_INGEST_SECRET шаардлагатай.
          </p>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {SITE_CONTENT_SLUGS.map((slug) => (
            <button
              key={slug}
              type="button"
              onClick={() => handleSelectSlug(slug)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSlug === slug
                  ? "bg-navy text-white"
                  : "border border-border bg-white text-muted-foreground"
              }`}
            >
              {SITE_CONTENT_LABELS[slug]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Ачаалж байна…
          </div>
        ) : (
          <section className="space-y-3 rounded-lg border border-border bg-white p-4">
            <div>
              <label className="text-xs font-medium">Гарчиг</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Агуулга</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed"
              />
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                Догол мөрөөр заагласан догол мөр = шинэ догол мөр. • тэмдэгтээр
                жагсаалт үүснэ.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !content.trim()}
                className="gap-2 bg-navy text-white hover:bg-navy/90"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Хадгалах
              </Button>

              <Link
                href={`/legal/${activeSlug}`}
                className="text-xs font-medium text-navy underline-offset-2 hover:underline"
              >
                Урьдчилан харах
              </Link>
            </div>

            {saved && (
              <p className="text-xs text-success">Амжилттай хадгалагдлаа.</p>
            )}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
