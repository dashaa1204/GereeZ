import { HomeScreen } from "@/components/app/screens/HomeScreen";
import { loadAppData, type ContractVM } from "@/lib/view-models";

/**
 * The single contract the dashboard should point at.
 *
 * An average compliance score used to sit in this slot, and it described no
 * contract in the portfolio: 4, 48, 72 and 88 average to a mild "needs
 * attention" that hides the one document that is actually a problem. A mean
 * also moves for the wrong reason — adding a healthy contract raises it while
 * nothing improved.
 *
 * Expired contracts are excluded. Their risk is history, and the strip exists
 * to answer "what needs me now"; an expired agreement with a terrible score
 * would otherwise hold this slot forever.
 */
function worstContract(contracts: ContractVM[]): ContractVM | null {
  const scored = contracts.filter(
    (c) => c.score != null && !c.expired,
  );
  if (scored.length === 0) return null;
  return scored.reduce((worst, c) => (c.score! < worst.score! ? c : worst));
}

export default async function HomePage() {
  const data = await loadAppData();
  return (
    <HomeScreen
      credits={data.credits}
      userName={data.userName}
      activeCount={data.activeCount}
      worst={worstContract(data.contracts)}
      expiringSoon={data.expiringSoon}
      highRiskCount={data.highRiskCount}
      recent={data.contracts.slice(0, 3)}
    />
  );
}
