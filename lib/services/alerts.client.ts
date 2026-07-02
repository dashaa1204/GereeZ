/** Persist read marks for the given alert ids. Throws on failure. */
export async function markAlertsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch("/api/alerts/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error ?? "Мэдэгдэл тэмдэглэхэд алдаа гарлаа");
  }
}
