import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";

// Display-only severity (extends the alert severities with "ok" for passing
// checks). Shared by the screens, ScoreRing and the alerts list.
export type Severity = "high" | "medium" | "low" | "info" | "ok";

export function fmt(n: number) {
  return n.toLocaleString("mn-MN") + "₮";
}


/**
 * One severity, five presentational roles — but a row should only ever spend
 * ONE of them on color. `rail`/`dot` is the saturated signal, `ink` the label
 * text; `bg`/`border` are the faint wash reserved for surfaces that must pull
 * attention on their own (an unread alert), never stacked under a rail.
 */
export function severityConfig(s: Severity) {
  switch (s) {
    case "high":
      return {
        label: "Өндөр эрсдэл",
        rail: "bg-risk-high",
        ink: "text-risk-high-ink",
        bg: "bg-risk-high/8",
        border: "border-risk-high/25",
        badge: "bg-risk-high/10 text-risk-high-ink",
        icon: <XCircle className="text-risk-high size-4" />,
        dot: "bg-risk-high",
      };
    case "medium":
      return {
        label: "Дунд эрсдэл",
        rail: "bg-risk-medium",
        ink: "text-risk-medium-ink",
        bg: "bg-risk-medium/10",
        border: "border-risk-medium/30",
        badge: "bg-risk-medium/12 text-risk-medium-ink",
        icon: <AlertTriangle className="text-risk-medium size-4" />,
        dot: "bg-risk-medium",
      };
    case "low":
      return {
        label: "Бага эрсдэл",
        rail: "bg-risk-low",
        ink: "text-risk-low-ink",
        bg: "bg-risk-low/8",
        border: "border-risk-low/25",
        badge: "bg-risk-low/10 text-risk-low-ink",
        icon: <Info className="text-risk-low size-4" />,
        dot: "bg-risk-low",
      };
    case "info":
      return {
        label: "Мэдээлэл",
        rail: "bg-risk-info",
        ink: "text-risk-info-ink",
        bg: "bg-risk-info/8",
        border: "border-risk-info/25",
        badge: "bg-risk-info/12 text-risk-info-ink",
        icon: <Info className="text-risk-info size-4" />,
        dot: "bg-risk-info",
      };
    case "ok":
      return {
        label: "Хэвийн",
        rail: "bg-risk-ok",
        ink: "text-risk-ok-ink",
        bg: "bg-risk-ok/8",
        border: "border-risk-ok/25",
        badge: "bg-risk-ok/10 text-risk-ok-ink",
        icon: <CheckCircle2 className="text-risk-ok size-4" />,
        dot: "bg-risk-ok",
      };
  }
}

/**
 * How confident the AI is that a finding is a real violation — shown as an
 * honest three-level badge rather than a fabricated percentage. Distinct from
 * severity: a low-confidence finding can still be high severity.
 */
export function confidenceConfig(c: "high" | "medium" | "low") {
  switch (c) {
    case "high":
      return { label: "Өндөр итгэл", cls: "text-risk-ok-ink", dot: "bg-risk-ok" };
    case "medium":
      return { label: "Дунд итгэл", cls: "text-risk-medium-ink", dot: "bg-risk-medium" };
    case "low":
      return { label: "Бага итгэл", cls: "text-muted-foreground", dot: "bg-risk-info" };
  }
}

/**
 * The score's SIGNAL colour — rings, meters, bars. Saturated enough to read as
 * a mark at a glance, which also means it is too light to be legible as small
 * text: the amber step lands around 3:1 on `--card`.
 *
 * These were literal hex values, which is why they sat outside the severity
 * scale's signal/ink split and drifted from it. They now point at the same
 * tokens the rest of the app uses, so a retune in globals.css reaches them.
 */
export function scoreColor(s: number) {
  if (s >= 75) return "var(--risk-ok)";
  if (s >= 50) return "var(--risk-medium)";
  return "var(--risk-high)";
}

/**
 * The score's INK — the same three bands, darkened to clear 4.5:1 on `--card`
 * in both themes. Use this any time the score is rendered as text; `scoreColor`
 * is for the mark beside it.
 */
export function scoreInk(s: number) {
  if (s >= 75) return "var(--risk-ok-ink)";
  if (s >= 50) return "var(--risk-medium-ink)";
  return "var(--risk-high-ink)";
}

export function scoreLabel(s: number) {
  if (s >= 75) return "Нийцтэй";
  if (s >= 50) return "Анхаарал шаардлагатай";
  return "Өндөр эрсдэлтэй";
}
