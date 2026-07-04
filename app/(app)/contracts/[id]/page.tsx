import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditScreen } from "@/components/app/screens/AuditScreen";
import { loadAppData } from "@/lib/view-models";

export const metadata: Metadata = { title: "Гэрээний шинжилгээ" };

export default async function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadAppData();
  const contract = data.contracts.find((c) => c.id === id);
  if (!contract) notFound();
  return <AuditScreen contract={contract} />;
}
