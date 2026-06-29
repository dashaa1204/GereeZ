import { ContractsScreen } from "@/components/app/screens/ContractsScreen";
import { DUMMY_VMS } from "@/components/app/dummy";
import { loadFigmaData } from "@/lib/figma-data";

export default async function ContractsPage() {
  const data = await loadFigmaData();
  const contracts = data.contracts.length > 0 ? data.contracts : DUMMY_VMS;
  return <ContractsScreen contracts={contracts} credits={data.credits} />;
}
