"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  FileText,
  Home,
  Moon,
  Plus,
  Settings,
  Sun,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useTheme } from "./theme";

const navItems = [
  { href: "/", icon: Home, label: "Нүүр" },
  { href: "/contracts", icon: FileText, label: "Гэрээнүүд" },
  { href: "/alerts", icon: Bell, label: "Мэдэгдэл" },
  { href: "/settings", icon: Settings, label: "Тохиргоо" },
] as const;

/**
 * Desktop-only navigation rail. It replaces the phone's bottom tab bar from
 * `lg` up, so the tabs, the theme toggle and the credit balance all live in one
 * persistent column instead of competing for the narrow mobile chrome. Unlike
 * BottomNav, sub-routes keep their parent tab lit (`/contracts/[id]` → Гэрээ),
 * which is what a sidebar is expected to do.
 */
export function SideNav({
  unreadCount = 0,
  credits = 0,
}: {
  unreadCount?: number;
  credits?: number;
}) {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <BrandMark className="size-8 text-foreground" />
        <span className="text-lg font-bold tracking-tight text-foreground">GereeZ</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          const badge = item.href === "/alerts" ? unreadCount : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
              {badge > 0 && (
                <span
                  className={`ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 p-3">
        <div className="rounded-xl border border-border bg-background p-3.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="size-3.5" />
            <span className="text-xs">Кредит үлдэгдэл</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{credits}</p>
          <Link
            href="/payment"
            className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-primary/8 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/12"
          >
            <Plus className="size-3.5" />
            Кредит нэмэх
          </Link>
        </div>

        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          {dark ? "Харанхуй горим" : "Гэрэлтэй горим"}
        </button>
      </div>
    </aside>
  );
}
