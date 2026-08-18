"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import type { AlertVM } from "@/lib/view-models";
import { markAlertsRead } from "@/lib/services/alerts.client";
import { formatDateMn } from "@/lib/tracking";
import { severityConfig } from "../display";

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
          <h2 className="font-semibold text-foreground">Мэдэгдэл</h2>
          {unread > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unread} уншаагүй байна</p>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-medium text-primary"
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
            Хуулийн зөрчил эсвэл дуусах гэрээ гарвал энд харагдана.
          </p>
        </div>
      )}

      <div className="space-y-2.5 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-3 lg:space-y-0 lg:items-start">
        {alerts.map((a) => {
          const cfg = severityConfig(a.severity);
          return (
            <div
              key={a.id}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                a.read ? "bg-card border-border" : `${cfg.bg} ${cfg.border}`
              }`}
              onClick={() => markRead(a.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {a.title}
                    </p>
                    {!a.read && (
                      <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.contractName}</p>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a.body}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                      {a.type === "compliance" ? "Хуулийн зөрчил" : "Гэрээ дуусах"}
                    </span>
                    {a.date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateMn(a.date) ?? a.date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
