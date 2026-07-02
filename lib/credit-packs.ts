/**
 * Purchasable credit packs shown on the payment screen. Shared between the
 * client (pack list UI) and the recharge API route (server-side validation of
 * the requested pack) — keep this file free of server-only imports.
 *
 * Prices are display-only for now: there is no real payment provider, so a
 * "purchase" is a free demo top-up of the pack's credits.
 */
export interface CreditPack {
  credits: number;
  /** Display price in MNT. Not charged — demo only. */
  price: number;
  label: string;
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  { credits: 5, price: 5000, label: "Үндсэн" },
  { credits: 15, price: 12000, label: "Хэмнэлттэй", popular: true },
  { credits: 30, price: 20000, label: "Байнгын хэрэглэгч" },
];

/** The pack with the given credit amount, or null when no such pack exists. */
export function findCreditPack(credits: number): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.credits === credits) ?? null;
}
