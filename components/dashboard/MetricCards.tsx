"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { CheckCircle2, FileText } from "lucide-react";
import type { DashboardMetrics } from "@/lib/contracts";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { triggerHaptic } from "@/lib/hooks/useHaptic";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

function AnimatedValue({
  value,
  suffix = "",
}: {
  value: number;
  suffix?: string;
}) {
  const display = useCountUp(value, 500, true);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value > prevRef.current) triggerHaptic("light");
    prevRef.current = value;
  }, [value]);

  return (
    <motion.p
      key={display}
      initial={{ scale: 1.05 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="mt-1 text-2xl font-bold tabular-nums text-foreground"
    >
      {suffix ? `${display}${suffix}` : display}
    </motion.p>
  );
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const items = [
    {
      label: "Шалгасан гэрээ",
      value: metrics.activeCount,
      suffix: "",
      subtext: metrics.activeCount === 0 ? "Гэрээ байхгүй" : "Амжилттай шинжилсэн",
      subtextClass: metrics.activeCount > 0 ? "text-success" : "text-muted-foreground",
      icon: FileText,
      iconClass: "text-navy",
    },
    {
      label: "Нийцлийн түвшин",
      value: metrics.averageCompliance ?? 0,
      suffix: metrics.averageCompliance != null ? "%" : "",
      displayDash: metrics.averageCompliance == null,
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
          className="min-w-[140px] flex-1 shrink-0 rounded-xl border border-border bg-white p-4"
        >
          <div className="flex items-start justify-between">
            <p className="text-[11px] leading-tight text-muted-foreground">
              {metric.label}
            </p>
            <metric.icon className={`size-3.5 shrink-0 ${metric.iconClass}`} />
          </div>
          {"displayDash" in metric && metric.displayDash ? (
            <p className="mt-1 text-2xl font-bold text-foreground">—</p>
          ) : (
            <AnimatedValue value={metric.value} suffix={metric.suffix} />
          )}
          <p className={`mt-0.5 text-[11px] font-medium ${metric.subtextClass}`}>
            {metric.subtext}
          </p>
        </div>
      ))}
    </div>
  );
}
