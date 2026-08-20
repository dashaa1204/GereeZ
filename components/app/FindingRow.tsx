"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Scale } from "lucide-react";
import type { AuditFinding } from "@/lib/view-models";
import type { LegalArticle } from "@/lib/legal-articles";
import { fetchLegalArticle } from "@/lib/services/legal.client";
import { confidenceConfig, severityConfig } from "./display";

export function FindingRow({ f }: { f: AuditFinding }) {
  const [open, setOpen] = useState(false);
  const cfg = severityConfig(f.severity);
  const conf = f.confidenceLevel ? confidenceConfig(f.confidenceLevel) : null;

  // The citation is tappable only when we have a law name and an article number
  // we can actually look up in the legal knowledge base.
  const canOpenLaw =
    f.lawName != null && f.articleRef != null && /\d/.test(f.articleRef);

  const [lawOpen, setLawOpen] = useState(false);
  // undefined = not fetched yet, null = fetched but not found.
  const [law, setLaw] = useState<LegalArticle | null>();
  const [lawLoading, setLawLoading] = useState(false);
  const [lawError, setLawError] = useState<string | null>(null);

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
    <div
      className={`rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden transition-all`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
      >
        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{f.clause}</p>
          <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <div className="shrink-0 text-muted-foreground mt-0.5">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-inherit">
          <div className="mt-3 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{f.explanation}</p>

            {/* Law citation — tap to reveal the actual statute text, the proof
                a plain chatbot can't show. */}
            <div className="rounded-lg border border-border/60 bg-card/60 overflow-hidden">
              <button
                onClick={canOpenLaw ? toggleLaw : undefined}
                disabled={!canOpenLaw}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
                  canOpenLaw ? "hover:bg-muted/50" : "cursor-default"
                }`}
              >
                <Scale className="text-brand size-3.5 shrink-0" />
                <span className="flex-1 min-w-0 text-xs font-medium text-foreground">
                  {f.article}
                </span>
                {canOpenLaw &&
                  (lawLoading ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground" />
                  ) : lawOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  ))}
              </button>

              {canOpenLaw && lawOpen && !lawLoading && (
                <div className="px-3 pb-3">
                  {lawError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{lawError}</p>
                  ) : law ? (
                    <div className="space-y-1.5">
                      {law.sectionTitle && (
                        <p className="text-xs font-semibold text-foreground">{law.sectionTitle}</p>
                      )}
                      <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                        {law.content}
                      </p>
                      <p className="pt-1 text-[10px] text-muted-foreground/70">
                        Эх сурвалж: {law.lawName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Энэ зүйлийн эх бичвэр мэдлэгийн санд олдсонгүй.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* AI confidence — an honest three-level badge, not a fake percentage. */}
            {conf && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">AI-н итгэл:</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${conf.cls}`}>
                  {conf.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
