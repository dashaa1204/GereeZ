"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, ShieldCheck, TrendingUp, Upload } from "lucide-react";
import { fmt } from "../display";

export function PaymentScreen({ credits }: { credits: number }) {
  const router = useRouter();
  // Top-up is visual-only for now (not wired to a real recharge endpoint), so
  // the displayed balance is local state seeded from the real server balance.
  const [balance, setBalance] = useState(credits);
  const [selected, setSelected] = useState<number | null>(null);
  const packs = [
    { credits: 5, price: 5000, label: "Үндсэн" },
    { credits: 15, price: 12000, label: "Хэмнэлттэй", popular: true },
    { credits: 30, price: 20000, label: "Байнгын хэрэглэгч" },
  ];

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
          {packs.map((p) => (
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

      <button
        onClick={() => {
          if (selected) {
            setBalance((c) => c + selected);
            setSelected(null);
            router.back();
          }
        }}
        disabled={!selected}
        className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
          selected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        <CreditCard className="w-4 h-4" />
        {selected ? `${selected} кредит худалдан авах` : "Багцаа сонгоно уу"}
      </button>
    </div>
  );
}
