"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { rechargeCredits } from "@/lib/services/credits.client";
import { triggerHaptic } from "@/lib/hooks/useHaptic";

/** Credit balance strip with a demo top-up button. Mirrors the upload gate's
 *  recharge mechanism so the contracts view can refill without leaving. */
export function CreditBalanceBar({ credits }: { credits: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(credits);
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    setLoading(true);
    try {
      const next = await rechargeCredits();
      setBalance(next);
      triggerHaptic("success");
      router.refresh();
    } catch {
      // Leave the balance unchanged; the button re-enables for a retry.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-navy/10">
          <CreditCard className="size-4 text-navy" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Кредит үлдэгдэл</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {balance}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleTopUp}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Нэмэх
      </button>
    </div>
  );
}
