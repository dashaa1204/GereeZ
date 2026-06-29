import { PaymentScreen } from "@/components/app/screens/PaymentScreen";
import { loadFigmaData } from "@/lib/figma-data";

export default async function PaymentPage() {
  const data = await loadFigmaData();
  return <PaymentScreen credits={data.credits} />;
}
