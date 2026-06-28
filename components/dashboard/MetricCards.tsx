"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { DashboardMetrics } from "@/lib/contracts";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { triggerHaptic } from "@/lib/hooks/useHaptic";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

function scoreColor(score: number) {
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "var(--warning)";
  return "var(--destructive)";
}

function AnimatedValue({
  value,
  suffix = "",
  color,
}: {
  value: number;
  suffix?: string;
  color?: string;
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
      className="text-2xl font-bold tabular-nums text-foreground"
      style={color ? { color } : undefined}
    >
      {suffix ? `${display}${suffix}` : display}
    </motion.p>
  );
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const score = metrics.averageCompliance;

  const items = [
    {
      key: "active",
      label: "Шалгасан гэрээ",
      value: metrics.activeCount,
      dash: false,
      color: undefined as string | undefined,
    },
    {
      key: "score",
      label: "Нийцлийн оноо",
      value: score ?? 0,
      dash: score == null,
      color: score != null ? scoreColor(score) : undefined,
    },
    {
      key: "risk",
      label: "Өндөр эрсдэл",
      value: metrics.highRiskCount,
      dash: false,
      color: metrics.highRiskCount > 0 ? "var(--destructive)" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((m) => (
        <div
          key={m.key}
          className="rounded-xl border border-border bg-card p-3 text-center"
        >
          {m.dash ? (
            <p className="text-2xl font-bold text-foreground">—</p>
          ) : (
            <AnimatedValue value={m.value} color={m.color} />
          )}
          <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
            {m.label}
          </p>
        </div>
      ))}
    </div>
  );
}
