"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { BrandMark } from "@/components/app/BrandMark";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10 text-center">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-9 text-navy" />
        <span className="text-2xl font-semibold text-navy">GereeZ</span>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Алдаа гарлаа</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Түр зуурын алдаа гарлаа. Дахин оролдоно уу — асуудал давтагдвал
          хэсэг хугацааны дараа шалгана уу.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-muted-foreground/70">
            Алдааны код: {error.digest}
          </p>
        )}
        <button
          onClick={() => unstable_retry()}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="size-4" />
          Дахин оролдох
        </button>
        <Link
          href="/"
          className="mt-2.5 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </div>
  );
}
