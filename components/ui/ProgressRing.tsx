"use client";

import { Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  complete?: boolean;
  /**
   * For a phase whose length we genuinely cannot predict. The ring spins a
   * fixed arc and the percentage is withheld, because a number that stops
   * moving reads as a hang — an honest "still working" beats a frozen 95%.
   */
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  sublabel?: string;
  className?: string;
}

const SIZES = {
  sm: { container: "size-24", stroke: 8, r: 40, text: "text-lg", sub: "text-[9px]" },
  md: { container: "size-32", stroke: 9, r: 48, text: "text-2xl", sub: "text-[10px]" },
  lg: { container: "size-40", stroke: 10, r: 54, text: "text-3xl", sub: "text-[10px]" },
} as const;

export function ProgressRing({
  progress,
  complete = false,
  indeterminate = false,
  size = "md",
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const cfg = SIZES[size];
  const spinning = indeterminate && !complete;
  const circumference = 2 * Math.PI * cfg.r;
  const clamped = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;
  const viewSize = cfg.r * 2 + cfg.stroke * 2;
  const center = viewSize / 2;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center",
        complete && "animate-ring-glow",
        className,
      )}
    >
      <motion.div
        className={cn("relative", cfg.container)}
        animate={complete ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <svg
          className={cn(
            "size-full -rotate-90",
            spinning && "animate-spin [animation-duration:1.4s]",
          )}
          viewBox={`0 0 ${viewSize} ${viewSize}`}
        >
          <circle
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={cfg.stroke}
            className="text-border"
          />
          <circle
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={spinning ? circumference * 0.72 : offset}
            className={cn(
              complete ? "text-success-complete" : "text-foreground",
              !spinning && "transition-[stroke-dashoffset] duration-300",
            )}
            style={{ transitionTimingFunction: "var(--ease-settle)" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {complete ? (
              <motion.div
                key="check"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
              >
                <Check className="size-8 text-success-complete" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                {!spinning && (
                  <span
                    className={cn(
                      "font-bold tabular-nums tracking-tight text-foreground",
                      cfg.text,
                    )}
                  >
                    {clamped}%
                  </span>
                )}
                {sublabel && (
                  <span
                    className={cn(
                      "font-semibold tabular-nums tracking-widest text-muted-foreground",
                      spinning ? cfg.text : cn("mt-0.5", cfg.sub),
                    )}
                  >
                    {sublabel}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {label && (
        <p className="mt-3 text-center text-sm font-medium text-muted-foreground">
          {label}
        </p>
      )}
    </div>
  );
}
