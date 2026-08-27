import { resolveContractLabels } from "./contract-labels";
import {
  daysUntil,
  formatDateMn,
  formatMNT,
  getEndDate,
  getMetadata,
  getStartDate,
  hoursSince,
  nextPaymentDate,
  noticeDeadline,
  todayIso,
} from "./tracking";
import { lawMovedSince } from "./law-freshness";
import type { AlertSeverity, Contract } from "./types/contract";

/**
 * The notification feed: things the app tells the user, on its own initiative,
 * because a date is approaching or something needs attention.
 *
 * Audit findings are NOT notifications and must never appear here. A violation
 * is a fact about a contract that lives on the audit screen, where the user
 * reads it once; pushing findings into this feed made it a duplicate of a
 * screen they had already read, which is the problem this module exists to fix.
 * What belongs here is a deadline drawing close — an ending contract, a notice
 * window about to shut, a payment day, a deposit still unclaimed — plus the few
 * account-level things the app itself has to raise (an audit that failed or
 * stalled, a balance running out, a cited law that moved).
 *
 * Alerts are derived per request rather than stored (the app has no scheduler),
 * so each generator has to produce a *stable* id for as long as the thing it
 * describes is unchanged, and a *different* id once it escalates — that is what
 * makes "unread" meaningful against the `alert_reads` table (lib/alerts.ts).
 * Generators also age their alerts out, so nothing lingers in the feed forever.
 */

export type AlertKind =
  | "expiry"
  | "notice"
  | "payment"
  | "deposit"
  | "audit"
  | "credits"
  | "law";

/** Badge wording per kind, so the row says what sort of thing this is. */
export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  expiry: "Гэрээ дуусах",
  notice: "Мэдэгдэх хугацаа",
  payment: "Төлбөр",
  deposit: "Барьцаа",
  audit: "Шинжилгээ",
  credits: "Кредит",
  law: "Хууль шинэчлэгдсэн",
};

/** A notification mapped to what the alerts screen renders. */
export interface AlertVM {
  /** Stable id used as the React key and for marking-as-read. */
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  /** Contract this alert belongs to, or null for account-level alerts. */
  contractName: string | null;
  title: string;
  body: string;
  /** ISO `YYYY-MM-DD` the alert is *about* (deadline or event). Empty if none. */
  date: string;
  /** Where tapping the row goes, or null when there's nothing to open. */
  href: string | null;
  read: boolean;
}

/** Days ahead of a payment day the reminder starts showing. */
export const PAYMENT_REMINDER_DAYS = 3;
/** Days ahead of a notice deadline the reminder starts showing. */
export const NOTICE_REMINDER_DAYS = 7;
/** How long after expiry a contract keeps producing an expiry alert. */
export const EXPIRED_ALERT_WINDOW_DAYS = 60;
/** How long after expiry the deposit-return reminder shows. */
export const DEPOSIT_REMINDER_DAYS = 45;
/** Balance at or below which the low-credit warning appears. */
export const LOW_CREDIT_THRESHOLD = 10;
/** A pending audit older than this was abandoned (the audit call is blocking). */
export const STALE_AUDIT_HOURS = 1;
/** How long a failed audit keeps nagging before it ages out. */
export const FAILED_AUDIT_WINDOW_DAYS = 30;

/**
 * Countdown stages for an ending contract, tightest first. Only the current
 * stage is emitted, and the stage is part of the id — so crossing 14 → 3 days
 * replaces the row with a fresh unread one instead of stacking a second alert.
 */
const EXPIRY_STAGES = [0, 1, 3, 14, 30] as const;

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};

export interface BuildAlertsOptions {
  /** Alert ids the user already marked read (lib/alerts.ts). */
  readIds?: ReadonlySet<string>;
  /** Current credit balance, for the low-balance warning. */
  credits?: number;
  /** Last ingest timestamp per law name, for law-update alerts. */
  lawUpdatedAt?: ReadonlyMap<string, string>;
  /** Signed out (public demo): account-level alerts don't apply. */
  signedIn?: boolean;
}

function contractHref(id: string): string {
  return `/contracts/${id}`;
}

