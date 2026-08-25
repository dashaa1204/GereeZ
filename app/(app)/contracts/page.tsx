import type { Metadata } from "next";
import { ContractsScreen } from "@/components/app/screens/ContractsScreen";
import { parseFilter } from "@/lib/contract-filters";
import { loadAppData } from "@/lib/view-models";

export const metadata: Metadata = { title: "Гэрээнүүд" };

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [data, params] = await Promise.all([loadAppData(), searchParams]);
  return (
    <ContractsScreen
      contracts={data.contracts}
      credits={data.credits}
      filter={parseFilter(params.filter)}
    />
  );
}
