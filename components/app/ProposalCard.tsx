"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  PenLine,
  RefreshCw,
} from "lucide-react";
import {
  generateProposal,
  ProposalError,
} from "@/lib/services/proposal.client";
import { PROPOSAL_RUNS_PER_AUDIT } from "@/lib/proposal-quota";

/**
 * Turns an audit into an action: one tap generates a ready-to-send correction
 * letter to the landlord/employer, citing the exact law behind each finding.
 * A saved letter opens collapsed so it doesn't dominate the screen — tap the
 * header to expand it.
 *
 * The letter costs nothing beyond the audit, but the audit covers a fixed
 * number of rewrites (lib/proposal-quota.ts). The card says how many are left
 * before the user spends one, so "included" never turns into a surprise.
 */
export function ProposalCard({
  contractId,
  issueCount,
  initialProposal,
  runsLeft: initialRunsLeft = PROPOSAL_RUNS_PER_AUDIT,
}: {
  contractId: string;
  issueCount: number;
  /** A previously saved letter, shown immediately without regenerating. */
  initialProposal?: string | null;
  /** Generations this contract's audit still covers. */
  runsLeft?: number;
}) {
  const [proposal, setProposal] = useState<string | null>(
    initialProposal ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [runsLeft, setRunsLeft] = useState(initialRunsLeft);
  // A previously saved letter starts folded; a freshly generated one unfolds.
  const [collapsed, setCollapsed] = useState(Boolean(initialProposal));

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateProposal(contractId);
      setProposal(result.proposal);
      setRunsLeft(result.runsLeft);
      setCollapsed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Захидал үүсгэж чадсангүй");
      // The server is the authority on the allowance: a refusal that reports
      // one corrects a count this card had stale.
      if (e instanceof ProposalError && typeof e.runsLeft === "number") {
        setRunsLeft(e.runsLeft);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!proposal) return;
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; the text is still on screen to copy.
    }
  }

  // Nothing more to pay, but not endless either: the audit bought a fixed
  // number of drafts and this is the one place the user can see the tally.
  const exhausted = runsLeft === 0;

  // The letter only covers the high and medium findings, so the count says
  // which ones — a bare "12 асуудал" beside a screen reporting 16 findings
  // reads as a contradiction, and leaves the reader wondering what was dropped.
  const subtitle = !proposal
    ? `Өндөр ба дунд эрсдэлтэй ${issueCount} заалтыг хуулийн үндэслэлтэйгээр засуулах бэлэн захидлыг нэг товшилтоор үүсгэнэ. Шинжилгээний үнэд багтсан — нэмэлт кредит зарцуулагдахгүй.`
    : collapsed
      ? "Захидал бэлэн. Харахын тулд дарна уу."
      : "Захидал бэлэн.";

  const header = (
    <>
      <div className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-xl">
        <PenLine className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-bold text-foreground">Засах санал захидал</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>
      {proposal &&
        (collapsed ? (
          <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
        ))}
    </>
  );

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {proposal ? (
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          className="flex w-full items-start gap-3"
        >
          {header}
        </button>
      ) : (
        <div className="flex items-start gap-3">{header}</div>
      )}

      {!proposal && (
        <button
          onClick={generate}
          disabled={loading || exhausted}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Үүсгэж байна…
            </>
          ) : (
            <>
              <PenLine className="w-4 h-4" />
              Захидал үүсгэх
            </>
          )}
        </button>
      )}

      {!proposal && exhausted && (
        <p className="mt-3 text-[11px] text-muted-foreground/70 leading-relaxed">
          Энэ шинжилгээнд багтсан {PROPOSAL_RUNS_PER_AUDIT} захидлыг ашиглаж
          дууссан байна.
        </p>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {proposal && !collapsed && (
        <div className="mt-4 space-y-3">
          <div className="max-h-96 overflow-y-auto rounded-xl border border-border bg-muted/40 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {proposal}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Хуулагдлаа
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Хуулах
                </>
              )}
            </button>
            {!exhausted && (
              <button
                onClick={generate}
                disabled={loading}
                aria-label={`Дахин үүсгэх (${runsLeft} удаа үлдсэн)`}
                className="flex items-center justify-center gap-2 rounded-xl border border-border text-foreground px-4 py-2.5 hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            AI-аар үүсгэсэн ноорог. Илгээхээсээ өмнө хянаж, шаардлагатай бол
            засварлана уу.
          </p>
          {/* The allowance is spent by tapping regenerate, so it belongs beside
              the button — after the fact it is only bad news. */}
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            {exhausted
              ? `Шинжилгээнд багтсан ${PROPOSAL_RUNS_PER_AUDIT} захидлыг ашиглаж дууссан. Энэ захидал хадгалагдсан хэвээр байгаа тул хуулж авах боломжтой.`
              : `Дахин үүсгэх боломж: ${runsLeft} / ${PROPOSAL_RUNS_PER_AUDIT} — шинжилгээний үнэд багтсан, нэмэлт кредит зарцуулагдахгүй.`}
          </p>
        </div>
      )}
    </div>
  );
}
