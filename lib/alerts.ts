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

/**
 * Drop the read marks belonging to a deleted contract.
 *
 * Every alert about a contract carries its id inside the alert id (see
 * `lib/notifications.ts` — a test holds that convention in place), and nothing
 * else in a user's feed contains a uuid, so matching on it finds exactly this
 * contract's marks. Without this the rows outlive the contract they describe
 * and the table only grows: alerts are derived per request, so a mark whose
 * contract is gone can never be matched to an alert again, or cleaned up
 * later by anything that reads the feed.
 *
 * Fails soft: a contract the user asked to delete is deleted either way, and
 * a leftover row is a wasted byte, not a wrong answer.
 */
export async function forgetContractAlertReads(
  userId: string,
  contractId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("alert_reads")
    .delete()
    .eq("user_id", userId)
    .like("alert_id", `%${contractId}%`);

  if (error) {
    console.error("forgetContractAlertReads failed:", error.message);
  }
}
