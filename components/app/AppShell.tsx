import { StatusBar } from "./StatusBar";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";

/**
 * Shared chrome for every app route. Below `lg` this is the phone frame the app
 * was designed as: sticky status bar, 420px column, bottom tab nav. From `lg`
 * up the tabs move into a fixed left rail (SideNav) and the content column
 * widens to a desktop container — the route pages opt into multi-column layouts
 * themselves with their own `lg:` classes. Dark mode is read from the `.dark`
 * class on <html> (see ./theme), so no provider is needed here.
 */
export function AppShell({
  children,
  unreadCount = 0,
  credits = 0,
}: {
  children: React.ReactNode;
  unreadCount?: number;
  credits?: number;
}) {
  return (
    <div className="bg-background min-h-screen">
      <SideNav unreadCount={unreadCount} credits={credits} />
      <div className="mx-auto w-full max-w-[420px] min-h-screen flex flex-col relative md:max-w-[600px] lg:mx-0 lg:max-w-none lg:pl-64">
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
