"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";

const links = [
  { href: "#how", label: "Хэрхэн ажилладаг" },
  { href: "#features", label: "Боломжууд" },
  { href: "#pricing", label: "Үнэ" },
  { href: "#faq", label: "Асуулт" },
] as const;

/**
 * Landing header. It starts transparent so it sits inside the dark hero, and
 * turns into a solid bar once the hero has scrolled past — the links are white
 * over the hero and foreground-colored over the page below, so the two states
 * carry different text colors rather than just a different background.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // The bar is see-through only while it floats over the hero with nothing
  // attached to it: an open mobile sheet needs the solid treatment too, or its
  // foreground-colored logo and links sit on the dark hero instead of the bar.
  const solid = scrolled || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The mobile sheet covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        solid
          ? "border-b border-border bg-background/85 backdrop-blur-lg"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 lg:h-18 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandMark
            className={`size-8 transition-colors ${solid ? "text-foreground" : "text-white"}`}
          />
          <span
            className={`text-lg font-bold tracking-tight transition-colors ${
              solid ? "text-foreground" : "text-white"
            }`}
          >
            GereeZ
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                solid
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              solid
                ? "text-foreground hover:bg-muted"
                : "text-white/85 hover:bg-white/10 hover:text-white"
            }`}
          >
            Нэвтрэх
          </Link>
          <Link
            href="/demo"
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors ${
              solid
                ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                : "bg-white text-zinc-900 hover:bg-white/90"
            }`}
          >
            Үнэгүй турших
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Цэсийг хаах" : "Цэс нээх"}
          aria-expanded={open}
          className={`-mr-1.5 rounded-lg p-2 transition-colors md:hidden ${
            solid
              ? "text-foreground hover:bg-muted"
              : "text-white hover:bg-white/10"
          }`}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-5 pt-3 pb-6 md:hidden">
          <nav className="flex flex-col">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/demo"
              className="rounded-lg bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white dark:bg-white dark:text-zinc-900"
            >
              Үнэгүй туршиж үзэх
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-border px-4 py-3 text-center text-sm font-medium text-foreground"
            >
              Нэвтрэх
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
