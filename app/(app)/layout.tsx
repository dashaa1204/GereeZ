import { AppShell } from "@/components/app/AppShell";
import { loadFigmaData } from "@/lib/figma-data";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await loadFigmaData();
  const unreadCount = data.alerts.filter((a) => !a.read).length;
  return <AppShell unreadCount={unreadCount}>{children}</AppShell>;
}
