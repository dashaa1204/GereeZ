"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, Home, Settings } from "lucide-react";
import { DASHBOARD_PATH } from "@/lib/routes";

const tabItems = [
  { href: DASHBOARD_PATH, icon: Home, label: "Нүүр" },
  { href: "/contracts", icon: FileText, label: "Гэрээ" },
  { href: "/alerts", icon: Bell, label: "Мэдэгдэл" },
  { href: "/settings", icon: Settings, label: "Тохиргоо" },
] as const;

export function BottomNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] md:max-w-[600px] bg-card/95 backdrop-blur-md border-t border-border z-30 lg:hidden">
      <div className="flex">
        {tabItems.map((t) => {
          // A sub-screen keeps its parent tab lit — the audit at
          // /contracts/[id] is still "Гэрээ" — so the bar always answers
          // "where am I?" instead of going blank one level in. Matches how
          // TopNav lights the contracts tab on desktop.
          const active =
            pathname === t.href ||
            (t.href !== DASHBOARD_PATH && pathname.startsWith(`${t.href}/`));
          const Icon = t.icon;
          const badge = t.href === "/alerts" ? unreadCount : 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
            >
              <span className={`transition-colors ${active ? "text-brand" : "text-muted-foreground"}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className={`text-xs transition-colors ${active ? "text-brand font-semibold" : "text-muted-foreground font-medium"}`}>
                {t.label}
              </span>
              {/* `text-destructive-foreground` was a dead class — nothing
                  defines that token, so the count inherited the nav's ink and
                  sat at 4.11:1 on red. The filled-surface red carries white at
                  6.6:1 and, unlike the signal red, does not lift in dark mode
                  into the band where no foreground passes. */}
              {badge > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 size-4 bg-[var(--risk-high-surface)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
