import { SettingsScreen } from "@/components/app/screens/SettingsScreen";
import { loadFigmaData } from "@/lib/figma-data";

export default async function SettingsPage() {
  const data = await loadFigmaData();
  return <SettingsScreen userName={data.userName} userEmail={data.userEmail} />;
}
