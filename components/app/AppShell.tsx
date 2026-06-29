import { StatusBar } from "./StatusBar";
import { BottomNav } from "./BottomNav";

/**
 * Shared chrome for every app route: the phone frame, sticky status bar and
 * bottom tab nav. The route pages render as `children` inside the scrollable
 * content area. Dark mode is read from the `.dark` class on <html> (see
 * ./theme), so no provider is needed here.
 */
export function AppShell({
  children,
  unreadCount = 0,
}: {
  children: React.ReactNode;
  unreadCount?: number;
}) {
  return (
    <div className="bg-background min-h-screen flex items-start justify-center">
      <div className="w-full max-w-[420px] min-h-screen flex flex-col relative">
        <StatusBar />
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-28">{children}</div>
        <BottomNav unreadCount={unreadCount} />
      </div>
    </div>
  );
}
