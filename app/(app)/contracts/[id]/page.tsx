import { notFound } from "next/navigation";
import { AuditScreen } from "@/components/app/screens/AuditScreen";
import { DUMMY_VMS } from "@/components/app/dummy";
import { loadFigmaData } from "@/lib/figma-data";

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadFigmaData();
  const contracts = data.contracts.length > 0 ? data.contracts : DUMMY_VMS;
  const contract = contracts.find((c) => c.id === id);
  if (!contract) notFound();
  return <AuditScreen contract={contract} />;
}
