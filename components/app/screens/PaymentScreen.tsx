"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, ShieldCheck, TrendingUp, Upload } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/credit-packs";
import { rechargeCredits } from "@/lib/services/credits.client";
import { fmt } from "../display";

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
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Цэнэглэхэд алдаа гарлаа");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* balance card */}
      <div className="rounded-2xl bg-primary text-primary-foreground px-5 py-6">
        <p className="text-sm opacity-70 mb-1">Одоогийн үлдэгдэл</p>
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold">{balance}</span>
          <span className="text-lg opacity-70 mb-2">кредит</span>
        </div>
        <p className="text-xs opacity-60 mt-2">1 кредит = 1 гэрээний хуудас</p>
      </div>

      {/* how it works */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Хэрхэн ажилладаг вэ?</h3>
        {[
          { icon: <Upload className="w-4 h-4 text-primary" />, text: "PDF гэрээ оруулна" },
          { icon: <TrendingUp className="w-4 h-4 text-primary" />, text: "AI хуудас тус бүрийг шинжилнэ" },
          { icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />, text: "Хуулийн зөрчлийг тайлагнана" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              {s.icon}
            </div>
            <p className="text-sm text-foreground">{s.text}</p>
          </div>
        ))}
      </div>

      {/* packs */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Кредит авах</h3>
        <div className="space-y-2.5">
          {CREDIT_PACKS.map((p) => (
            <button
              key={p.credits}
              onClick={() => setSelected(p.credits)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition-all ${
                selected === p.credits
                  ? "border-primary bg-primary/8"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === p.credits ? "border-primary" : "border-muted-foreground"
                }`}>
                  {selected === p.credits && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{p.credits} кредит</span>
                    {p.popular && (
                      <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
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
  );
}
