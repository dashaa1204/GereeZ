/** Permanently delete the signed-in user's account and all their data. */
export async function deleteAccount(): Promise<void> {
  const response = await fetch("/api/account", { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Бүртгэл устгахад алдаа гарлаа");
  }
}

/**
 * Rename the signed-in user. Goes through the API rather than
 * `supabase.auth.updateUser` so the server decides who may be renamed — the
 * shared demo account may not.
 */
export async function updateProfileName(name: string): Promise<string> {
  const response = await fetch("/api/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "Нэр хадгалахад алдаа гарлаа");
  }
  return data.name as string;
}
