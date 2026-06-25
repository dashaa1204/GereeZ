import Link from "next/link";
import { Bell, FileText, Home, Settings } from "lucide-react";

const navItems = [
  { label: "Нүүр", icon: Home, href: "/", active: true },
  { label: "Гэрээ", icon: FileText, href: "/", active: false },
  { label: "Анхааруулга", icon: Bell, href: "/", active: false },
  { label: "Тохиргоо", icon: Settings, href: "/settings/legal", active: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              item.active ? "text-navy" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-5" strokeWidth={item.active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
