import type { Metadata } from "next";
import { SettingsScreen } from "@/components/app/screens/SettingsScreen";
import { isDemoEmail } from "@/lib/demo-user";
import { loadAppData } from "@/lib/view-models";

export const metadata: Metadata = { title: "Тохиргоо" };

export default async function SettingsPage() {
  const data = await loadAppData();
  return (
    <SettingsScreen
      userName={data.userName}
      userEmail={data.userEmail}
      // The demo account is shared, so its profile isn't any one visitor's to
      // edit. Decided here because DEMO_USER_EMAIL is server-only.
      canEditProfile={!isDemoEmail(data.userEmail)}
    />
  );
}
