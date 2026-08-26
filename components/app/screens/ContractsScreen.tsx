"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  FileText,
  Loader2,
  Lock,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import {
  CONTRACT_FILTERS,
  FILTER_EMPTY_HINT,
  matchesFilter,
  type ContractFilter,
} from "@/lib/contract-filters";
import { deleteContract } from "@/lib/services/contracts.client";
import type { ContractVM } from "@/lib/view-models";
import { fmt, scoreColor, scoreInk } from "../display";
import { Eyebrow, Panel, PanelGlow } from "../kit";

export function ContractsScreen({
  contracts,
  credits,
  filter = "all",
}: {
  contracts: ContractVM[];
  credits: number;
  filter?: ContractFilter;
}) {
  const router = useRouter();
  const visible = contracts.filter((c) => matchesFilter(c, filter));
  const onPayment = () => router.push("/payment");
  // Two-tap delete: first tap arms the confirm state, second tap deletes.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setDeleteError(null);
      return;
    }
    setDeletingId(id);
    try {
      await deleteContract(id);
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Устгахад алдаа гарлаа");
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  };

  const deleteButton = (id: string) => (
    <button
      onClick={() => onDelete(id)}
      disabled={deletingId === id}
      aria-label="Гэрээ устгах"
      className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
        confirmingId === id
          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          : "text-muted-foreground hover:text-red-500"
      }`}
    >
      {deletingId === id ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      {confirmingId === id && deletingId !== id && "Устгах уу?"}
    </button>
  );

  const statusCfg = (s: ContractVM["status"]) => {
    if (s === "compliant") return { label: "Нийцтэй", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40", dot: "bg-emerald-500" };
    if (s === "warning") return { label: "Анхаарах", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40", dot: "bg-amber-500" };
    if (s === "pending") return { label: "Хүлээгдэж буй", color: "text-muted-foreground bg-muted", dot: "bg-muted-foreground" };
    // Failed and risky are both red because both want the user, but the two
    // labels have to stay apart: one contract was measured and found wanting,
    // the other was never measured at all.
    if (s === "failed") return { label: "Амжилтгүй", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40", dot: "bg-red-500" };
    return { label: "Эрсдэлтэй", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40", dot: "bg-red-500" };
  };

  // The identity block every card shape starts with: name, kind, expiry, the
  // status pill and the delete control.
  const cardHeader = (c: ContractVM) => {
    const cfg = statusCfg(c.status);
    return (
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">{c.label}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {c.typeLabel && (
              <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                {c.typeLabel}
              </span>
            )}
            <span className="text-xs text-muted-foreground">Дуусах: {c.endDate}</span>
          </div>
        </div>
        <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </div>
        {deleteButton(c.id)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* credit balance — the sidebar already shows it from lg up */}
      <Panel className="px-4 py-3.5 lg:hidden">
        <PanelGlow className="-top-14 -right-8 size-36" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
              <CreditCard className="size-4 text-white" />
            </span>
            <div>
              <p className="text-xs text-white/60">Кредит үлдэгдэл</p>
              <p className="text-lg font-bold tracking-tight text-white">{credits}</p>
            </div>
          </div>
          <button
            onClick={onPayment}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            <Plus className="w-4 h-4" />
            Нэмэх
          </button>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow className="px-0.5">
          {filter === "all" ? "Бүх гэрээ" : "Шүүсэн гэрээ"} ({visible.length})
        </Eyebrow>
        {/* Which subset is on screen has to be visible and reversible: the
            active chip says where you are, the others are one tap out. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CONTRACT_FILTERS.map((f) => {
            const active = f.value === filter;
            const count = contracts.filter((c) =>
              matchesFilter(c, f.value),
            ).length;
            return (
              <Link
                key={f.value}
                href={f.value === "all" ? "/contracts" : `/contracts?filter=${f.value}`}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-brand/12 text-brand"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="ml-1.5 tabular-nums opacity-60">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {deleteError && (
        <p className="text-sm text-red-600 dark:text-red-400 px-0.5">{deleteError}</p>
      )}

      {visible.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
          <FileText className="mx-auto w-8 h-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Гэрээ байхгүй байна</p>
          <p className="mt-1 text-xs text-muted-foreground">{FILTER_EMPTY_HINT[filter]}</p>
          {filter !== "all" && (
            <Link
              href="/contracts"
              className="text-brand mt-3 inline-block text-xs font-semibold hover:underline"
            >
              Бүх гэрээг харах
            </Link>
          )}
        </div>
      )}

      {/* one column on the phone, a card grid once there is room for it */}
      <div className="space-y-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0 lg:items-start">
      {visible.map((c) => {
        // A failed audit gets its own card. The locked one below would send the
        // user to buy credits, which is the single thing that cannot help here:
        // the audit refunded what it charged, and what is missing is a retry.
        if (c.status === "failed") {
          return (
            <div key={c.id} className="bg-card border-destructive/30 space-y-3.5 rounded-2xl border p-5">
              {cardHeader(c)}
              <div className="border-destructive/20 bg-destructive/5 flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center">
                <AlertTriangle className="text-destructive size-7" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Шинжилгээ амжилтгүй боллоо</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Кредит зарцуулагдаагүй. Файл хадгалагдсан тул дахин оруулах
                    шаардлагагүй.
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/contracts/${c.id}`)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                >
                  <RotateCw className="size-4" />
                  Дахин шинжлэх
                </button>
              </div>
            </div>
          );
        }

        if (!c.paid) {
          return (
            <div key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 space-y-3">
                {cardHeader(c)}
                {/* lock overlay */}
                <div className="rounded-xl bg-muted border border-border p-4 flex flex-col items-center gap-2.5 text-center">
                  <Lock className="w-7 h-7 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Аудит хаалттай байна</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.pages != null
                        ? `Энэ гэрээнд ${c.pages} кредит шаардагдана`
                        : "Аудит хийлгэхэд кредит шаардлагатай"}
                    </p>
                  </div>
                  <button
                    onClick={onPayment}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    {c.pages != null ? `${c.pages} кредитээр нээх` : "Кредитээр нээх"}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={c.id} className="bg-card border border-border rounded-2xl p-5 space-y-3.5">
            {cardHeader(c)}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${c.score ?? 0}%`, backgroundColor: scoreColor(c.score ?? 0) }}
                />
              </div>
              {/* The meter beside it carries the signal colour; the number is
                  12px text and needs the ink, which clears 4.5:1 on the card. */}
              <span className="text-xs font-bold" style={{ color: scoreInk(c.score ?? 0) }}>{c.score ?? "—"}</span>
            </div>
            {(c.rent != null || c.deposit != null) && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                {c.rent != null && (
                  <span>{c.rentLabel}: <span className="font-semibold text-foreground">{fmt(c.rent)}</span></span>
                )}
                {c.deposit != null && (
                  <span>Барьцаа: <span className="font-semibold text-foreground">{fmt(c.deposit)}</span></span>
                )}
              </div>
            )}
            <button
              onClick={() => router.push(`/contracts/${c.id}`)}
              className="bg-brand/10 text-brand hover:bg-brand/15 group flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
            >
              Аудит харах
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}
