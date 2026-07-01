"use client";

import {
  Bell,
  ChevronDown,
  FileText,
  Info,
  Moon,
  ShieldCheck,
  Sun,
  XCircle,
} from "lucide-react";
import { useTheme } from "../theme";

export function SettingsScreen({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string | null;
}) {
  const { dark, toggle } = useTheme();
  const displayName = userName ?? "Батболд Дорж";

  return (
    <div className="space-y-5">
      {/* profile */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 uppercase">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground capitalize">{displayName}</p>
          <p className="text-sm text-muted-foreground truncate">
            {userEmail ?? "batbold@example.mn"}
          </p>
          <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
            Стандарт хэрэглэгч
          </span>
        </div>
      </div>

      {/* settings rows */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* dark mode toggle */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Харанхуй горим</span>
          </div>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full border border-border bg-background shadow-sm transition-transform ${dark ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {[
          { icon: <Bell className="size-4" />, label: "Мэдэгдэл тохиргоо" },
          { icon: <ShieldCheck className="size-4" />, label: "Нууцлал" },
          { icon: <FileText className="size-4" />, label: "Ашиглалтын нөхцөл" },
          { icon: <Info className="size-4" />, label: "Тусламж / Холбоо барих" },
        ].map((row, i, arr) => (
          <button
            key={i}
            className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              {row.icon}
              <span className="text-sm font-medium text-foreground">{row.label}</span>
            </div>
            <ChevronDown className="-rotate-90 w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors">
          <XCircle className="size-4" />
          <span className="text-sm font-medium">Гарах</span>
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">
        GereeZ v1.0.0 · Монгол хуулийн нийцлийн систем
      </p>
    </div>
  );
}
