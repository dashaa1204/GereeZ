"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

// Page-level errors inside the app shell — keeps the bottom nav usable.
export default function AppError({
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="size-6 text-destructive" />
      </div>
      <h2 className="text-base font-bold text-foreground">Алдаа гарлаа</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Мэдээлэл ачаалахад алдаа гарлаа. Дахин оролдоно уу.
      </p>
      {error.digest && (
        <p className="mt-1.5 text-xs text-muted-foreground/70">
          Алдааны код: {error.digest}
        </p>
      )}
      <button
        onClick={() => unstable_retry()}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <RotateCcw className="size-4" />
        Дахин оролдох
      </button>
    </div>
  );
}
