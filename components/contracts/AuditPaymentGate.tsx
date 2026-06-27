"use client";

import { AlertTriangle, BrainCircuit, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditQuote } from "@/lib/services/contracts.client";
import { cn } from "@/lib/utils";

interface AuditPaymentGateProps {
  quote: AuditQuote;
  /** Confirm and pay → run the audit. */
  onConfirm: () => void;
  /** Demo top-up when the balance is short. */
  onRecharge: () => void;
  /** True while a recharge request is in flight. */
  recharging?: boolean;
  /** True while the audit is running after confirm (disables the button). */
  confirming?: boolean;
}

/**
 * The pay-before-audit gate: shows page count, credit cost, and the user's
 * balance, then either a confirm-and-pay button or a demo recharge button when
 * the balance is short. Shared by the upload flow and the contract list so both
 * present the cost the same way.
 */
export function AuditPaymentGate({
  quote,
  onConfirm,
  onRecharge,
  recharging = false,
  confirming = false,
}: AuditPaymentGateProps) {
  return (
    <div className="rounded-lg border border-navy/20 bg-navy/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-navy">
        <Coins className="size-4" />
        Шинжилгээний төлбөр
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Хуудасны тоо</dt>
          <dd className="font-medium">{quote.pageCount}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Шинжилгээний үнэ</dt>
          <dd className="font-medium">{quote.cost} кредит</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <dt className="text-muted-foreground">Таны баланс</dt>
          <dd
            className={cn(
              "font-semibold",
              quote.sufficient ? "text-foreground" : "text-destructive",
            )}
          >
            {quote.balance} кредит
          </dd>
        </div>
      </dl>

      {quote.sufficient ? (
        <Button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="mt-4 h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
        >
          {confirming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BrainCircuit className="size-4" />
          )}
          {confirming
            ? "Шинжилж байна…"
            : `Баталгаажуулж, шинжлэх (${quote.cost} кредит)`}
        </Button>
      ) : (
        <>
          <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            Кредит хүрэлцэхгүй байна. Доорх товчоор үнэгүй цэнэглэнэ үү (demo).
          </p>
          <Button
            type="button"
            onClick={onRecharge}
            disabled={recharging}
            className="mt-3 h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
          >
            {recharging ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Coins className="size-4" />
            )}
            Кредит цэнэглэх
          </Button>
        </>
      )}
    </div>
  );
}
