import { AppShell } from "@/components/app/AppShell";
import { loadAppData } from "@/lib/view-models";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await loadAppData();
  const unreadCount = data.alerts.filter((a) => !a.read).length;
  return <AppShell unreadCount={unreadCount}>{children}</AppShell>;
}
