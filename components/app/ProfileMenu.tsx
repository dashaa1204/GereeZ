"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  CreditCard,
  Home,
  Loader2,
  LogOut,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { DASHBOARD_PATH } from "@/lib/routes";
import { useTheme } from "./theme";
import { useDismissable } from "./useDismissable";

/** Screens the header has no tab for. Гэрээнүүд is a tab, so it is not here. */
const screenLinks = [
  { href: DASHBOARD_PATH, icon: Home, label: "Нүүр" },
] as const;

/**
 * The account control at the right end of TopNav: the avatar opens the identity
 * (name + email) together with what the header has no room for — the screens
 * without their own tab, the account rows, and sign-out. Those screen links
 * carry an active mark, since the header's tab row does not cover them.
 *
 * Sign-out mirrors SettingsScreen's: end the Supabase session, then replace to
 * /login so the signed-in page is not left in history. `/login` is a public
 * prefix in proxy-session, so nothing bounces the visitor back.
 */
export function ProfileMenu({
  userName,
  userEmail,
  credits = 0,
}: {
  userName: string | null;
  userEmail: string | null;
  /** Mirrors the header's balance pill, so the menu is a complete account view. */
  credits?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { dark, toggle } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const displayName = userName ?? "Хэрэглэгч";
  const initial = displayName.charAt(0);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, containerRef, close);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const rowClass =
    "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Цэс"
        className={`border-border flex items-center gap-1.5 rounded-lg border py-1 pr-1.5 pl-1 transition-colors ${
          open ? "bg-muted" : "hover:bg-muted"
        }`}
      >
        <span className="bg-panel text-panel-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold uppercase">
          {initial}
        </span>
        <ChevronDown
          className={`text-muted-foreground size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Цэс"
          className="border-border bg-card absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border shadow-lg"
        >
          <div className="border-border flex items-center gap-3 border-b px-4 py-3.5">
            <span className="bg-panel text-panel-foreground flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold uppercase">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="text-foreground truncate font-semibold capitalize">
                {displayName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {userEmail ?? "—"}
              </p>
            </div>
          </div>

          <div className="border-border border-b py-1">
            {screenLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`${rowClass} ${
                    active
                      ? "bg-brand/12 text-brand font-semibold"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className={active ? "size-4" : "text-muted-foreground size-4"} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="border-border border-b py-1">
            <Link
              href="/payment"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${rowClass} text-foreground hover:bg-muted`}
            >
              <CreditCard className="text-muted-foreground size-4" />
              Кредит
              <span className="text-muted-foreground ml-auto text-xs font-semibold tabular-nums">
                {credits}
              </span>
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`${rowClass} text-foreground hover:bg-muted`}
            >
              <Settings className="text-muted-foreground size-4" />
              Тохиргоо
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={toggle}
              className={`${rowClass} text-foreground hover:bg-muted`}
            >
              {dark ? (
                <Sun className="text-muted-foreground size-4" />
              ) : (
                <Moon className="text-muted-foreground size-4" />
              )}
              {dark ? "Гэрэлтэй горим" : "Харанхуй горим"}
            </button>
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className={`${rowClass} text-destructive hover:bg-destructive/5 disabled:opacity-50`}
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Гарах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
