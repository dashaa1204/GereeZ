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

/** Local calendar date as `YYYY-MM-DD` (never UTC — see formatDateMn). */
function toIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** `date` moved by `delta` days, still `YYYY-MM-DD`. Null on invalid input. */
export function shiftDays(date: string | null, delta: number): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setDate(parsed.getDate() + delta);
  return toIsoDate(parsed);
}

/** Whole hours since an ISO timestamp. Null when missing/invalid. */
export function hoursSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / (60 * 60 * 1000);
}

/**
 * The next time a monthly payment day comes around, counting today. A day past
 * the end of a short month clamps to that month's last day, so a 31st payment
 * day lands on 28 February rather than skipping the month. Null when the day
 * isn't a real 1–31.
 */
export function nextPaymentDate(
  paymentDay: number | null | undefined,
): string | null {
  if (
    paymentDay == null ||
    !Number.isInteger(paymentDay) ||
    paymentDay < 1 ||
    paymentDay > 31
  ) {
    return null;
  }
  const today = new Date(startOfToday());
  // This month's occurrence, then next month's if today is already past it.
  for (const offset of [0, 1]) {
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const due = new Date(year, month, Math.min(paymentDay, lastDay));
    if (due.getTime() >= today.getTime()) return toIsoDate(due);
  }
  return null;
}

/**
 * The last day the user can still give notice: the end date minus the notice
 * period the contract states. Null when either is unknown.
 */
export function noticeDeadline(contract: Contract): string | null {
  const days = getMetadata(contract)?.noticePeriodDays;
  if (days == null || days <= 0) return null;
  return shiftDays(getEndDate(contract), -days);
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
