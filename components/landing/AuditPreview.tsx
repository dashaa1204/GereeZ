import { AlertTriangle, CheckCircle2, FileText, XCircle } from "lucide-react";

/**
 * A static mock of a finished audit, used as the hero's product shot. It is
 * deliberately hand-built rather than composed from the real audit components:
 * those need a signed-in session and live data, and this only has to read as
 * the product at a glance. The numbers are illustrative sample content.
 */

const findings = [
  {
    tone: "high" as const,
    icon: XCircle,
    title: "Барьцааг ямар ч тохиолдолд буцаахгүй",
    law: "Иргэний хууль 291.2",
    note: "Хууль зөрчсөн нэг талын нөхцөл.",
  },
  {
    tone: "medium" as const,
    icon: AlertTriangle,
    title: "Түрээсийн төлбөрийг дур мэдэн нэмэгдүүлж болно",
    law: "Иргэний хууль 289.1",
    note: "Нэмэгдүүлэх хязгаар, мэдэгдэх хугацаа заагаагүй.",
  },
  {
    tone: "ok" as const,
    icon: CheckCircle2,
    title: "Цуцлахаас 30 хоногийн өмнө мэдэгдэнэ",
    law: "Таны талд",
    note: "Хуулийн шаардлагад нийцсэн заалт.",
  },
];

const toneStyles = {
  high: {
    row: "border-red-200/80 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30",
    icon: "text-red-500",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  medium: {
    row: "border-amber-200/80 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30",
    icon: "text-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  ok: {
    row: "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30",
    icon: "text-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
};

const SCORE = 68;

function ScorePreviewRing({ score }: { score: number }) {
  const size = 108;
  const stroke = 9;
  const r = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-zinc-200 dark:stroke-zinc-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-amber-500"
          strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-tight text-amber-500">
          {score}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          / 100
        </span>
      </div>
    </div>
  );
}

export function AuditPreview() {
  return (
    <div className="rounded-2xl border border-black/5 bg-card p-4 shadow-2xl shadow-black/25 sm:p-5 dark:border-white/10">
      {/* file header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FileText className="size-5 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            Түрээсийн гэрээ — 2026.pdf
          </p>
          <p className="text-xs text-muted-foreground">
            4 хуудас · шинжилгээ дууссан
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 sm:inline dark:text-emerald-400">
          Бэлэн
        </span>
      </div>

      {/* score */}
      <div className="flex items-center gap-4 py-5 sm:gap-5">
        <ScorePreviewRing score={SCORE} />
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Нийцлийн оноо
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            Болгоомжтой хандах
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            2 эрсдэлтэй заалт олдлоо. Гарын үсэг зурахаасаа өмнө засуулахыг
            зөвлөж байна.
          </p>
        </div>
      </div>

      {/* findings */}
      <div className="space-y-2">
        {findings.map((f) => {
          const style = toneStyles[f.tone];
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className={`flex items-start gap-3 rounded-xl border p-3 ${style.row}`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${style.icon}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug font-semibold text-foreground">
                  {f.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {f.note}
                </p>
              </div>
              <span
                className={`hidden shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap sm:inline ${style.chip}`}
              >
                {f.law}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
