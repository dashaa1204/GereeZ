"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Coins,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import type { FigmaContractVM } from "@/lib/figma-data";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SettleIn } from "@/components/ui/SettleIn";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { triggerHaptic } from "@/lib/hooks/useHaptic";
import {
  auditContract,
  quoteContract,
  uploadContract,
  type AuditQuote,
} from "@/lib/services/contracts.client";
import { rechargeCredits } from "@/lib/services/credits.client";
import { scoreColor } from "../display";

type UploadState =
  | "idle"
  | "uploading"
  | "quoting"
  | "quote"
  | "auditing"
  | "success"
  | "error";

function progressTarget(state: UploadState): number {
  switch (state) {
    case "uploading":
      return 30;
    case "quoting":
      return 50;
    case "auditing":
      return 95;
    case "success":
      return 100;
    default:
      return 0;
  }
}

function progressDuration(state: UploadState): number {
  switch (state) {
    case "uploading":
      return 600;
    case "quoting":
      return 500;
    case "auditing":
      return 1400;
    case "success":
      return 350;
    default:
      return 400;
  }
}

function phaseLabel(state: UploadState): string {
  switch (state) {
    case "uploading":
      return "Хадгалж байна…";
    case "quoting":
      return "Хуудас тоолж байна…";
    case "auditing":
      return "AI хуулийн шинжилгээ хийж байна…";
    case "success":
      return "Бэлэн";
    default:
      return "";
  }
}

