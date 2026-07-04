import type { Metadata } from "next";
import { AlertsScreen } from "@/components/app/screens/AlertsScreen";
import { loadAppData } from "@/lib/view-models";

export const metadata: Metadata = { title: "Мэдэгдэл" };

export default async function AlertsPage() {
  const data = await loadAppData();
  return <AlertsScreen initialAlerts={data.alerts} />;
}
