"use client";

import { useCountUp } from "@/lib/hooks/useCountUp";
import { cn } from "@/lib/utils";

interface LegalScoreProps {
  score: number | null;
  variant?: "default" | "inline";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Сайн байдал";
  if (score >= 60) return "Дунд түвшин";
  return "Анхаарах шаардлагатай";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

function ringColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function LegalScore({ score, variant = "default" }: LegalScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const hasData = score != null;
  const displayScore = useCountUp(score ?? 0, 900, hasData);
  const offset = circumference - (displayScore / 100) * circumference;

  const content = (
    <div className="flex flex-col items-center">
      <div className={cn("relative", variant === "inline" ? "size-32" : "size-40")}>
        <svg className="size-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-border"
          />
          {hasData && (
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={cn(
                ringColor(score!),
                "transition-[stroke-dashoffset] duration-100 ease-out",
              )}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-bold tabular-nums tracking-tight text-foreground",
              variant === "inline" ? "text-3xl" : "text-4xl",
            )}
          >
            {hasData ? displayScore : "—"}
          </span>
          <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
            ХУУЛИЙН ОНОО
          </span>
        </div>
      </div>
      <p
        className={cn(
          "mt-3 text-sm font-semibold",
          hasData ? scoreColor(score!) : "text-muted-foreground",
        )}
      >
        {hasData ? scoreLabel(score!) : "Гэрээ оруулаад шинжилгээ хийлгэнэ үү"}
      </p>
      {hasData && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Анхааруулгаас автоматаар тооцсон оноо
        </p>
      )}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="border-b border-border pb-4">{content}</div>
    );
  }

  return (
    <section className="rounded-xl bg-muted/60 px-6 py-8">
      {content}
    </section>
  );
}
