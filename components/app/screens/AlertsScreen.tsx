"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
// Straight from lib/notifications, not the lib/view-models re-export: this is a
// client component, and view-models pulls in the server-only Supabase clients.
import { ALERT_KIND_LABELS, type AlertVM } from "@/lib/notifications";
import { markAlertsRead } from "@/lib/services/alerts.client";
import { formatDateMn } from "@/lib/tracking";
import { severityConfig } from "../display";
import { Eyebrow } from "../kit";

export function AlertsScreen({ initialAlerts }: { initialAlerts: AlertVM[] }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState(initialAlerts);
  const unread = alerts.filter((a) => !a.read).length;

  // Optimistic: flip locally right away, persist in the background, and
  // refresh the route so the layout's unread badge follows. A failed persist
  // only means the mark reverts on next load — not worth blocking the tap.
  const persist = (ids: string[]) => {
    markAlertsRead(ids)
      .then(() => router.refresh())
      .catch((err) => console.error("markAlertsRead failed:", err));
  };

  const markRead = (id: string) => {
    if (alerts.find((a) => a.id === id)?.read) return;
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    persist([id]);
  };
  const markAllRead = () => {
    const unreadIds = alerts.filter((a) => !a.read).map((a) => a.id);
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    persist(unreadIds);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Eyebrow className="mb-1.5">Мэдэгдэл</Eyebrow>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {unread > 0 ? `${unread} уншаагүй мэдэгдэл` : "Бүгд уншигдсан"}
          </h2>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-brand hover:bg-brand/10 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
          >
            Бүгдийг уншсан
          </button>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <Bell className="mx-auto w-8 h-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Мэдэгдэл байхгүй байна</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Гэрээний хугацаа, төлбөрийн өдөр ойртох үед энд сануулга ирнэ.
          </p>
        </div>
      )}

      <div className="space-y-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0 lg:items-start">
        {alerts.map((a) => (
          <AlertRow key={a.id} alert={a} onRead={() => markRead(a.id)} />
        ))}
      </div>
    </div>
  );
}

function AlertRow({ alert, onRead }: { alert: AlertVM; onRead: () => void }) {
  const cfg = severityConfig(alert.severity);
  const className = `block w-full text-left rounded-2xl border p-4 transition-all ${
    alert.read ? "bg-card border-border" : `${cfg.bg} ${cfg.border}`
  } ${alert.href ? "hover:border-brand/40" : ""}`;

  const content = (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {alert.title}
          </p>
          {!alert.read && (
            <span className="bg-brand mt-1.5 size-2 shrink-0 rounded-full" />
          )}
        </div>
        {alert.contractName && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {alert.contractName}
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {alert.body}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {ALERT_KIND_LABELS[alert.kind]}
          </span>
          {alert.date && (
            <span className="text-xs text-muted-foreground">
              {formatDateMn(alert.date) ?? alert.date}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // A notification that names a contract or a next step should take the user
  // there; only the ones with nowhere to go stay a plain mark-as-read target.
  return alert.href ? (
    <Link href={alert.href} onClick={onRead} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onRead} className={className}>
      {content}
    </button>
  );
}
