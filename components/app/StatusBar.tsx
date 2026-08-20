"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useTheme } from "./theme";

/** Title + back-button visibility for the current route (sub-screens —
 *  audit/payment — show a back chevron). `desktop` overrides the title from
 *  `lg` up, where the header already carries the brand. */
function chromeFor(pathname: string): { title: string; desktop?: string; back: boolean } {
  if (pathname === "/contracts") return { title: "Гэрээнүүд", back: false };
  if (/^\/contracts\/.+/.test(pathname)) return { title: "Аудит дүн", back: true };
  if (pathname === "/alerts") return { title: "Мэдэгдэл", back: false };
  if (pathname === "/payment") return { title: "Кредит", back: true };
  if (pathname === "/settings") return { title: "Тохиргоо", back: false };
  return { title: "GereeZ", desktop: "Нүүр", back: false };
}

/**
 * The phone's status bar below `lg`. From `lg` up TopNav is the sticky bar, so
 * this stops sticking and drops its divider — what is left is the plain page
 * heading for the current route.
 */
export function StatusBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle } = useTheme();
  const { title, desktop, back } = chromeFor(pathname);

  return (
    <div className="bg-background/95 backdrop-blur-md sticky top-0 z-30 lg:static lg:z-auto lg:bg-transparent lg:backdrop-blur-none">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 pt-4 pb-3 border-b border-border lg:border-0 lg:px-10 lg:pt-8 lg:pb-0">
        <div className="flex items-center gap-2">
          {back ? (
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center mr-1 hover:bg-muted/70 transition-colors"
            >
              <ChevronDown className="w-4 h-4 rotate-90 text-foreground" />
            </button>
          ) : null}
          <div className="flex items-center gap-2">
            {/* the header carries the brand from lg up */}
            <BrandMark className="w-7 h-7 text-foreground lg:hidden" />
            <h1 className="text-base font-bold tracking-tight text-foreground lg:text-2xl">
              <span className={desktop ? "lg:hidden" : undefined}>{title}</span>
              {desktop && <span className="hidden lg:inline">{desktop}</span>}
            </h1>
          </div>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors lg:hidden"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
