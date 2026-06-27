import type { Contract, ContractMetadata } from "@/lib/types/contract";

/** A contract within this many days of its end date counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

export type TrackStatus = "expired" | "expiring-soon" | "active" | "unknown";

/** Extracted facts for a contract, or null on pre-tracking audits. */
export function getMetadata(contract: Contract): ContractMetadata | null {
  return contract.audit_summary?.metadata ?? null;
}

/** End date, preferring the promoted column but falling back to the summary. */
export function getEndDate(contract: Contract): string | null {
  return contract.end_date ?? contract.audit_summary?.metadata?.endDate ?? null;
}

/** Start date, preferring the promoted column but falling back to the summary. */
export function getStartDate(contract: Contract): string | null {
  return (
    contract.start_date ?? contract.audit_summary?.metadata?.startDate ?? null
  );
}

/** True when the audit pulled out anything worth showing in the tracker. */
export function hasTrackingInfo(contract: Contract): boolean {
  const meta = getMetadata(contract);
  if (!meta) return false;
  return (
    meta.tenantName != null ||
    meta.landlordName != null ||
    meta.monthlyRent != null ||
    meta.deposit != null ||
    meta.startDate != null ||
    meta.endDate != null ||
    meta.paymentDay != null
  );
}

function startOfToday(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Whole days from today until `date` (negative if past). Null if missing/invalid. */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - startOfToday()) / dayMs);
}

export function getTrackStatus(contract: Contract): TrackStatus {
  const days = daysUntil(getEndDate(contract));
  if (days == null) return "unknown";
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring-soon";
  return "active";
}

/** Human countdown to expiry in Mongolian, or null when there's no end date. */
export function expiryLabel(contract: Contract): string | null {
  const days = daysUntil(getEndDate(contract));
  if (days == null) return null;
  if (days < 0) return `${Math.abs(days)} хоногийн өмнө дууссан`;
  if (days === 0) return "Өнөөдөр дуусна";
  if (days === 1) return "Маргааш дуусна";
  return `${days} хоногийн дараа дуусна`;
}

/** `1500000` → `1,500,000₮`. Null passes through. */
export function formatMNT(amount: number | null): string | null {
  if (amount == null) return null;
  return `${amount.toLocaleString("mn-MN")}₮`;
}

/**
 * ISO date → `2024 оны 9 сарын 1`. Built from the ISO parts rather than
 * `toLocaleDateString`, which renders English month names in some browsers
 * (and differs from Node), causing server/client mismatch. Null/invalid → null.
 */
export function formatDateMn(date: string | null): string | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year} оны ${Number(month)} сарын ${Number(day)}`;
}

const STATUS_RANK: Record<TrackStatus, number> = {
  "expiring-soon": 0,
  active: 1,
  expired: 2,
  unknown: 3,
};

/**
 * Sort for the tracking view: expiring-soon first (soonest first), then active,
 * then already-expired, then contracts with no known end date.
 */
export function sortByExpiry(contracts: Contract[]): Contract[] {
  return [...contracts].sort((a, b) => {
    const rankDiff = STATUS_RANK[getTrackStatus(a)] - STATUS_RANK[getTrackStatus(b)];
    if (rankDiff !== 0) return rankDiff;
    const da = daysUntil(getEndDate(a));
    const db = daysUntil(getEndDate(b));
    if (da == null) return 1;
    if (db == null) return -1;
    return da - db;
  });
}
