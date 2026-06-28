import { FigmaApp } from "@/components/figma/FigmaApp";
import { loadFigmaData } from "@/lib/figma-data";

export default async function ContractsPage() {
  const data = await loadFigmaData();
  return <FigmaApp initialTab="contracts" data={data} />;
}
