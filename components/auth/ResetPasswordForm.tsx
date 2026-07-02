"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Second half of the password-reset flow: the email link lands here with a
 * one-time `?code=`, which is exchanged for a session; the user then sets a
 * new password.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // "verifying" while the code exchange runs; "ready" shows the form.
  const [stage, setStage] = useState<"verifying" | "ready">("verifying");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const supabase = createClient();

    const verify = async () => {
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(
            "Холбоос хүчингүй эсвэл хугацаа нь дууссан байна. Нэвтрэх хуудаснаас дахин хүсэлт илгээнэ үү.",
          );
        }
      } else {
        // No code — the user may already hold a recovery session (e.g. after
        // a reload); only block when there's no session at all.
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          setError(
            "Сэргээх холбоос олдсонгүй. Нэвтрэх хуудаснаас дахин хүсэлт илгээнэ үү.",
          );
        }
      }
      setStage("ready");
    };

    verify();
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа. Дахин оролдоно уу.");
    } finally {
      setLoading(false);
    }
  };

  if (stage === "verifying") {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
        <Loader2 className="mx-auto size-5 animate-spin text-navy" />
        <p className="mt-3 text-sm text-muted-foreground">Холбоос шалгаж байна…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-navy">Шинэ нууц үг</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Бүртгэлдээ ашиглах шинэ нууц үгээ оруулна уу.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Шинэ нууц үг
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-lg border border-border bg-muted/20 py-0 pl-3 pr-10 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:opacity-50"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={loading}
              aria-label={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
              className={cn(
                "absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground disabled:opacity-50",
              )}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Нууц үг шинэчлэх
        </Button>
      </form>
    </div>
  );
}
