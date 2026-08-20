import type { AlertVM } from "@/lib/notifications";
import { StatusBar } from "./StatusBar";
import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

/**
 * Shared chrome for every app route. Below `lg` this is the phone frame the app
 * was designed as: sticky status bar, 420px column, bottom tab nav. From `lg`
 * up the tabs move into a full-width header (TopNav) and the content column
 * widens to a desktop container — the route pages opt into multi-column layouts
 * themselves with their own `lg:` classes. Dark mode is read from the `.dark`
 * class on <html> (see ./theme), so no provider is needed here.
 */
export function AppShell({
  children,
  unreadCount = 0,
  alerts = [],
  credits = 0,
  userName = null,
  userEmail = null,
}: {
  children: React.ReactNode;
  unreadCount?: number;
  alerts?: AlertVM[];
  credits?: number;
  userName?: string | null;
  userEmail?: string | null;
}) {
  return (
    <div className="bg-background min-h-screen">
      <TopNav
        alerts={alerts}
        credits={credits}
        userName={userName}
        userEmail={userEmail}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col md:max-w-[600px] lg:max-w-none">
        <StatusBar />
        {/* same container as StatusBar's, so the heading and the content below
            it line up at every width */}
        <div className="flex-1 py-5 pb-28 lg:py-8 lg:pb-14">
          <div className="mx-auto w-full max-w-[1180px] px-4 lg:px-10">{children}</div>
        </div>
        <BottomNav unreadCount={unreadCount} />
      </div>
    </div>
  );
}
