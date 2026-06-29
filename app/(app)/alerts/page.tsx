import { AlertsScreen } from "@/components/app/screens/AlertsScreen";
import { loadFigmaData } from "@/lib/figma-data";

export default async function AlertsPage() {
  const data = await loadFigmaData();
  return <AlertsScreen initialAlerts={data.alerts} />;
}
