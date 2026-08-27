"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck, TrendingUp, Upload } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/credit-packs";
import { DASHBOARD_PATH } from "@/lib/routes";
import { rechargeCredits } from "@/lib/services/credits.client";
import { fmt } from "../display";
import { Eyebrow, IconChip, Panel, PanelGlow } from "../kit";

export function PaymentScreen({ credits }: { credits: number }) {
  const router = useRouter();
  const [balance, setBalance] = useState(credits);
  const [selected, setSelected] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    if (!selected || buying) return;
    setBuying(true);
    setError(null);
    try {
      const newBalance = await rechargeCredits(selected);
      setBalance(newBalance);
      setSelected(null);
      // Other screens (home hero, contracts list) show the balance too.
      router.refresh();
      // Not router.back(): the low-credit alert links straight here, so "back"
      // can be whatever the browser was showing before the app — or nothing.
      router.push(DASHBOARD_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Цэнэглэхэд алдаа гарлаа");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="space-y-5 lg:grid lg:max-w-4xl lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:items-start">
      <div className="space-y-5">
      {/* balance card */}
      <Panel className="px-5 py-6">
        <PanelGlow />
        <div className="relative">
          <p className="mb-1 text-sm text-white/60">Одоогийн үлдэгдэл</p>
          <div className="flex items-end gap-1.5">
            <span className="text-5xl font-bold tracking-tight text-white">{balance}</span>
            <span className="mb-2 text-lg text-white/70">кредит</span>
          </div>
          <p className="mt-2 text-xs text-white/50">1 кредит = 1 гэрээний хуудас</p>
        </div>
      </Panel>

      {/* how it works */}
      <div className="space-y-3.5 rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Хэрхэн ажилладаг вэ?</h3>
        {[
          { icon: Upload, text: "PDF гэрээ оруулна" },
          { icon: TrendingUp, text: "AI хуудас тус бүрийг шинжилнэ" },
          { icon: ShieldCheck, text: "Хуулийн зөрчлийг тайлагнана" },
        ].map((step) => (
          <div key={step.text} className="flex items-center gap-3">
            <IconChip icon={step.icon} className="size-9 rounded-xl" />
            <p className="text-sm text-foreground">{step.text}</p>
          </div>
        ))}
      </div>
      </div>

      <div className="space-y-5">
      {/* packs */}
      <div>
        <Eyebrow className="mb-3">Кредит авах</Eyebrow>
        <div className="space-y-2.5">
          {CREDIT_PACKS.map((p) => (
            <button
              key={p.credits}
              onClick={() => setSelected(p.credits)}
              className={`flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3.5 transition-all ${
                selected === p.credits
                  ? "border-brand bg-brand/8"
                  : "border-border bg-card hover:border-brand/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === p.credits ? "border-brand" : "border-muted-foreground"
                }`}>
                  {selected === p.credits && (
                    <div className="bg-brand size-2.5 rounded-full" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.credits} кредит</span>
                    {p.popular && (
                      <span className="bg-brand/12 text-brand rounded-full px-2 py-0.5 text-xs font-semibold">
                        Алдартай
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{p.label}</span>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">{fmt(p.price)}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
      )}

      {/* No payment provider is wired up yet — top-ups are free, so say so
          instead of letting the price labels imply a real charge. */}
      <p className="text-xs text-muted-foreground text-center">
        Туршилтын хувилбар: төлбөр төлөгдөхгүй, кредит үнэгүй нэмэгдэнэ.
      </p>

      <button
        onClick={buy}
        disabled={!selected || buying}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          selected && !buying
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {buying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CreditCard className="w-4 h-4" />
        )}
        {buying
          ? "Цэнэглэж байна…"
          : selected
            ? `${selected} кредит худалдан авах`
            : "Багцаа сонгоно уу"}
      </button>
      </div>
    </div>
  );
}
