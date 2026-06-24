interface LegalScoreProps {
  score: number | null;
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

export function LegalScore({ score }: LegalScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const displayScore = score ?? 0;
  const offset = circumference - (displayScore / 100) * circumference;
  const hasData = score != null;

  return (
    <section className="rounded-xl bg-muted/60 px-6 py-8">
      <div className="flex flex-col items-center">
        <div className="relative size-40">
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
                className={`${ringColor(score)} transition-all duration-700`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">
              {hasData ? score : "—"}
            </span>
            <span className="text-[10px] font-semibold tracking-widest text-muted-foreground">
              ХУУЛИЙН ОНОО
            </span>
          </div>
        </div>
        <p
          className={`mt-3 text-sm font-semibold ${hasData ? scoreColor(score) : "text-muted-foreground"}`}
        >
          {hasData ? scoreLabel(score) : "Гэрээ оруулаад шинжилгээ хийлгэнэ үү"}
        </p>
      </div>
    </section>
  );
}
