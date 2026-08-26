import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  Sparkles,
} from "lucide-react";
import type { ContractVM } from "@/lib/view-models";
import { ContractUploadFlow } from "../ContractUploadFlow";
import { scoreColor, scoreInk } from "../display";
import { Card, Eyebrow, Panel, PanelGlow, SectionHeading } from "../kit";

/** A faint wash of a color, for hex values and CSS vars alike. */
function tint(color: string, percent = 14) {
  return `color-mix(in oklch, ${color} ${percent}%, transparent)`;
}

/** File names carry the extension; the list does not need to repeat it. */
function contractName(label: string) {
  return label.replace(/\.(pdf|png|jpe?g)$/i, "");
}

/**
 * The one sentence under the greeting. It is the only place on the screen that
 * says what the numbers *mean*, so it reports the most urgent thing first —
 * risk, then expiry, then the quiet "everything is fine" case.
 */
function statusLine(
  activeCount: number,
  expiringSoon: number,
  highRiskCount: number,
) {
  if (activeCount === 0)
    return "Эхний гэрээгээ оруулаад хуультай тулгаж шалгуулаарай.";
  if (highRiskCount > 0)
    return `Гэрээнүүдэд ${highRiskCount} өндөр эрсдэлтэй заалт илэрсэн байна.`;
  if (expiringSoon > 0)
    return `${expiringSoon} гэрээний хугацаа удахгүй дуусах гэж байна.`;
  return `${activeCount} гэрээ хяналтад байна. Шинэ эрсдэл алга.`;
}

/**
 * One figure from the summary strip. The number stays in the page's ink unless
 * it carries a signal (a compliance score, a non-zero risk or expiry count),
 * so the row shows color only where something actually needs attention.
 *
 * `accent` colours the marks — the icon chip and the meter — and `ink` colours
 * the number. They have to be separate: a signal saturated enough to read as a
 * dot is too light to read as text. The expiry count set in `--risk-medium`
 * measured 2.62:1 on `--card`, under even the 3:1 large-text floor.
 */
