import { FigmaApp } from "@/components/figma/FigmaApp";
import { loadFigmaData } from "@/lib/figma-data";

export default async function Home() {
  const data = await loadFigmaData();
  return <FigmaApp initialTab="home" data={data} />;
}
