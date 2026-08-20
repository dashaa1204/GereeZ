"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { DASHBOARD_PATH } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleForgotPassword = async () => {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Имэйл хаягаа оруулаад дахин дарна уу.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/reset-password` },
      );
      if (resetError) throw resetError;
      setNotice("Нууц үг сэргээх холбоосыг имэйлээр илгээлээ. Имэйлээ шалгана уу.");
    } catch (err) {
      setError(
        err instanceof Error
          ? translateAuthError(err.message)
          : "Алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Email confirmation enabled → no session until the user confirms.
        if (!data.session) {
          setNotice(
            "Бүртгэл үүслээ. Имэйл хаягаа шалгаж баталгаажуулсны дараа нэвтэрнэ үү.",
          );
          setMode("signin");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? translateAuthError(err.message)
          : "Алдаа гарлаа. Дахин оролдоно уу.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {mode === "signin" ? "Нэвтрэх" : "Бүртгүүлэх"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GereeZ-д гэрээгээ найдвартай хадгалж, шинжлүүлээрэй.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Имэйл
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-lg border border-border bg-muted/20 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium text-foreground"
          >
            Нууц үг
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-lg border border-border bg-muted/20 py-0 pl-3 pr-10 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
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

        {mode === "signin" && (
          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-brand text-xs font-medium hover:underline disabled:opacity-50"
            >
              Нууц үг мартсан?
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        )}

        {notice && (
          <div className="bg-brand/10 text-brand flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
            <Mail className="mt-0.5 size-3.5 shrink-0" />
            {notice}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "signin" ? "Нэвтрэх" : "Бүртгүүлэх"}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        {mode === "signin" ? "Бүртгэлгүй юу? " : "Бүртгэлтэй юу? "}
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setNotice(null);
          }}
          className="text-brand font-medium hover:underline"
        >
          {mode === "signin" ? "Бүртгүүлэх" : "Нэвтрэх"}
        </button>
      </p>
    </div>
  );
}

/**
 * Only allow same-origin relative redirects. Reject absolute URLs and
 * protocol-relative `//host` values so a crafted `?redirect=` can't bounce
 * the user to an external phishing site after login.
 */
function safeRedirect(value: string | null): string {
  if (!value) return DASHBOARD_PATH;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DASHBOARD_PATH;
  }
  return value;
}

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Имэйл эсвэл нууц үг буруу байна.";
  }
  if (lower.includes("user already registered")) {
    return "Энэ имэйл аль хэдийн бүртгэлтэй байна. Нэвтэрнэ үү.";
  }
  if (lower.includes("email not confirmed")) {
    return "Имэйл хаягаа баталгаажуулна уу.";
  }
  return message;
}
