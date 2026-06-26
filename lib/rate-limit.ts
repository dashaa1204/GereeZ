import { createAdminClient } from "./supabase-server";

export interface RateLimitRule {
  /** Max actions allowed within the window. */
  limit: number;
  /** Rolling window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the client should wait before retrying (set when blocked). */
  retryAfter: number;
}

/** Rate limit rules per logical action. */
export const RATE_LIMITS = {
  // Each upload leads to a paid AI audit, so cap the entry point.
  upload: { limit: 20, windowSeconds: 3600 },
  // The audit call hits the AI provider directly — the main cost gate.
  audit: { limit: 20, windowSeconds: 3600 },
} satisfies Record<string, RateLimitRule>;

/**
 * Check (and record) a rate-limited action for a subject via the
 * `check_rate_limit` Postgres function. Keyed on user id.
 *
 * Fails open: if the DB call errors (e.g. migration 007 not yet applied), the
 * action is allowed and the error is logged — losing protection is preferable
 * to taking the whole app down.
 */
export async function checkRateLimit(
  bucket: keyof typeof RATE_LIMITS,
  subject: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[bucket];
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_bucket: bucket,
    p_subject: subject,
    p_limit: rule.limit,
    p_window_seconds: rule.windowSeconds,
  });

  if (error) {
    console.error(`Rate limit check failed for "${bucket}":`, error.message);
    return { allowed: true, retryAfter: 0 };
  }

  return {
    allowed: data === true,
    retryAfter: data === true ? 0 : rule.windowSeconds,
  };
}
