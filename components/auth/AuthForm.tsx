"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        <h1 className="text-xl font-bold text-navy">
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
            className="h-11 w-full rounded-lg border border-border bg-muted/20 px-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:opacity-50"
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
          <input
            id="password"
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-lg border border-border bg-muted/20 px-3 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:opacity-50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {error}
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2 rounded-lg bg-navy/10 px-3 py-2 text-xs text-navy">
            <Mail className="mt-0.5 size-3.5 shrink-0" />
            {notice}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full gap-2 rounded-lg bg-navy text-white hover:bg-navy/90 active:scale-[0.98]"
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
          className="font-medium text-navy hover:underline"
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
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
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
