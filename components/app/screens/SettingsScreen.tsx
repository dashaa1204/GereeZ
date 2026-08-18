"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { deleteAccount } from "@/lib/services/account.client";
import { useTheme } from "../theme";

export function SettingsScreen({
  userName,
  userEmail,
}: {
  userName: string | null;
  userEmail: string | null;
}) {
  const router = useRouter();
  const { dark, toggle } = useTheme();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = userName ?? "—";

  const saveName = async () => {
    const name = nameDraft.trim();
    if (!name || savingName) return;
    setSavingName(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name },
      });
      if (updateError) throw updateError;
      setEditingName(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Нэр хадгалахад алдаа гарлаа");
    } finally {
      setSavingName(false);
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const removeAccount = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Бүртгэл устгахад алдаа гарлаа");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const links = [
    { icon: <AlertTriangle className="size-4" />, label: "Анхааруулга", href: "/legal/disclaimer" },
    { icon: <ShieldCheck className="size-4" />, label: "Нууцлалын бодлого", href: "/legal/privacy_policy" },
    { icon: <FileText className="size-4" />, label: "Үйлчилгээний нөхцөл", href: "/legal/terms_of_service" },
  ];

  return (
    /* settings rows stay one readable column — they just stop stretching
       across the full desktop width */
    <div className="space-y-5 lg:max-w-2xl">
      {/* profile */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 uppercase">
          {displayName.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                disabled={savingName}
                autoFocus
                maxLength={60}
                className="h-8 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Таны нэр"
              />
              <button
                onClick={saveName}
                disabled={savingName || !nameDraft.trim()}
                aria-label="Нэр хадгалах"
                className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
              >
                {savingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setEditingName(false);
                  setNameDraft(userName ?? "");
                }}
                disabled={savingName}
                aria-label="Болих"
                className="shrink-0 flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-foreground capitalize truncate">{displayName}</p>
              <button
                onClick={() => setEditingName(true)}
                aria-label="Нэр засах"
                className="shrink-0 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="size-3.5" />
              </button>
            </div>
          )}
          <p className="text-sm text-muted-foreground truncate">{userEmail ?? "—"}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 px-0.5">{error}</p>
      )}

      {/* settings rows */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* dark mode toggle */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="size-4 text-muted-foreground" /> : <Sun className="size-4 text-muted-foreground" />}
            <span className="text-sm font-medium text-foreground">Харанхуй горим</span>
          </div>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full border border-border bg-background shadow-sm transition-transform ${dark ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {links.map((row, i, arr) => (
          <Link
            key={row.href}
            href={row.href}
            className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors ${i < arr.length - 1 ? "border-b border-border" : ""}`}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              {row.icon}
              <span className="text-sm font-medium text-foreground">{row.label}</span>
            </div>
            <ChevronDown className="-rotate-90 w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 text-foreground hover:bg-muted/50 transition-colors border-b border-border disabled:opacity-50"
        >
          {signingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          <span className="text-sm font-medium">Гарах</span>
        </button>
        <button
          onClick={removeAccount}
          disabled={deleting}
          className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors disabled:opacity-50 ${
            confirmingDelete
              ? "bg-destructive/10 text-destructive"
              : "text-destructive hover:bg-destructive/5"
          }`}
        >
          {deleting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          <span className="text-sm font-medium">
            {confirmingDelete
              ? "Дахин дарж баталгаажуулна уу — бүх гэрээ, дата устана"
              : "Бүртгэл устгах"}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
        <Info className="size-3.5" />
        GereeZ v1.0.0 · Монгол хуулийн нийцлийн систем
      </div>
    </div>
  );
}
