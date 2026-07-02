import { createAdminClient } from "./supabase-server";

/**
 * Read-state for the derived alerts feed (see buildAlerts in lib/view-models.ts).
 * Alerts are recomputed per request, so only the read marks live in the DB:
 * one `alert_reads` row per (user, alert id).
 */

/** Alert ids the user has marked read. Fails soft to "nothing read". */
export async function getReadAlertIds(userId: string): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("alert_reads")
    .select("alert_id")
    .eq("user_id", userId);

  if (error) {
    console.error("getReadAlertIds failed:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.alert_id as string));
}

/** Persist read marks. Re-marking an already-read alert is a no-op. */
export async function markAlertsRead(
  userId: string,
  alertIds: string[],
): Promise<void> {
  if (alertIds.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("alert_reads").upsert(
    alertIds.map((alert_id) => ({ user_id: userId, alert_id })),
    { onConflict: "user_id,alert_id", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(`Мэдэгдэл тэмдэглэхэд алдаа: ${error.message}`);
  }
}
