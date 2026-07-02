import { SettingsScreen } from "@/components/app/screens/SettingsScreen";
import { loadAppData } from "@/lib/view-models";

export default async function SettingsPage() {
  const data = await loadAppData();
  return <SettingsScreen userName={data.userName} userEmail={data.userEmail} />;
}
