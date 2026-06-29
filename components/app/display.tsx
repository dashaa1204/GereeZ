import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

// Display-only severity (extends the alert severities with "ok" for passing
// checks). Shared by the screens, ScoreRing, FindingRow and the alerts list.
export type Severity = "high" | "medium" | "low" | "info" | "ok";

export function fmt(n: number) {
  return n.toLocaleString("mn-MN") + "₮";
}

export function fmtOrDash(n: number | null) {
  return n == null ? "—" : fmt(n);
}

export function severityConfig(s: Severity) {
  switch (s) {
    case "high":
      return {
        label: "Өндөр эрсдэл",
        bg: "bg-red-50 dark:bg-red-950/40",
        border: "border-red-200 dark:border-red-800/60",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300",
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        dot: "bg-red-500",
      };
    case "medium":
      return {
        label: "Дунд эрсдэл",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800/50",
        badge:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
        dot: "bg-amber-500",
      };
    case "low":
      return {
        label: "Бага эрсдэл",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800/50",
        badge:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
        icon: <Info className="w-4 h-4 text-blue-500" />,
        dot: "bg-blue-400",
      };
    case "info":
      return {
        label: "Мэдээлэл",
        bg: "bg-slate-50 dark:bg-slate-900/40",
        border: "border-slate-200 dark:border-slate-700/50",
        badge:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        icon: <Info className="w-4 h-4 text-slate-400" />,
        dot: "bg-slate-400",
      };
    case "ok":
      return {
        label: "Хэвийн",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        border: "border-emerald-200 dark:border-emerald-800/50",
        badge:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        dot: "bg-emerald-500",
      };
  }
}

export function scoreColor(s: number) {
  if (s >= 75) return "#16a34a";
  if (s >= 50) return "#d97706";
  return "#dc2626";
}

export function scoreLabel(s: number) {
  if (s >= 75) return "Нийцтэй";
  if (s >= 50) return "Анхаарал шаардлагатай";
  return "Өндөр эрсдэлтэй";
}
