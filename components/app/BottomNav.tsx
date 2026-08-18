"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, Home, Settings } from "lucide-react";

const tabItems = [
  { href: "/", icon: Home, label: "Нүүр" },
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
          // Active only on the exact tab route — audit (/contracts/[id]) and
          // payment are sub-screens with no active tab, like the original design.
          const active = pathname === t.href;
          const Icon = t.icon;
          const badge = t.href === "/alerts" ? unreadCount : 0;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
            >
              <span className={`transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className={`text-xs font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                {t.label}
              </span>
              {badge > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 size-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
