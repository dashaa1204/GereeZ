"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Plus } from "lucide-react";
import type { AlertVM } from "@/lib/notifications";
import { BrandMark } from "./BrandMark";
import { NotificationMenu } from "./NotificationMenu";
import { ProfileMenu } from "./ProfileMenu";
import { DASHBOARD_PATH } from "@/lib/routes";

/**
 * Desktop-only header, from `lg` up: the brand and the contracts tab on the
 * left; the credit balance, the alerts dropdown and the account dropdown on
 * the right. Contracts and credits are the two things worth a permanent spot —
 * where the work is, and what it costs — while the rest of the app stays
 * folded into the account menu so the bar reads as a thin frame rather than a
 * second layer of navigation.
 *
 * Below `lg` this is hidden and BottomNav's tab bar takes over, since a phone
 * has no room for a dropdown to be the primary way around.
 */
export function TopNav({
  alerts = [],
  credits = 0,
  userName = null,
  userEmail = null,
}: {
  alerts?: AlertVM[];
  credits?: number;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  // `/contracts/[id]` is the audit for a contract, so it keeps the tab lit.
  const contractsActive =
    pathname === "/contracts" || pathname.startsWith("/contracts/");

  return (
    <header className="border-border bg-background/85 sticky top-0 z-40 hidden border-b backdrop-blur-lg lg:block">
      <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-6 px-10">
        <Link href={DASHBOARD_PATH} className="flex shrink-0 items-center gap-2.5">
          <BrandMark className="text-foreground size-8" />
          <span className="text-foreground text-lg font-bold tracking-tight">
            GereeZ
          </span>
        </Link>

        <nav className="flex items-center">
          <Link
            href="/contracts"
            aria-current={contractsActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              contractsActive
                ? "bg-brand/12 text-brand font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
            }`}
          >
            <FileText className="size-4 shrink-0" />
            Гэрээнүүд
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* The balance doubles as the top-up entry point, so it is one
              control rather than a read-only figure plus a button. */}
          <Link
            href="/payment"
            className="border-border text-foreground hover:bg-muted flex items-center gap-2 rounded-lg border py-1 pr-1 pl-3 text-sm font-semibold transition-colors"
          >
            <span className="tabular-nums">
              {credits}{" "}
              <span className="text-muted-foreground font-medium">кредит</span>
            </span>
            <span className="bg-brand/12 text-brand flex size-7 items-center justify-center rounded-md">
              <Plus className="size-3.5" />
            </span>
          </Link>

          <NotificationMenu alerts={alerts} />
          <ProfileMenu
            userName={userName}
            userEmail={userEmail}
            credits={credits}
          />
        </div>
      </div>
    </header>
  );
}
