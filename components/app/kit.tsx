import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared visual vocabulary the landing page established, packaged so every
 * app screen speaks it the same way: a near-black emphasis panel, an emerald
 * eyebrow above each block, soft bordered cards, and emerald icon chips.
 *
 * Colors come from the `--brand` / `--panel` tokens in globals.css rather than
 * literal `emerald-*` / `zinc-*` classes, so the whole system can be retuned
 * from one place.
 */

/** Small uppercase label that sits above a heading. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-brand text-xs font-semibold tracking-[0.14em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Section heading, optionally introduced by an eyebrow. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h2 className="text-lg font-bold tracking-tight text-balance text-foreground lg:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * The near-black emphasis surface. Text inside is always light, so it carries
 * its own foreground rather than inheriting the theme's.
 *
 * A flat fill this dark reads as a hole punched in the page, so the panel
 * carries the landing hero's own depth cues: the faint grid, a highlight along
 * the top edge, and a hairline border in both themes.
 */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-panel text-panel-foreground relative overflow-hidden rounded-2xl",
        // The border separates the panel from the page in dark mode, where the
        // two fills are close, and softens the cut-out edge in light mode.
        "border border-white/10 dark:border-white/12",
        "shadow-[0_18px_40px_-24px_oklch(0.16_0.008_260_/_0.55)]",
        // Highlight along the top edge — the light the surface would catch if
        // it were a real slab rather than a rectangle of ink.
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className,
      )}
    >
      <PanelGrid />
      {children}
    </div>
  );
}

/**
 * The hero's fine grid, faded out before it reaches the panel edges. Purely
 * texture: it keeps a large panel from reading as dead space.
 */
function PanelGrid() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.14]"
      style={{
        backgroundImage:
          "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage:
          "radial-gradient(ellipse 80% 90% at 50% 0%, #000 20%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 90% at 50% 0%, #000 20%, transparent 100%)",
      }}
    />
  );
}

/** The emerald bloom the landing hero uses, for the corner of a Panel. */
export function PanelGlow({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand/25 pointer-events-none absolute -top-24 -right-16 size-64 rounded-full blur-3xl",
        className,
      )}
    />
  );
}

/** Standard bordered content card. */
export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-2xl border p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Emerald-tinted square holding a single icon. */
export function IconChip({
  icon: Icon,
  className,
  onPanel = false,
}: {
  icon: LucideIcon;
  className?: string;
  /** On a dark Panel the tint and icon both switch to white-on-white/10. */
  onPanel?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        onPanel ? "bg-white/10" : "bg-brand/10",
        className,
      )}
    >
      <Icon className={cn("size-5", onPanel ? "text-white" : "text-brand")} />
    </span>
  );
}

/** Pill showing a count or status, in the muted default or the brand tint. */
export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "brand" | "onPanel";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    brand: "bg-brand/12 text-brand",
    onPanel: "bg-white/15 text-white",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
