"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  BrainCircuit,
  CloudUpload,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SettleIn, StaggerItem, StaggerList } from "@/components/ui/SettleIn";
import { useAnimatedProgress } from "@/lib/hooks/useAnimatedProgress";
import { triggerHaptic } from "@/lib/hooks/useHaptic";
import {
  auditContract,
  uploadContract,
} from "@/lib/services/contracts.client";
import { AnalysisResults } from "@/components/contracts/AnalysisResults";
import type { AuditResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "uploading" | "auditing" | "success" | "error";

function progressTarget(state: UploadState): number {
  switch (state) {
    case "uploading":
      return 35;
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
      return 700;
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
    case "auditing":
      return "AI хуулийн шинжилгээ хийж байна…";
    case "success":
      return "Бэлэн";
    default:
      return "";
  }
}

interface ContractUploadProps {
  onAnalysisComplete?: () => void;
}

export default function ContractUpload({
  onAnalysisComplete,
}: ContractUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const hapticFiredRef = useRef(false);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [shake, setShake] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const target = progressTarget(state);
  const duration = progressDuration(state);
  const progress = useAnimatedProgress(target, duration);
  const isBusy = state === "uploading" || state === "auditing";
  const ringComplete = state === "success" && progress >= 100;

  useEffect(() => {
    if (ringComplete && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      triggerHaptic("success");
      const timer = setTimeout(() => {
        setShowResults(true);
        onAnalysisComplete?.();
        router.refresh();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [ringComplete, router, onAnalysisComplete]);

  const requireConsent = useCallback(() => {
    if (consentAccepted) return true;
    setError("Гэрээ оруулахын өмнө доорх нөхцөлийг хүлээн зөвшөөрнө үү.");
    setShake(true);
    triggerHaptic("error");
    setTimeout(() => setShake(false), 300);
    return false;
  }, [consentAccepted]);

  const processFile = useCallback(
    async (file: File) => {
      if (!requireConsent()) return;

      if (file.type !== "application/pdf") {
        setError("Зөвхөн PDF файл оруулна уу.");
        setState("error");
        setShake(true);
        triggerHaptic("error");
        setTimeout(() => setShake(false), 300);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Файл 10 MB-аас бага байх ёстой.");
        setState("error");
        setShake(true);
        triggerHaptic("error");
        setTimeout(() => setShake(false), 300);
        return;
      }

      setError(null);
      setResult(null);
      setShowResults(false);
      setAlertsExpanded(false);
      hapticFiredRef.current = false;
      triggerHaptic("light");

      try {
        setState("uploading");
        const contract = await uploadContract(file);

        setState("auditing");
        const audited = await auditContract(contract.id);
        setResult({ contract: audited });
        setState("success");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Алдаа гарлаа");
        setState("error");
        setShake(true);
        triggerHaptic("error");
        setTimeout(() => setShake(false), 300);
      }
    },
    [requireConsent],
  );

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

  const showRing = isBusy || state === "success";

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy/10">
          <BrainCircuit className="size-5 text-navy" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Гэрээ оруулах</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            PDF гэрээгээ оруулбал Иргэний хуулийн дагуу AI шинжилгээ хийгдэнэ.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
        <input
          type="checkbox"
          checked={consentAccepted}
          onChange={(e) => {
            setConsentAccepted(e.target.checked);
            if (e.target.checked) setError(null);
          }}
          disabled={isBusy}
          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-border text-navy accent-navy focus:ring-navy/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p
          className="cursor-pointer text-left text-[11px] leading-relaxed text-muted-foreground"
          onClick={() => {
            if (isBusy) return;
            setConsentAccepted((value) => {
              const next = !value;
              if (next) setError(null);
              return next;
            });
          }}
        >
          Би{" "}
          <Link
            href="/legal/disclaimer"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-navy underline-offset-2 hover:underline"
          >
            анхааруулга
          </Link>
          ,{" "}
          <Link
            href="/legal/privacy_policy"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-navy underline-offset-2 hover:underline"
          >
            нууцлалын бодлого
          </Link>{" "}
          болон{" "}
          <Link
            href="/legal/terms_of_service"
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-navy underline-offset-2 hover:underline"
          >
            үйлчилгээний нөхцөл
          </Link>
          -ийг уншиж, хүлээн зөвшөөрч байна.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (consentAccepted) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "mt-4 rounded-lg border-2 p-6 text-center transition-all duration-300",
          showRing ? "border-solid" : "border-dashed",
          state === "success"
            ? "border-success/30 bg-success/5"
            : dragOver && consentAccepted
              ? "scale-[0.998] border-navy bg-navy/5"
              : "border-border bg-muted/30",
          (isBusy || !consentAccepted) && "pointer-events-none opacity-60",
          shake && "animate-shake",
        )}
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
            <SettleIn key="drop">
              <FileText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                PDF файлаа энд чирж тавина уу
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {state === "idle" &&
                  (consentAccepted
                    ? "эсвэл доорх товчоор сонгоно (10 MB хүртэл)"
                    : "Эхлээд дээрх нөхцөлийг зөвшөөрнө үү")}
                {state === "error" && "Дахин оролдоно уу"}
              </p>
            </SettleIn>
          )}
        </AnimatePresence>
      </div>

      <Button
        type="button"
        disabled={isBusy || !consentAccepted}
        onClick={() => {
          if (!requireConsent()) return;
          triggerHaptic("light");
          inputRef.current?.click();
        }}
        className="mt-4 h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
      >
        <CloudUpload className="size-4" />
        {state === "uploading"
          ? "Хадгалж байна…"
          : state === "auditing"
            ? "Шинжилж байна…"
            : "PDF оруулах"}
      </Button>

      {error && (
        <SettleIn className="mt-3 flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </SettleIn>
      )}

      {result?.contract && showResults && (
        <AnalysisResults
          contract={result.contract}
          expanded={alertsExpanded}
          onToggleExpanded={() => setAlertsExpanded((open) => !open)}
        />
      )}
    </section>
  );
}
