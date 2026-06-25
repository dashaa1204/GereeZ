import { AlertTriangle, Clock, Info } from "lucide-react";
import type { DashboardAlert } from "@/lib/contracts";

interface ComplianceAlertsProps {
  alerts: DashboardAlert[];
  highRiskCount: number;
}

const severityStyles = {
  high: {
    border: "border-l-destructive",
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  medium: {
    border: "border-l-warning",
    icon: AlertTriangle,
    iconClass: "text-warning",
  },
  low: {
    border: "border-l-slate-400",
    icon: Info,
    iconClass: "text-slate-500",
  },
  info: {
    border: "border-l-slate-400",
    icon: Info,
    iconClass: "text-slate-500",
  },
};

export function ComplianceAlerts({
  alerts = [],
  highRiskCount,
}: ComplianceAlertsProps) {
  const visibleAlerts = alerts.slice(0, 5);

  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Нийцлийн анхааруулга</h2>
        </div>
        {highRiskCount > 0 && (
          <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
            {highRiskCount} өндөр эрсдэл
          </span>
        )}
      </div>

      {visibleAlerts.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Одоогоор анхааруулга байхгүй байна.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Гэрээ оруулж шинжилгээ хийлгэсний дараа энд харагдана.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visibleAlerts.map((alert) => {
            const style = severityStyles[alert.severity];
            const Icon = style.icon;
            return (
              <div
                key={`${alert.contractId}-${alert.title}`}
                className={`border-l-4 px-4 py-3 ${style.border}`}
              >
                <div className="flex gap-2">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${style.iconClass}`} />
                  <div>
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {alert.contractName}
                      {alert.lawName && alert.articleReference
                        ? ` · ${alert.lawName} — ${alert.articleReference}`
                        : ""}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {alerts.length > 5 && (
        <div className="border-t border-border py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Нийт {alerts.length} анхааруулга
          </p>
        </div>
      )}
    </section>
  );
}