function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
  accent = "var(--brand)",
  ink,
  signal = false,
  bar,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint: string;
  href?: string;
  /** Color for the icon chip and the meter. */
  accent?: string;
  /** Color for the value text when `signal`. Falls back to `accent`. */
  ink?: string;
  signal?: boolean;
  /** 0–100, drawn as a hairline meter under the value. */
  bar?: number | null;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint(accent), color: accent }}
        >
          <Icon className="size-4" />
        </span>
        <p className="text-muted-foreground truncate text-xs font-medium">
          {label}
        </p>
      </div>
      {/* The chevron is the only thing separating a card that navigates from
          one that does not, so it shows at every width — hidden below lg, the
          phone had no signal at all that three of these four cards were the way
          into a filtered list. It rides the value line rather than the label:
          beside a two-word Cyrillic label in a 161px card it cost just enough
          width to truncate "Өндөр эрсдэл", and a clipped label is a worse
          trade than a chevron sitting one line lower. */}
      <div className="mt-3.5 flex items-center gap-2">
        <p
          className="text-foreground text-[1.75rem] leading-none font-bold tracking-tight tabular-nums lg:text-[2rem]"
          style={signal ? { color: ink ?? accent } : undefined}
        >
          {value}
        </p>
        {href && (
          <ChevronRight className="text-muted-foreground/40 ml-auto size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        )}
      </div>
      {/* meter and hint sit at the bottom so the four cards line up their
          baselines even though only one of them carries a meter */}
      <div className="mt-auto pt-3">
        {bar != null && (
          <div className="bg-muted mb-2 h-1 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{ width: `${bar}%`, backgroundColor: accent }}
            />
          </div>
        )}
        <p className="text-muted-foreground truncate text-[11px] leading-tight">
          {hint}
        </p>
      </div>
    </>
  );

  const className =
    "border-border bg-card group flex flex-col rounded-2xl border p-4 lg:p-5" +
    (href ? " hover:border-brand/40 transition-colors" : "");

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Shown in place of the recent list until there is a first contract. */
const STEPS = [
  {
    title: "Гэрээгээ оруулна",
    body: "PDF эсвэл гар утсаар авсан зургаа чирээд тавина.",
  },
  {
    title: "AI хуультай тулгана",
    body: "Заалт бүрийг Иргэний хуулийн эх бичвэртэй тулгаж шалгана.",
  },
  {
    title: "Тайлангаа авна",
    body: "Нийцлийн оноо, эрсдэл, засварын саналыг нэг дор харна.",
  },
];

export function HomeScreen({
  credits,
  userName,
  activeCount,
  worst,
  expiringSoon,
  highRiskCount,
  recent,
}: {
  credits: number;
  userName: string | null;
  activeCount: number;
  /** Lowest-scoring contract that has not expired, or null before any audit. */
  worst: ContractVM | null;
  expiringSoon: number;
  highRiskCount: number;
  recent: ContractVM[];
}) {
  return (
    <div className="space-y-6 lg:space-y-7">
      {/* Greeting banner — the same near-black panel the landing page leads
          with, so entering the app is continuous with the marketing page. It
          carries the screen's primary action rather than a second copy of the
          header's credit chip: the header already states the balance, so
          repeating it here would spend the strongest surface on nothing. */}
      <Panel className="px-5 py-6 lg:px-8 lg:py-8">
        <PanelGlow className="lg:-top-32 lg:-right-24 lg:size-80" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0">
            <p className="text-brand-bright text-xs font-semibold tracking-[0.14em] uppercase">
              Сайн байна уу
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight capitalize lg:text-[2rem] lg:leading-[1.15]">
              {userName ?? "Тавтай морил"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
              {statusLine(activeCount, expiringSoon, highRiskCount)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <a
              href="#upload"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              <Sparkles className="size-4" />
              Гэрээ шинжлүүлэх
            </a>
            <Link
              href="/contracts"
              className="hidden items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors ring-inset hover:bg-white/15 lg:flex"
            >
              Бүх гэрээ
            </Link>
            {/* The header that states the balance is desktop-only, so on a
                phone this stays the way to see and top up credits. */}
            <Link
              href="/payment"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors ring-inset hover:bg-white/15 lg:hidden"
            >
              <CreditCard className="size-4 text-white/70" />
              <span className="tabular-nums">{credits}</span> кредит
            </Link>
          </div>
        </div>
      </Panel>

      {/* Summary strip. Two-up on a phone, four across once there is room —
          the numbers get to be large either way, which the old three-column
          row could not manage inside the narrow right column.

          Ordered by urgency, not by narrative. The screen exists to answer
          "does anything need me right now", and the two cards that can answer
          yes are the risk and expiry counts — so they take the first reading
          positions. The portfolio count is context and reads last. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={AlertTriangle}
          label="Өндөр эрсдэл"
          value={highRiskCount}
          hint={
            highRiskCount > 0 ? "Яаралтай засах заалт" : "Илэрсэн зөрчил алга"
          }
          accent={
            highRiskCount > 0 ? "var(--risk-high)" : "var(--muted-foreground)"
          }
          ink={
            highRiskCount > 0
              ? "var(--risk-high-ink)"
              : "var(--muted-foreground)"
          }
          signal={highRiskCount > 0}
          href={highRiskCount > 0 ? "/contracts?filter=high-risk" : "/contracts"}
        />
        <StatCard
          icon={CalendarClock}
          label="Удахгүй дуусна"
          value={expiringSoon}
          hint={
            expiringSoon > 0
              ? "30 хоногт дуусах гэрээ"
              : "Ойрын хугацаанд дуусахгүй"
          }
          accent={
            expiringSoon > 0 ? "var(--risk-medium)" : "var(--muted-foreground)"
          }
          ink={
            expiringSoon > 0
              ? "var(--risk-medium-ink)"
              : "var(--muted-foreground)"
          }
          signal={expiringSoon > 0}
          href={expiringSoon > 0 ? "/contracts?filter=expiring" : "/contracts"}
        />
        {/* Names the one contract to open next. The three cards around it give
            totals and scale; none of them says *which*, and that is the only
            thing the reader cannot get from the rest of the strip.

            "Хамгийн эрсдэлтэй" measured 114px against 96px of label room at
            375px and clipped. The score and the contract name sit right under
            this word, so the short form loses nothing. */}
        <StatCard
          icon={Gauge}
          label="Хамгийн муу"
          value={worst?.score ?? "—"}
          hint={worst ? contractName(worst.label) : "Аудит хийгдээгүй байна"}
          accent={
            worst ? scoreColor(worst.score!) : "var(--muted-foreground)"
          }
          ink={worst ? scoreInk(worst.score!) : "var(--muted-foreground)"}
          signal={worst != null}
          bar={worst?.score ?? null}
          href={worst ? `/contracts/${worst.id}` : undefined}
        />
        {/* The hint says what is being counted rather than restating the
            label. "Хяналтад байгаа гэрээ" under "Идэвхтэй гэрээ" was the same
            sentence twice, and it hid the reason this number can sit below the
            count on the contracts list: only audited contracts are in it. */}
        <StatCard
          icon={FileText}
          label="Идэвхтэй гэрээ"
          value={activeCount}
          hint="Шинжилгээ дууссан"
          href="/contracts"
        />
      </div>

      {/* Uploading is the primary job, so it takes the wider column and sits
          inside a card of its own instead of floating as loose controls. */}
      {/* The single mobile column needs `minmax(0,1fr)` just as much as the
          desktop pair does. Left implicit it took an `auto` minimum, so the
          upload card's min-content — its padding plus the drop zone — held the
          track at 498px inside a 343px container and pushed the whole page into
          a horizontal scroll at 375px. */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <section id="upload" className="scroll-mt-24">
          <Card className="p-5 lg:p-6">
            <SectionHeading
              eyebrow="Шинэ гэрээ"
              title="Гэрээ шинжлүүлэх"
              description="PDF эсвэл зурган гэрээгээ оруулахад хуудас тус бүрийг хуультай тулгаж шалгана."
            />
            <div className="mt-5 space-y-3">
              <ContractUploadFlow />
            </div>
          </Card>
        </section>

        <div className="space-y-4">
          {recent.length > 0 && (
            <Card className="overflow-hidden p-0">
              <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-3.5">
                <Eyebrow>Сүүлийн гэрээ</Eyebrow>
                <Link
                  href="/contracts"
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                >
                  Бүгд
                </Link>
              </div>
              <ul className="divide-border divide-y">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/contracts/${c.id}`}
                      className="group hover:bg-muted/40 flex items-center gap-3 px-5 py-3.5 transition-colors"
                    >
                      <span className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <FileText className="text-muted-foreground size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate text-sm font-semibold">
                          {contractName(c.label)}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {[c.typeLabel, `Дуусах: ${c.endDate}`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {c.score != null ? (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums"
                          style={{
                            // Tint from the signal, text in the ink — the two
                            // roles the severity scale already separates.
                            backgroundColor: tint(scoreColor(c.score)),
                            color: scoreInk(c.score),
                          }}
                        >
                          {c.score}
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                          Хүлээгдэж буй
                        </span>
                      )}
                      <ChevronRight className="text-muted-foreground/40 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Standing explainer: it is the whole column until there is a first
              contract, and the column's second card afterwards. */}
          <Card className="p-5">
            <Eyebrow className="mb-4">Хэрхэн ажилладаг</Eyebrow>
            <ol className="space-y-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="bg-brand/10 text-brand flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground text-sm font-semibold">
                      {step.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

