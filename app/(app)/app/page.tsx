import { HomeScreen } from "@/components/app/screens/HomeScreen";
import { loadAppData } from "@/lib/view-models";

export default async function HomePage() {
  const data = await loadAppData();
  return (
    <HomeScreen
      credits={data.credits}
      userName={data.userName}
      activeCount={data.activeCount}
      averageCompliance={data.averageCompliance}
      expiringSoon={data.expiringSoon}
      recent={data.contracts[0]}
    />
  );
}
