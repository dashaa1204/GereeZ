import { PaymentScreen } from "@/components/app/screens/PaymentScreen";
import { loadAppData } from "@/lib/view-models";

export default async function PaymentPage() {
  const data = await loadAppData();
  return <PaymentScreen credits={data.credits} />;
}