export function HomeScreen({
  credits,
  userName,
  activeCount,
  averageCompliance,
  expiringSoon,
  recent,
}: {
  credits: number;
  userName: string | null;
  activeCount?: number;
  averageCompliance?: number | null;
  expiringSoon?: number;
  recent?: FigmaContractVM;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const hapticFiredRef = useRef(false);

  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [pendingContractId, setPendingContractId] = useState<string | null>(
    null,
  );
  const [quote, setQuote] = useState<AuditQuote | null>(null);
  const [recharging, setRecharging] = useState(false);

  const target = progressTarget(state);
  const duration = progressDuration(state);
  const progress = useAnimatedProgress(target, duration);
  const isBusy =
    state === "uploading" || state === "quoting" || state === "auditing";
  const ringComplete = state === "success" && progress >= 100;
  const showRing = isBusy || state === "success";
  const showGate = state === "quote" && quote;

  // On a completed audit, take the user straight into the new audit screen for
  // the contract they just analysed (and revalidate so it appears in lists).
  useEffect(() => {
    if (ringComplete && !hapticFiredRef.current && pendingContractId) {
      hapticFiredRef.current = true;
      triggerHaptic("success");
      const timer = setTimeout(() => {
        router.push(`/contracts/${pendingContractId}`);
        router.refresh();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [ringComplete, pendingContractId, router]);

  const requireConsent = useCallback(() => {
    if (consentAccepted) return true;
    setError("Гэрээ оруулахын өмнө доорх нөхцөлийг хүлээн зөвшөөрнө үү.");
    setShake(true);
    triggerHaptic("error");
    setTimeout(() => setShake(false), 300);
    return false;
  }, [consentAccepted]);

  const fail = useCallback((message: string) => {
    setError(message);
    setState("error");
    setShake(true);
    triggerHaptic("error");
    setTimeout(() => setShake(false), 300);
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!requireConsent()) return;

      if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
        fail("Зөвхөн PDF эсвэл зураг (PNG, JPG) оруулна уу.");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        fail("Файл 20 MB-аас бага байх ёстой.");
        return;
      }

      setError(null);
      setQuote(null);
      setPendingContractId(null);
      hapticFiredRef.current = false;
      triggerHaptic("light");

      try {
        setState("uploading");
        const contract = await uploadContract(file);
        setPendingContractId(contract.id);

        setState("quoting");
        const nextQuote = await quoteContract(contract.id);
        setQuote(nextQuote);
        setState("quote");
        triggerHaptic("light");
      } catch (err) {
        fail(err instanceof Error ? err.message : "Алдаа гарлаа");
      }
    },
    [requireConsent, fail],
  );

  const confirmAudit = useCallback(async () => {
    if (!pendingContractId) return;
    triggerHaptic("light");
    try {
      setState("auditing");
      await auditContract(pendingContractId);
      setState("success");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Шинжилгээ амжилтгүй боллоо");
    }
  }, [pendingContractId, fail]);

  const handleRecharge = useCallback(async () => {
    setRecharging(true);
    try {
      const newBalance = await rechargeCredits();
      setQuote((prev) =>
        prev
          ? { ...prev, balance: newBalance, sufficient: newBalance >= prev.cost }
          : prev,
      );
      triggerHaptic("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Цэнэглэхэд алдаа гарлаа");
    } finally {
      setRecharging(false);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  const openPicker = () => {
    if (!requireConsent()) return;
    triggerHaptic("light");
    inputRef.current?.click();
  };

  return (
    <div className="space-y-5">
      {/* header — fixed dark banner in both themes so the light-on-dark pills
          stay legible (bg-primary would invert to light in dark mode) */}
      <div className="rounded-2xl bg-zinc-900 text-white px-5 py-5">
        <p className="text-sm font-medium opacity-70 mb-1">Сайн байна уу 👋</p>
        <h1 className="text-xl font-bold leading-tight capitalize">
          {userName ?? "Батболд"}
        </h1>
        <p className="text-sm opacity-70 mt-1">Таны гэрээнүүдийг хянаж байна.</p>
        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{credits} кредит</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/25 rounded-full px-3 py-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span className="text-xs font-semibold text-emerald-200">Идэвхтэй</span>
          </div>
        </div>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{activeCount ?? 2}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Идэвхтэй гэрээ</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          {averageCompliance === undefined ? (
            <p className="text-2xl font-bold" style={{ color: scoreColor(78) }}>78</p>
          ) : averageCompliance === null ? (
            <p className="text-2xl font-bold text-foreground">—</p>
          ) : (
            <p className="text-2xl font-bold" style={{ color: scoreColor(averageCompliance) }}>
              {averageCompliance}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Нийцлийн оноо</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{expiringSoon ?? 1}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Удахгүй дуусна</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* consent gate — keep parity with the legal acceptance required before
          any contract leaves the device for analysis */}
      <label className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(e) => {
            setConsentAccepted(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          disabled={isBusy}
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border text-primary accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-[11px] leading-relaxed text-muted-foreground">
          Би{" "}
          <Link
            href="/legal/disclaimer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            анхааруулга
          </Link>
          ,{" "}
          <Link
            href="/legal/privacy_policy"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            нууцлалын бодлого
          </Link>{" "}
          болон{" "}
          <Link
            href="/legal/terms_of_service"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            үйлчилгээний нөхцөл
          </Link>
          -ийг уншиж, хүлээн зөвшөөрч байна.
        </span>
      </label>

      {/* upload zone / quote gate */}
      {showGate ? (
        <SettleIn>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Coins className="size-4" />
              Шинжилгээний төлбөр
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Хуудасны тоо</dt>
                <dd className="font-medium text-foreground">{quote.pageCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Шинжилгээний үнэ</dt>
                <dd className="font-medium text-foreground">{quote.cost} кредит</dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1.5">
                <dt className="text-muted-foreground">Таны баланс</dt>
                <dd
                  className={
                    quote.sufficient
                      ? "font-semibold text-foreground"
                      : "font-semibold text-destructive"
                  }
                >
                  {quote.balance} кредит
                </dd>
              </div>
            </dl>

            {quote.sufficient ? (
              <button
                type="button"
                onClick={confirmAudit}
                className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
              >
                <Sparkles className="size-4" />
                Баталгаажуулж, шинжлэх ({quote.cost} кредит)
              </button>
            ) : (
              <>
                <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  Кредит хүрэлцэхгүй байна. Доорх товчоор үнэгүй цэнэглэнэ үү (demo).
                </p>
                <button
                  type="button"
                  onClick={handleRecharge}
                  disabled={recharging}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {recharging ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Coins className="size-4" />
                  )}
                  Кредит цэнэглэх
                </button>
              </>
            )}
          </div>
        </SettleIn>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (consentAccepted && !isBusy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!isBusy && !showRing) openPicker();
          }}
          className={`relative border-2 rounded-2xl p-7 flex flex-col items-center gap-3 transition-all
            ${showRing ? "border-solid" : "border-dashed cursor-pointer"}
            ${
              state === "success"
                ? "border-emerald-500/40 bg-emerald-500/5"
                : dragOver && consentAccepted
                  ? "border-primary bg-primary/5 scale-[0.998]"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/3"
            }
            ${isBusy ? "pointer-events-none" : ""}
            ${shake ? "animate-shake" : ""}`}
        >
          <AnimatePresence mode="wait">
            {showRing ? (
              <SettleIn key="ring">
                <ProgressRing
                  progress={progress}
                  complete={ringComplete}
                  size="sm"
                  label={phaseLabel(state)}
                />
              </SettleIn>
            ) : (
              <SettleIn key="drop" className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">PDF гэрээ оруулах</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Скан зураг ч мөн боломжтой (OCR)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                  className="mt-1 flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  AI шинжилгээ хийх
                </button>
                <p className="text-xs text-muted-foreground">
                  {state === "error"
                    ? "Дахин оролдоно уу"
                    : consentAccepted
                      ? "1 хуудас = 1 кредит (20 MB хүртэл)"
                      : "Эхлээд дээрх нөхцөлийг зөвшөөрнө үү"}
                </p>
              </SettleIn>
            )}
          </AnimatePresence>
        </div>
      )}

      {error && (
        <SettleIn className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </SettleIn>
      )}

      {/* recent contract */}
      {recent && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Сүүлийн гэрээ</h2>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{recent.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Дуусах: {recent.endDate}</p>
              </div>
              {recent.score != null && (
                <div
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${scoreColor(recent.score)}1f`,
                    color: scoreColor(recent.score),
                  }}
                >
                  {recent.score} оноо
                </div>
              )}
            </div>
            <button
              onClick={() => router.push(`/contracts/${recent.id}`)}
              className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-primary font-medium py-2 rounded-lg bg-primary/8 hover:bg-primary/12 transition-colors"
            >
              Дэлгэрэнгүй харах
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
