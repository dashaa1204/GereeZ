"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BrainCircuit,
  CloudUpload,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  auditContract,
  uploadContract,
} from "@/lib/services/contracts.client";
import type { AuditResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY_LABELS: Record<string, string> = {
  high: "Өндөр",
  medium: "Дунд",
  low: "Бага",
  info: "Мэдээлэл",
};

type UploadState = "idle" | "uploading" | "auditing" | "success" | "error";

export default function ContractUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Зөвхөн PDF файл оруулна уу.");
        setState("error");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Файл 10 MB-аас бага байх ёстой.");
        setState("error");
        return;
      }

      setError(null);
      setResult(null);

      try {
        setState("uploading");
        const contract = await uploadContract(file);

        setState("auditing");
        const audited = await auditContract(contract.id);
        setResult({ contract: audited });
        setState("success");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Алдаа гарлаа");
        setState("error");
      }
    },
    [router],
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

  const isBusy = state === "uploading" || state === "auditing";

  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-navy/10">
          <BrainCircuit className="size-5 text-navy" />
        </div>
        <div>
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

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "mt-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver ? "border-navy bg-navy/5" : "border-border bg-muted/30",
          isBusy && "pointer-events-none opacity-60",
        )}
      >
        <FileText className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          {isBusy ? "Боловсруулж байна…" : "PDF файлаа энд чирж тавина уу"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {state === "uploading" && "Хадгалж байна…"}
          {state === "auditing" && "AI хуулийн шинжилгээ хийж байна…"}
          {state === "idle" && "эсвэл доорх товчоор сонгоно (10 MB хүртэл)"}
          {state === "success" && "Амжилттай — доор үр дүн харагдана"}
          {state === "error" && "Дахин оролдоно уу"}
        </p>
      </div>

      <Button
        type="button"
        disabled={isBusy}
        onClick={() => inputRef.current?.click()}
        className="mt-4 h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90"
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CloudUpload className="size-4" />
        )}
        {state === "uploading"
          ? "Хадгалж байна…"
          : state === "auditing"
            ? "Шинжилж байна…"
            : "PDF оруулах"}
      </Button>

      {error && (
        <p className="mt-3 flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {result?.contract && state === "success" && (
        <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{result.contract.file_name}</p>
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-sm font-bold text-success">
              {result.contract.compliance_score}/100
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {result.contract.audit_summary?.summary}
          </p>
          {result.contract.audit_summary?.alerts &&
            result.contract.audit_summary.alerts.length > 0 && (
              <ul className="space-y-2">
                {result.contract.audit_summary.alerts.map((alert) => (
                  <li
                    key={alert.title}
                    className="rounded-md border border-border bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{alert.title}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {SEVERITY_LABELS[alert.severity] ?? alert.severity}
                      </span>
                    </div>
                    {alert.lawName && alert.articleReference && (
                      <p className="mt-0.5 text-[10px] font-medium text-navy">
                        {alert.lawName} — {alert.articleReference}
                      </p>
                    )}
                    <p className="mt-0.5 text-muted-foreground">
                      {alert.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </section>
  );
}
