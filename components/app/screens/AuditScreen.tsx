"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  FileText,
  Loader2,
  RotateCw,
  Scale,
  Sparkles,
  User,
} from "lucide-react";
import { auditRunMode } from "@/lib/audit-run";
import type { AuditFinding, ContractVM } from "@/lib/view-models";
import type { LegalArticle } from "@/lib/legal-articles";
import { auditContract } from "@/lib/services/contracts.client";
import { fetchLegalArticle } from "@/lib/services/legal.client";
import { fmt, scoreLabel } from "../display";
import { ProposalCard } from "../ProposalCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Stock shadcn build of the audit result. Every surface here is an unmodified
 * component from `components/ui` — Card, Tabs, Accordion, Badge, Progress,
 * Separator — with no bespoke shadows, rails or panels layered on top. The
 * severity signal is carried by the badge variant and its label rather than by
 * a colored rail.
 */
export function AuditScreen({ contract }: { contract: ContractVM }) {
  const findings = contract.findings;
  const strengths = contract.strengths;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;
  // Everything the two headline severities don't cover. The tally has to add
  // up to the count on the Эрсдэл tab or the two contradict each other, and a
  // reader who does the arithmetic is left wondering what got hidden.
  const lowCount = findings.length - highCount - medCount;

  // Findings, grouped so the severity can be stated once per group instead of
  // repeated on every row. Empty groups are dropped rather than rendered as a
  // heading with nothing under it.
  const findingGroups = (["high", "medium", "low", "info"] as const)
    .map((severity) => ({
      severity,
      items: findings.filter((f) => f.severity === severity),
    }))
    .filter((group) => group.items.length > 0);

  // Fields the extractor could not find are dropped rather than rendered as a
  // dash — an absent row reads as "not in the contract" just as clearly.
  const metaRows = [
    { icon: User, label: contract.tenantLabel, value: contract.tenant },
    { icon: Building2, label: contract.landlordLabel, value: contract.landlord },
    { icon: Banknote, label: contract.rentLabel, value: contract.rent != null ? fmt(contract.rent) : null },
    { icon: CreditCard, label: "Барьцаа", value: contract.deposit != null ? fmt(contract.deposit) : null },
    { icon: Calendar, label: "Эхлэх огноо", value: contract.startDate },
    { icon: Calendar, label: "Дуусах огноо", value: contract.endDate },
    { icon: Clock, label: "Төлбөрийн өдөр", value: contract.payDay != null ? `Сарын ${contract.payDay}-нд` : null },
  ].filter((row) => row.value != null && row.value !== "—");

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-6 lg:space-y-0 lg:items-start">
      <div className="space-y-6 lg:sticky lg:top-24">
        <Card>
          {/* The contract's name identifies the page and so leads the card.
              It used to sit below the score as muted body text, which left the
              top bar ("Аудит дүн") as the only page identity — arriving here
              from a notification, you could not tell which contract this was
              without hunting. The verdict stays the loudest thing on screen:
              it is the answer the reader came for. */}
          <CardHeader>
            <CardDescription className="break-words">
              {contract.label}
            </CardDescription>
            {/* The verdict, or — when there isn't one — which kind of "no
                verdict" this is: an audit that has not been run yet, and one
                that ran and failed, need different things from the reader. */}
            <CardTitle className="text-2xl">
              {contract.score != null
                ? scoreLabel(contract.score)
                : contract.status === "failed"
                  ? "Шинжилгээ амжилтгүй боллоо"
                  : "Аудит хийгдээгүй"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract.score != null && (
              <div className="space-y-2">
                {/* "/ 100" has to touch the number. Pushed to the far edge by
                    justify-between it sat ~300px away, so the eye read a bare
                    "4" — indistinguishable from the finding counts below it,
                    and with no clue whether 4 is good or bad. */}
                <p className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tabular-nums">
                    {contract.score}
                  </span>
                  <span className="text-muted-foreground text-sm">/ 100</span>
                  <span className="text-muted-foreground ml-1 text-sm">
                    нийцлийн оноо
                  </span>
                </p>
                {/* The bar is `role="progressbar"`, so without a name a screen
                    reader announces a bare number with no subject. And the
                    default value text is a percentage — this is a score out of
                    100 points, not 46% of anything. */}
                <Progress
                  value={contract.score}
                  aria-label="Нийцлийн оноо"
                  getAriaValueText={(_, v) => `100-аас ${v ?? 0} оноо`}
                />
              </div>
            )}

            {/* Offering "run the audit" while one is running invited a second
                run: two AI bills against one charge, and whichever finished
                last overwrote the other. The server refuses that now; this is
                the same answer, before the user spends a click on it. */}
            {contract.status === "running" ? (
              <AuditRunning />
            ) : (
              <RunAudit contract={contract} />
            )}

            {contract.typeLabel && (
              <Badge variant="secondary">{contract.typeLabel}</Badge>
            )}

            <Separator />

            {/* Severity breakdown of the findings, and only that — the three
                numbers have to sum to the Эрсдэл tab's count. "Давуу тал" used
                to sit in this row styled identically to two risk counts, which
                read as a third severity and left the sum four short. It has
                its own tab; it does not belong in a risk tally. */}
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Tally n={highCount} label="Өндөр" />
              <Tally n={medCount} label="Дунд" />
              <Tally n={lowCount} label="Бага" />
            </dl>

            {/* The document every finding above is about. The bucket is
                private, so this route is the only way back to it — and a
                reader who wants to check a quoted clause against the contract
                had, until now, nowhere to go. Rows with no stored file (seeded
                ones, and anything from before the bucket) get no link rather
                than one that can only fail. */}
            {contract.hasFile && (
              <>
                <Separator />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <a
                    href={`/api/contracts/${contract.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                  >
                    <FileText className="size-3.5" />
                    Эх файлыг харах
                  </a>
                  <a
                    href={`/api/contracts/${contract.id}/file?download=1`}
                    className="text-muted-foreground inline-flex items-center gap-1.5 text-xs hover:underline"
                  >
                    <Download className="size-3.5" />
                    Татах
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Turn the audit into an action: a ready-to-send correction letter. */}
        {highCount + medCount > 0 && (
          <ProposalCard
            contractId={contract.id}
            issueCount={highCount + medCount}
            initialProposal={contract.proposal}
            runsLeft={contract.proposalRunsLeft}
          />
        )}
      </div>

      <Tabs defaultValue="findings">
        <TabsList variant="line">
          <TabsTrigger value="findings">
            Эрсдэл
            <span className="text-muted-foreground tabular-nums">
              {findings.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="strengths">
            Давуу тал
            <span className="text-muted-foreground tabular-nums">
              {strengths.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="meta">
            Мэдээлэл
            <span className="text-muted-foreground tabular-nums">
              {metaRows.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings" className="space-y-5">
          {findingGroups.length > 0 ? (
            findingGroups.map((group) => (
              <section key={group.severity} className="space-y-2">
                {/* The severity is stated once, for the whole group, instead of
                    on all sixteen rows. Six identical red pills stacked down a
                    list carry no information — they only differ where the group
                    changes, so that is the one place worth marking. */}
                <h3 className="flex items-baseline gap-2 px-1 text-sm font-semibold">
                  <span className={group.severity === "high" ? "text-destructive" : undefined}>
                    {severityBadge(group.severity).label}
                  </span>
                  <span className="text-muted-foreground font-normal tabular-nums">
                    {group.items.length}
                  </span>
                </h3>
                <Card className="py-0">
                  <Accordion className="px-4">
                    {group.items.map((f) => (
                      <FindingItem key={f.id} f={f} />
                    ))}
                  </Accordion>
                </Card>
              </section>
            ))
          ) : (
            <Empty>Эрсдэлтэй заалт илрээгүй.</Empty>
          )}
        </TabsContent>

        <TabsContent value="strengths">
          {strengths.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {strengths.map((s, i) => (
                <Card key={i} size="sm">
                  <CardContent className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="leading-relaxed">{s}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty>Тэмдэглэхүйц давуу тал олдсонгүй.</Empty>
          )}
        </TabsContent>

        <TabsContent value="meta">
          {metaRows.length > 0 ? (
            <Card className="py-0">
              <dl>
                {metaRows.map((row, i) => (
                  <div key={i}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <row.icon className="size-4 shrink-0 text-muted-foreground" />
                      <dt className="flex-1 text-muted-foreground">{row.label}</dt>
                      <dd className="font-medium">{row.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </Card>
          ) : (
            <Empty>Гэрээнээс мэдээлэл салгаж чадсангүй.</Empty>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Findings arrive as "4.2-р заалт — Барьцаа буцаан олгохгүй байх нөхцөл": a
 * short clause reference, an em dash, then the plain-language title. The
 * length guard keeps a title that merely happens to contain a dash from being
 * mistaken for a reference.
 */
function splitClause(clause: string) {
  const i = clause.indexOf("—");
  const ref = i > 0 ? clause.slice(0, i).trim() : "";
  const title = i > 0 ? clause.slice(i + 1).trim() : "";
  if (!title || ref.length > 28) return { ref: null, title: clause };
  return { ref, title };
}

/** Stock badge variants only — "high" is the one severity that gets colour. */
function severityBadge(s: AuditFinding["severity"]) {
  switch (s) {
    case "high":
      return { variant: "destructive" as const, label: "Өндөр эрсдэл" };
    case "medium":
      return { variant: "secondary" as const, label: "Дунд эрсдэл" };
    case "low":
      return { variant: "outline" as const, label: "Бага эрсдэл" };
    case "info":
      return { variant: "outline" as const, label: "Мэдээлэл" };
  }
}

/**
 * One finding as an accordion row. Keeps the statute lookup from the previous
 * build — tapping the citation fetches the actual article text, which is the
 * proof a plain chatbot cannot show.
 */
function FindingItem({ f }: { f: AuditFinding }) {
  const { ref, title } = splitClause(f.clause);

  const canOpenLaw =
    f.lawName != null && f.articleRef != null && /\d/.test(f.articleRef);

  // undefined = not fetched yet, null = fetched but not found.
  const [lawOpen, setLawOpen] = useState(false);
  const [law, setLaw] = useState<LegalArticle | null>();
  const [lawLoading, setLawLoading] = useState(false);
  const [lawError, setLawError] = useState<string | null>(null);

  // Opening the statute has to be undoable — the text runs long, and a panel
  // that only ever opens buries the rest of the finding under it. Fetch once,
  // then the toggle is free.
  async function toggleLaw() {
    const next = !lawOpen;
    setLawOpen(next);
    if (!next || law !== undefined || lawLoading) return;
    setLawLoading(true);
    setLawError(null);
    try {
      setLaw(await fetchLegalArticle(f.lawName!, f.articleRef!));
    } catch (e) {
      setLawError(e instanceof Error ? e.message : "Татаж чадсангүй");
    } finally {
      setLawLoading(false);
    }
  }

  return (
    <AccordionItem value={String(f.id)}>
      <AccordionTrigger className="gap-3 no-underline hover:no-underline">
        <div className="flex flex-1 flex-col items-start gap-1">
          {/* The severity badge moved to the group heading. What's left is the
              clause reference — the one thing that differs row to row and the
              thing a reader cross-references against their own document. */}
          {ref && <span className="text-muted-foreground text-xs">{ref}</span>}
          <span className="font-medium">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <p className="leading-relaxed">{f.explanation}</p>

        <Card size="sm" className="bg-muted/40">
          <CardContent>
            <button
              onClick={canOpenLaw ? toggleLaw : undefined}
              disabled={!canOpenLaw}
              aria-expanded={canOpenLaw ? lawOpen : undefined}
              className="flex w-full items-center gap-2 text-left disabled:cursor-default"
            >
              <Scale className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-medium">{f.article}</span>
              {lawLoading ? (
                <Loader2 className="size-4 shrink-0 animate-spin" />
              ) : (
                canOpenLaw && (
                  <>
                    <span className="text-xs text-muted-foreground">
                      Эх бичвэр
                    </span>
                    <ChevronDown
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                        lawOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                )
              )}
            </button>

            {lawOpen && lawError && (
              <p className="mt-2 text-xs text-destructive">{lawError}</p>
            )}
            {lawOpen && law && (
              <div className="mt-3 space-y-1.5">
                {law.sectionTitle && (
                  <p className="text-xs font-semibold">{law.sectionTitle}</p>
                )}
                <p className="max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  {law.content}
                </p>
                <p className="pt-1 text-xs text-muted-foreground">
                  Эх сурвалж: {law.lawName}
                </p>
              </div>
            )}
            {lawOpen && law === null && !lawLoading && (
              <p className="mt-2 text-xs text-muted-foreground">
                Энэ зүйлийн эх бичвэр мэдлэгийн санд олдсонгүй.
              </p>
            )}
          </CardContent>
        </Card>

        {f.confidenceLevel && (
          <p className="text-xs text-muted-foreground">
            AI-н итгэл:{" "}
            {f.confidenceLevel === "high"
              ? "Өндөр"
              : f.confidenceLevel === "medium"
                ? "Дунд"
                : "Бага"}
          </p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * An audit already under way — started in another tab, or here before a reload.
 * There is nothing to press: the work finishes on its own, and the page has no
 * live connection to it, so the honest offer is to look again.
 */
function AuditRunning() {
  const router = useRouter();
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="text-brand size-4 animate-spin" />
        Шинжилгээ хийгдэж байна…
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="text-brand text-xs font-medium hover:underline"
      >
        Дүнг шалгах
      </button>
    </div>
  );
}

/**
 * The way back from a failed or never-run audit — and, on a finished one, the
 * way to run it again. Without the first, a contract whose audit errored is a
 * dead end: the file is stored, the credits were refunded, and the only path
 * forward was to upload the same document again. Without the second, the
 * law-update alert invites a re-check onto a page with no way to do it.
 *
 * A re-run is a second audit at full price, so it asks twice — the same
 * confirm the delete row uses. A retry costs nothing beyond what was already
 * refunded, so it does not.
 */
function RunAudit({ contract }: { contract: ContractVM }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mode = auditRunMode(contract);
  const cost =
    contract.pages != null ? `${contract.pages} кредит зарцуулна.` : null;
  const hint = {
    // A retry already knows credits come back — it just got them — so it
    // spends its second sentence on the price instead of repeating the promise.
    retry: ["Өмнөх оролдлогын кредит буцаагдсан.", cost],
    fresh: [cost, "Амжилтгүй бол кредит буцаана."],
    // Nothing was refunded here: the audit on screen was delivered and paid
    // for. Saying so is the difference between a price and a surprise.
    rerun: [
      "Энэ нь шинэ шинжилгээ — өмнөх дүн хадгалагдсан хэвээр.",
      cost ?? "Хуудас тутамд кредит дахин зарцуулна.",
    ],
  }[mode]
    .filter(Boolean)
    .join(" ");

  async function run() {
    if (mode === "rerun" && !confirming) {
      setConfirming(true);
      return;
    }
    setRunning(true);
    setError(null);
    try {
      await auditContract(contract.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Шинжилгээ амжилтгүй боллоо");
    } finally {
      setRunning(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
          mode === "rerun" && !confirming
            ? "border border-border text-foreground hover:bg-muted"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {running ? (
          <Loader2 className="size-4 animate-spin" />
        ) : mode === "fresh" ? (
          <Sparkles className="size-4" />
        ) : (
          <RotateCw className="size-4" />
        )}
        {running
          ? "Шинжилж байна…"
          : mode === "fresh"
            ? "Шинжилгээг ажиллуулах"
            : mode === "retry"
              ? "Дахин шинжлэх"
              : confirming
                ? `Дахин дарж баталгаажуулна уу${cost ? ` — ${contract.pages} кредит` : ""}`
                : "Дахин шинжлүүлэх"}
      </button>
      {/* Two sentences at most, and they have to differ: what the run costs
          the user is not the same in all three cases. */}
      <p className="text-muted-foreground text-xs">{hint}</p>
      {error && (
        <p className="text-destructive flex items-start gap-1.5 text-xs">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function Tally({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{n}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
