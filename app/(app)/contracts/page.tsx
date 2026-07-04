import type { Metadata } from "next";
import { ContractsScreen } from "@/components/app/screens/ContractsScreen";
import { loadAppData } from "@/lib/view-models";

export const metadata: Metadata = { title: "Гэрээнүүд" };

export default async function ContractsPage() {
  const data = await loadAppData();
  return <ContractsScreen contracts={data.contracts} credits={data.credits} />;
}
