"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
// Straight from lib/notifications, not the lib/view-models re-export: this is a
// client component, and view-models pulls in the server-only Supabase clients.
import { ALERT_KIND_LABELS, type AlertVM } from "@/lib/notifications";
import { markAlertsRead } from "@/lib/services/alerts.client";
import { formatDateMn } from "@/lib/tracking";
import { severityConfig } from "./display";
import { useDismissable } from "./useDismissable";

/** How many alerts the panel shows before it starts scrolling. */
const PANEL_MAX = 6;

/**
 * The bell in TopNav, as a dropdown rather than a link: the point of a
 * notification is to be readable without leaving the screen you are on, so the
 * panel carries the newest alerts inline and only offers `/alerts` as a way to
 * see the rest.
 *
 * Unread state shows as a single brand dot rather than a count; `aria-label`
 * still carries the number, so a screen reader is not left with less than the
 * eye gets.
 *
 * Read marks are kept as an overlay set of ids on top of the server's `read`
 * flag instead of a local copy of the list. A copy would go stale the moment
 * `router.refresh()` delivered fresh props; an overlay lets the server's answer
 * win while the optimistic mark still survives the round trip.
 */
export function NotificationMenu({ alerts }: { alerts: AlertVM[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [markedRead, setMarkedRead] = useState<ReadonlySet<string>>(new Set());

  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, containerRef, close);

  const isRead = (a: AlertVM) => a.read || markedRead.has(a.id);
  const unread = alerts.filter((a) => !isRead(a));
  const unreadCount = unread.length;

  // Optimistic: overlay the ids right away, persist in the background, and
  // refresh so the badge and the alerts screen follow. A failed persist only
  // means the mark reverts on next load — not worth blocking the tap.
  const persist = (ids: string[]) => {
    if (ids.length === 0) return;
    setMarkedRead((prev) => new Set([...prev, ...ids]));
    markAlertsRead(ids)
      .then(() => router.refresh())
      .catch((err) => console.error("markAlertsRead failed:", err));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unreadCount > 0 ? `Мэдэгдэл (${unreadCount} шинэ)` : "Мэдэгдэл"
        }
        className={`border-border relative flex size-9 items-center justify-center rounded-lg border transition-colors ${
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          /* A dot, not a count: the exact number is one click away in the panel
             header, and red would read as an error when most alerts are just a
             deadline coming up. The ring punches it out of the bell's border so
             it stays legible where the two overlap. */
          <span className="bg-brand ring-background absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Мэдэгдэл"
          className="border-border bg-card absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border shadow-lg"
        >
          <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
            <p className="text-foreground text-sm font-bold">
              {unreadCount > 0 ? `${unreadCount} уншаагүй` : "Бүгд уншигдсан"}
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => persist(unread.map((a) => a.id))}
                className="text-brand hover:bg-brand/10 shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition-colors"
              >
                Бүгдийг уншсан
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Bell className="text-muted-foreground/50 mx-auto size-7" />
              <p className="text-muted-foreground mt-2.5 text-sm font-medium">
                Мэдэгдэл байхгүй байна
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Гэрээний хугацаа ойртох үед энд сануулга ирнэ.
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {alerts.slice(0, PANEL_MAX).map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  read={isRead(alert)}
                  onOpen={() => {
                    persist([alert.id]);
                    if (alert.href) setOpen(false);
                  }}
                />
              ))}
            </div>
          )}

          <div className="border-border border-t">
            <Link
              href="/alerts"
              role="menuitem"
              onClick={close}
              className="text-brand hover:bg-muted block px-4 py-2.5 text-center text-sm font-semibold transition-colors"
            >
              {alerts.length > PANEL_MAX
                ? `Бүх мэдэгдэл (${alerts.length})`
                : "Бүх мэдэгдэл"}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertItem({
  alert,
  read,
  onOpen,
}: {
  alert: AlertVM;
  read: boolean;
  onOpen: () => void;
}) {
  const cfg = severityConfig(alert.severity);
  const className = `flex w-full items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted ${
    read ? "" : "bg-brand/5"
  }`;

  const content = (
    <>
      <span className="mt-0.5 shrink-0">{cfg.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-foreground text-sm leading-snug font-semibold">
            {alert.title}
          </span>
          {!read && (
            <span className="bg-brand mt-1.5 size-2 shrink-0 rounded-full" />
          )}
        </span>
        {alert.contractName && (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {alert.contractName}
          </span>
        )}
        <span className="mt-1.5 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
          >
            {ALERT_KIND_LABELS[alert.kind]}
          </span>
          {alert.date && (
            <span className="text-muted-foreground text-[11px]">
              {formatDateMn(alert.date) ?? alert.date}
            </span>
          )}
        </span>
      </span>
    </>
  );

  // A notification that names a contract or a next step should take the user
  // there; the ones with nowhere to go stay a plain mark-as-read target.
  return alert.href ? (
    <Link href={alert.href} role="menuitem" onClick={onOpen} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" role="menuitem" onClick={onOpen} className={className}>
      {content}
    </button>
  );
}
