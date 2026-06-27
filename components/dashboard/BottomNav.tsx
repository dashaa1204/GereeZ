"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, Home, Settings } from "lucide-react";

const navItems = [
  { label: "Нүүр", icon: Home, href: "/" },
  { label: "Гэрээ", icon: FileText, href: "/contracts" },
  { label: "Анхааруулга", icon: Bell, href: "/alerts" },
  { label: "Тохиргоо", icon: Settings, href: "/settings/legal" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                active ? "text-navy" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