/** "3 хоногийн дараа" / "маргааш" / "өнөөдөр" for a non-negative day count. */
function inDaysMn(days: number): string {
  if (days <= 0) return "өнөөдөр";
  if (days === 1) return "маргааш";
  return `${days} хоногийн дараа`;
}

/** Countdown to the end date at 30 / 14 / 3 / 1 / 0 days, then expired. */
function expiryAlerts(contracts: Contract[]): Omit<AlertVM, "read">[] {
  const out: Omit<AlertVM, "read">[] = [];
  for (const c of contracts) {
    const end = getEndDate(c);
    const days = daysUntil(end);
    if (days == null) continue;
    const endLabel = formatDateMn(end) ?? end ?? "—";
    const { landlordLabel } = resolveContractLabels(
      getMetadata(c),
      c.audit_summary?.contractType,
    );

    if (days < 0) {
      // Long-expired contracts stop nagging; the tracker still lists them.
      if (-days > EXPIRED_ALERT_WINDOW_DAYS) continue;
      out.push({
        id: `e-${c.id}-expired`,
        kind: "expiry",
        severity: "high",
        contractName: c.file_name,
        title: "Гэрээний хугацаа дууссан",
        body: `Гэрээ ${endLabel}-нд дууссан. Сунгах эсвэл шинэчлэх шаардлагатай эсэхээ шалгана уу.`,
        date: end ?? "",
        href: contractHref(c.id),
      });
      continue;
    }

    const stage = EXPIRY_STAGES.find((threshold) => days <= threshold);
    if (stage == null) continue;
    out.push({
      id: `e-${c.id}-d${stage}`,
      kind: "expiry",
      severity: stage <= 3 ? "high" : "medium",
      contractName: c.file_name,
      title: `Гэрээ ${inDaysMn(days)} дуусна`,
      body: `Гэрээ ${endLabel}-нд дуусна. Сунгах эсэхээ ${landlordLabel} талтай урьдчилан ярилцана уу.`,
      date: end ?? "",
      href: contractHref(c.id),
    });
  }
  return out;
}

/**
 * The window to give notice closes before the contract does. Missing it is how
 * a contract auto-renews on terms the user wanted out of, so this fires ahead
 * of the deadline itself rather than ahead of the end date.
 */
function noticeAlerts(contracts: Contract[]): Omit<AlertVM, "read">[] {
  const out: Omit<AlertVM, "read">[] = [];
  for (const c of contracts) {
    const deadline = noticeDeadline(c);
    const days = daysUntil(deadline);
    if (days == null || days < 0 || days > NOTICE_REMINDER_DAYS) continue;

    const noticeDays = getMetadata(c)?.noticePeriodDays;
    out.push({
      id: `n-${c.id}-${deadline}`,
      kind: "notice",
      severity: days <= 2 ? "high" : "medium",
      contractName: c.file_name,
      title: `Мэдэгдэх эцсийн хугацаа ${inDaysMn(days)}`,
      body: `Гэрээг цуцлах эсвэл сунгахгүй бол ${noticeDays} хоногийн өмнө мэдэгдэх ёстой. Эцсийн хугацаа: ${formatDateMn(deadline) ?? deadline}.`,
      date: deadline ?? "",
      href: contractHref(c.id),
    });
  }
  return out;
}

/**
 * The recurring payment day the audit already extracts but nothing used. The
 * due date is in the id, so the reminder resets by itself every month.
 */
function paymentAlerts(contracts: Contract[]): Omit<AlertVM, "read">[] {
  const today = todayIso();
  const out: Omit<AlertVM, "read">[] = [];
  for (const c of contracts) {
    const meta = getMetadata(c);
    const due = nextPaymentDate(meta?.paymentDay);
    if (!due) continue;

    // Only for a contract that is currently running: nothing is owed before it
    // starts, and the end date cuts the schedule off.
    const start = getStartDate(c);
    if (start && start > today) continue;
    const end = getEndDate(c);
    if (end && due > end) continue;

    const days = daysUntil(due);
    if (days == null || days > PAYMENT_REMINDER_DAYS) continue;

    const { rentLabel } = resolveContractLabels(
      meta,
      c.audit_summary?.contractType,
    );
    const amount = formatMNT(meta?.monthlyRent ?? null);
    out.push({
      id: `p-${c.id}-${due}`,
      kind: "payment",
      severity: days === 0 ? "medium" : "low",
      contractName: c.file_name,
      title:
        days === 0
          ? `Өнөөдөр ${rentLabel} төлөх өдөр`
          : `${rentLabel} төлөх өдөр ${inDaysMn(days)}`,
      body: amount
        ? `Сарын ${meta?.paymentDay}-нд ${amount} төлөх ёстой.`
        : `Сарын ${meta?.paymentDay}-нд төлөх ёстой.`,
      date: due,
      href: contractHref(c.id),
    });
  }
  return out;
}

