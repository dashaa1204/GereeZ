import { AlertTriangle, Info } from "lucide-react";
import type { AuditAlert } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

const SEVERITY_LABELS: Record<AuditAlert["severity"], string> = {
  high: "Өндөр",
  medium: "Дунд",
  low: "Бага",
  info: "Мэдээлэл",
};

const severityStyles = {
  high: {
    border: "border-l-destructive",
    icon: AlertTriangle,
    iconClass: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
  },
  medium: {
    border: "border-l-warning",
    icon: AlertTriangle,
    iconClass: "text-warning",
    badge: "bg-warning/10 text-warning",
  },
  low: {
    border: "border-l-slate-400",
    icon: Info,
    iconClass: "text-slate-500",
    badge: "bg-muted text-muted-foreground",
  },
  info: {
    border: "border-l-slate-400",
    icon: Info,
    iconClass: "text-slate-500",
    badge: "bg-muted text-muted-foreground",
  },
};

interface AuditAlertListProps {
  alerts: AuditAlert[];
  className?: string;
  variant?: "cards" | "list";
}

export function AuditAlertList({
  alerts = [],
  className,
  variant = "list",
}: AuditAlertListProps) {
  if (alerts.length === 0) return null;

  if (variant === "cards") {
    return (
      <div className={cn("space-y-2", className)}>
        {alerts.map((alert) => (
          <div
            key={alert.title}
            className="rounded-md border border-border bg-white px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{alert.title}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {SEVERITY_LABELS[alert.severity]}
              </span>
            </div>
            {alert.lawName && alert.articleReference && (
              <p className="mt-0.5 text-[10px] font-medium text-navy">
                {alert.lawName} — {alert.articleReference}
              </p>
            )}
            {alert.contractClause && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Гэрээний заалт: {alert.contractClause}
              </p>
            )}
            <p className="mt-0.5 text-muted-foreground">{alert.description}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("divide-y divide-border", className)}>
      {alerts.map((alert) => {
        const style = severityStyles[alert.severity];
        const Icon = style.icon;
        return (
          <div
            key={alert.title}
            className={cn("border-l-4 px-4 py-3", style.border)}
          >
            <div className="flex gap-2">
              <Icon className={cn("mt-0.5 size-4 shrink-0", style.iconClass)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      style.badge,
                    )}
                  >
                    {SEVERITY_LABELS[alert.severity]}
                  </span>
                </div>
                {alert.lawName && alert.articleReference && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {alert.lawName} — {alert.articleReference}
                  </p>
                )}
                {alert.contractClause && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    Гэрээний заалт: {alert.contractClause}
                  </p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {alert.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
