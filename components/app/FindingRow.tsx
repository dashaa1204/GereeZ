"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { FigmaFinding } from "@/lib/figma-data";
import { severityConfig } from "./display";

export function FindingRow({ f }: { f: FigmaFinding }) {
  const [open, setOpen] = useState(false);
  const cfg = severityConfig(f.severity);

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
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <FileText className="w-3.5 h-3.5" />
              <span>{f.article}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{f.explanation}</p>
            <div className="flex items-center gap-2 pt-1">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${f.confidence}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                AI найдвар: {f.confidence}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
