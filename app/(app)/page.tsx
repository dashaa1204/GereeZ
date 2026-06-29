import { HomeScreen } from "@/components/app/screens/HomeScreen";
import { DUMMY_VMS } from "@/components/app/dummy";
import { loadFigmaData } from "@/lib/figma-data";

export default async function HomePage() {
  const data = await loadFigmaData();
  const contracts = data.contracts.length > 0 ? data.contracts : DUMMY_VMS;
  return (
    <HomeScreen
      credits={data.credits}
      userName={data.userName}
      activeCount={data.activeCount}
      averageCompliance={data.averageCompliance}
      expiringSoon={data.expiringSoon}
      recent={contracts[0]}
    />
  );
}
