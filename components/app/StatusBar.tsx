"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useTheme } from "./theme";

/** Title + back-button visibility for the current route, mirroring the figma
 *  status bar (sub-screens — audit/payment — show a back chevron). */
function chromeFor(pathname: string): { title: string; back: boolean } {
  if (pathname === "/contracts") return { title: "Гэрээнүүд", back: false };
  if (/^\/contracts\/.+/.test(pathname)) return { title: "Аудит дүн", back: true };
  if (pathname === "/alerts") return { title: "Мэдэгдэл", back: false };
  if (pathname === "/payment") return { title: "Кредит", back: true };
  if (pathname === "/settings") return { title: "Тохиргоо", back: false };
  return { title: "GereeZ", back: false };
}

export function StatusBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const { title, back } = chromeFor(pathname);

  return (
    <div className="bg-background sticky top-0 z-30">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          {back ? (
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center mr-1"
            >
              <ChevronDown className="w-4 h-4 rotate-90 text-foreground" />
            </button>
          ) : null}
          <div className="flex items-center gap-2">
            <BrandMark className="w-7 h-7 text-foreground" />
            <h1 className="text-base font-bold text-foreground">{title}</h1>
          </div>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
