import { FigmaApp } from "@/components/figma/FigmaApp";
import { loadFigmaData } from "@/lib/figma-data";

export default async function AlertsPage() {
  const data = await loadFigmaData();
  return <FigmaApp initialTab="alerts" data={data} />;
}
