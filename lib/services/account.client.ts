/** Permanently delete the signed-in user's account and all their data. */
export async function deleteAccount(): Promise<void> {
  const response = await fetch("/api/account", { method: "DELETE" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Бүртгэл устгахад алдаа гарлаа");
  }
}
