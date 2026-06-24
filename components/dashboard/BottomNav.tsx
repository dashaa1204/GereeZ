import { Bell, FileText, Home, Settings } from "lucide-react";

const navItems = [
  { label: "Нүүр", icon: Home, active: true },
  { label: "Гэрээ", icon: FileText, active: false },
  { label: "Анхааруулга", icon: Bell, active: false },
  { label: "Тохиргоо", icon: Settings, active: false },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
              item.active ? "text-navy" : "text-muted-foreground"
            }`}
          >
            <item.icon className="size-5" strokeWidth={item.active ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