/** Getting the deposit back is the step people forget once a contract ends. */
function depositAlerts(contracts: Contract[]): Omit<AlertVM, "read">[] {
  const out: Omit<AlertVM, "read">[] = [];
  for (const c of contracts) {
    const deposit = formatMNT(getMetadata(c)?.deposit ?? null);
    if (!deposit) continue;
    const end = getEndDate(c);
    const days = daysUntil(end);
    if (days == null || days >= 0 || -days > DEPOSIT_REMINDER_DAYS) continue;

    out.push({
      id: `dep-${c.id}`,
      kind: "deposit",
      severity: "medium",
      contractName: c.file_name,
      title: "Барьцаагаа буцаан авах",
      body: `Гэрээ ${formatDateMn(end) ?? end}-нд дууссан. Барьцаанд төлсөн мөнгөө (${deposit}) буцаан авсан эсэхээ шалгана уу.`,
      date: end ?? "",
      href: contractHref(c.id),
    });
  }
  return out;
}

/**
 * Audits that did NOT end well. A finished audit needs no notification — the
 * upload flow awaits it and drops the user straight on the result — but a
 * failure, or an upload whose tab was closed mid-audit, leaves a contract
 * stranded with nothing to say so.
 */
function auditStateAlerts(contracts: Contract[]): Omit<AlertVM, "read">[] {
  const out: Omit<AlertVM, "read">[] = [];
  for (const c of contracts) {
    const updated = c.updated_at?.slice(0, 10) ?? "";

    if (c.status === "failed") {
      const days = daysUntil(updated);
      if (days != null && -days > FAILED_AUDIT_WINDOW_DAYS) continue;
      out.push({
        // A retry that fails again bumps updated_at (migration 014), so it
        // comes back unread rather than staying hidden behind the old mark.
        id: `a-${c.id}-failed-${updated}`,
        kind: "audit",
        severity: "high",
        contractName: c.file_name,
        title: "Шинжилгээ амжилтгүй боллоо",
        body: "Гэрээг шалгаж чадаагүй тул кредит зарцуулагдаагүй. Дахин оролдоно уу.",
        date: updated,
        href: contractHref(c.id),
      });
      continue;
    }

    if (c.status === "pending" || c.status === "processing") {
      // The audit request is blocking, so anything still pending an hour later
      // is not in flight — the tab was closed or the request died.
      const hours = hoursSince(c.updated_at);
      if (hours == null || hours < STALE_AUDIT_HOURS) continue;
      out.push({
        id: `a-${c.id}-stuck`,
        kind: "audit",
        severity: "medium",
        contractName: c.file_name,
        title: "Шинжилгээ дуусаагүй үлдсэн",
        body: "Гэрээ байршуулсан ч шинжилгээ нь дуусаагүй байна. Дахин эхлүүлнэ үү.",
        date: updated,
        href: contractHref(c.id),
      });
    }
  }
  return out;
}

/**
 * Balance running out, before the user hits it mid-upload. The id carries the
 * current month so a top-up-and-drain cycle can warn again next month rather
 * than staying silent forever behind one old read mark.
 */
