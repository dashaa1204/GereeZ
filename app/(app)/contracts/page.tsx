import { ContractsScreen } from "@/components/app/screens/ContractsScreen";
import { loadAppData } from "@/lib/view-models";

export default async function ContractsPage() {
  const data = await loadAppData();
  return <ContractsScreen contracts={data.contracts} credits={data.credits} />;
}
