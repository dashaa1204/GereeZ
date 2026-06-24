import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";
import type { DashboardMetrics } from "@/lib/contracts";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const items = [
    {
      label: "Шалгасан гэрээ",
      value: String(metrics.activeCount),
      subtext: metrics.activeCount === 0 ? "Гэрээ байхгүй" : "Амжилттай шинжилсэн",
      subtextClass: metrics.activeCount > 0 ? "text-success" : "text-muted-foreground",
      icon: FileText,
      iconClass: "text-navy",
    },
    {
      label: "Хүлээгдэж буй",
      value: String(metrics.pendingAudits),
      subtext: metrics.pendingAudits > 0 ? "Шинжилгээ хийгдэж байна" : "Бүгд дууссан",
      subtextClass: metrics.pendingAudits > 0 ? "text-warning" : "text-muted-foreground",
      icon: Clock,
      iconClass: metrics.pendingAudits > 0 ? "text-warning" : "text-muted-foreground",
    },
    {
      label: "Алдаатай",
      value: String(metrics.failedCount),
      subtext: metrics.failedCount > 0 ? "Дахин оролдоно уу" : "Алдаагүй",
      subtextClass: metrics.failedCount > 0 ? "text-destructive" : "text-success",
      icon: AlertTriangle,
      iconClass: metrics.failedCount > 0 ? "text-destructive" : "text-success",
    },
    {
      label: "Нийцлийн түвшин",
      value: metrics.averageCompliance != null ? `${metrics.averageCompliance}%` : "—",
      subtext:
        metrics.averageCompliance != null
          ? metrics.averageCompliance >= 80
            ? "Сайн"
            : metrics.averageCompliance >= 60
              ? "Дунд"
              : "Анхаарах"
          : "Өгөгдөл байхгүй",
      subtextClass:
        metrics.averageCompliance != null && metrics.averageCompliance >= 80
          ? "text-success"
          : metrics.averageCompliance != null && metrics.averageCompliance >= 60
            ? "text-warning"
            : "text-muted-foreground",
      icon: CheckCircle2,
      iconClass:
        metrics.averageCompliance != null && metrics.averageCompliance >= 80
          ? "text-success"
          : "text-muted-foreground",
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
      {items.map((metric) => (
        <div
          key={metric.label}
          className="min-w-[140px] flex-1 shrink-0 rounded-xl border border-border bg-white p-3"
        >
          <div className="flex items-start justify-between">
            <p className="text-[11px] leading-tight text-muted-foreground">
              {metric.label}
            </p>
            <metric.icon className={`size-3.5 shrink-0 ${metric.iconClass}`} />
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{metric.value}</p>
          <p className={`mt-0.5 text-[11px] font-medium ${metric.subtextClass}`}>
            {metric.subtext}
          </p>
        </div>
      ))}
    </div>
  );
}
