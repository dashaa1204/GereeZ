import { AlarmClock, CalendarX, FileCheck, Gauge } from "lucide-react";
import type { Contract } from "@/lib/types/contract";
import { getTrackStatus } from "@/lib/tracking";
import { cn } from "@/lib/utils";

interface ContractsSummaryProps {
  contracts: Contract[];
}

/**
 * Compact "dashboard" strip at the top of the contracts view: rolls the old
 * tracking page's expiry counts together with audit totals so the contract
 * list (whose rows already expand to show per-contract detail) carries the
 * at-a-glance numbers too.
 */
export function ContractsSummary({ contracts }: ContractsSummaryProps) {
  const completed = contracts.filter((c) => c.status === "completed");

  const scores = completed
    .map((c) => c.compliance_score)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : null;

  const expiringSoon = completed.filter(
    (c) => getTrackStatus(c) === "expiring-soon",
  ).length;
  const expired = completed.filter((c) => getTrackStatus(c) === "expired").length;

  const stats = [
    {
      label: "Шалгасан гэрээ",
      value: String(completed.length),
      icon: FileCheck,
      valueClass: "text-foreground",
      iconClass: "text-navy",
    },
    {
      label: "Дундаж оноо",
      value: avgScore != null ? `${avgScore}%` : "—",
      icon: Gauge,
      valueClass:
        avgScore != null && avgScore >= 80
          ? "text-success"
          : avgScore != null && avgScore >= 60
            ? "text-warning"
            : "text-foreground",
      iconClass: "text-navy",
    },
    {
      label: "Удахгүй дуусна",
      value: String(expiringSoon),
      icon: AlarmClock,
      valueClass: expiringSoon > 0 ? "text-warning" : "text-foreground",
      iconClass: expiringSoon > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Хугацаа дууссан",
      value: String(expired),
      icon: CalendarX,
      valueClass: expired > 0 ? "text-destructive" : "text-foreground",
      iconClass: expired > 0 ? "text-destructive" : "text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-white p-3.5"
        >
          <div className="flex items-start justify-between">
            <p className="text-[11px] leading-tight text-muted-foreground">
              {stat.label}
            </p>
            <stat.icon className={cn("size-3.5 shrink-0", stat.iconClass)} />
          </div>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tabular-nums",
              stat.valueClass,
            )}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