function creditAlerts(credits: number): Omit<AlertVM, "read">[] {
  if (credits > LOW_CREDIT_THRESHOLD) return [];
  const month = todayIso().slice(0, 7);
  const empty = credits <= 0;
  return [
    {
      id: `cr-${empty ? "empty" : "low"}-${month}`,
      kind: "credits",
      severity: empty ? "high" : "medium",
      contractName: null,
      title: empty ? "Кредит дууссан" : `Үлдэгдэл ${credits} кредит`,
      body: empty
        ? "Шинэ гэрээ шалгуулахын тулд кредитээ цэнэглэнэ үү."
        : "Нэг хуудас = 1 кредит. Дараагийн гэрээнд хүрэлцэхгүй байж магадгүй.",
      date: todayIso(),
      href: "/payment",
    },
  ];
}

/**
 * The knowledge base moved under a finished audit. `lawUpdatedAt` holds the
 * last ingest per law; an audit that cited a law re-ingested after it ran was
 * measured against text that is no longer what's stored, and deserves a
 * re-check. Empty map (or a law never re-ingested) means no alerts.
 */
function lawUpdateAlerts(
  contracts: Contract[],
  lawUpdatedAt: ReadonlyMap<string, string>,
): Omit<AlertVM, "read">[] {
  if (lawUpdatedAt.size === 0) return [];
  const out: Omit<AlertVM, "read">[] = [];

  for (const c of contracts) {
    if (c.status !== "completed") continue;
    // `audited_at` is when the audit ran; `updated_at` is when the row last
    // changed, which a saved correction letter or a cached page count also
    // moves. Fall back to it only for rows audited before that column existed.
    // The comparison itself is shared with the audit route, which refuses to
    // reuse an audit this call would flag (see lib/law-freshness.ts).
    const newest = lawMovedSince(
      c.audited_at ?? c.updated_at,
      c.audit_summary,
      lawUpdatedAt,
    );
    if (!newest) continue;

    const stamp = new Date(newest.at).toISOString().slice(0, 10);
    out.push({
      // The ingest date is in the id: each new version of the law re-surfaces.
      id: `law-${c.id}-${stamp}`,
      kind: "law",
      severity: "medium",
      contractName: c.file_name,
      title: `${newest.law} шинэчлэгдсэн`,
      body: `Энэ гэрээг шалгасны дараа хуулийн эх сурвалж (${newest.law}) шинэчлэгдсэн. Дахин шалгуулбал шинэ заалтуудаар үнэлэгдэнэ.`,
      date: stamp,
      href: contractHref(c.id),
    });
  }
  return out;
}

/**
 * Alert ids for a contract must contain that contract's id.
 *
 * Read marks are stored by alert id (`alert_reads`), and alerts are derived per
 * request rather than stored, so the id is the only thing tying a mark to the
 * contract it came from — it is what lets the marks be dropped when the
 * contract is deleted (`forgetContractAlertReads`). A new alert kind that
 * leaves the contract id out would leak a row per user, forever; a test in
 * tests/notifications.test.ts fails if one does.
 */

/** How many days away the alert's subject is — nearest to today ranks first. */
function urgency(alert: Omit<AlertVM, "read">): number {
  const days = daysUntil(alert.date);
  return days == null ? Number.MAX_SAFE_INTEGER : Math.abs(days);
}

/**
 * Build the notification feed from the user's contracts and account state.
 * Read-state comes from the `alert_reads` table, keyed by the ids built here,
 * so those ids must stay stable across requests for an unchanged subject.
 */
export function buildAlerts(
  contracts: Contract[],
  options: BuildAlertsOptions = {},
): AlertVM[] {
  const {
    readIds = new Set<string>(),
    credits = 0,
    lawUpdatedAt = new Map<string, string>(),
    signedIn = true,
  } = options;

  const alerts = [
    ...expiryAlerts(contracts),
    ...noticeAlerts(contracts),
    ...paymentAlerts(contracts),
    ...depositAlerts(contracts),
    ...auditStateAlerts(contracts),
    ...(signedIn ? creditAlerts(credits) : []),
    ...lawUpdateAlerts(contracts, lawUpdatedAt),
  ];

  return alerts
    .map((a) => ({ ...a, read: readIds.has(a.id) }))
    .sort((a, b) => {
      // Unread first — the feed's job is to show what's new.
      if (a.read !== b.read) return a.read ? 1 : -1;
      const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (rank !== 0) return rank;
      return urgency(a) - urgency(b);
    });
}
