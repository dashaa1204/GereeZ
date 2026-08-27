import { NextResponse } from "next/server";
import { createAdminClient } from "./supabase-server";

export interface RateLimitRule {
  /** Max actions allowed within the window. */
  limit: number;
  /** Rolling window length in seconds. */
  windowSeconds: number;
  /**
   * What the user is told when this action is refused. Written per action:
   * a shared bucket's shared wording made "wait an hour" read as "the app is
   * refusing to do this", which is the wrong thing to hear about deleting your
   * own account.
   */
  message: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the client should wait before retrying (set when blocked). */
  retryAfter: number;
  /** The refused action's own message, ready to return to the user. */
  message: string;
}

const HOUR = 3600;

/**
 * Rate limit rules per logical action — one bucket per action, and every
 * action's own.
 *
 * Five unrelated routes used to share `upload`: uploading, quoting, topping up
 * credits, deleting a contract and deleting the account. Sharing a bucket
 * means sharing a budget, so an upload cost two of the twenty (upload, then
 * quote) and housekeeping ate the rest — delete twenty contracts and you could
 * neither upload nor close your account for an hour.
 *
 * Each limit below is set by what the action actually costs us, not by what it
 * happens to sit next to.
 */
export const RATE_LIMITS = {
  // A stored file that goes on to a paid AI audit. The entry point to the
  // spend, so it stays the tightest of the file-handling caps.
  upload: {
    limit: 20,
    windowSeconds: HOUR,
    message: "Хэт олон гэрээ оруулсан байна. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // Page count only — no OCR, no AI. It runs at least once per upload and
  // again whenever a quote is retried, so it must never be the thing that
  // stops someone uploading.
  quote: {
    limit: 40,
    windowSeconds: HOUR,
    message: "Хэт олон үнийн санал хүслээ. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // The audit call hits the AI provider directly — the main cost gate.
  audit: {
    limit: 20,
    windowSeconds: HOUR,
    message: "Хэт олон шинжилгээ. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // Correction-letter generation is another AI call; cap it per user/hour.
  // The audit's letter allowance bounds the spend per contract, this bounds
  // how fast one user can work through several.
  proposal: {
    limit: 30,
    windowSeconds: HOUR,
    message: "Хэт олон захидал үүсгэлээ. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // Demo top-up: free credits, so nothing is spent here — but it writes to the
  // balance and there is no reason for anyone to call it in bursts.
  recharge: {
    limit: 20,
    windowSeconds: HOUR,
    message: "Хэт олон удаа цэнэглэлээ. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // A metadata write with no spend behind it, but it is the one thing a
  // signed-in user can change about their account, so it gets a ceiling too.
  profile: {
    limit: 30,
    windowSeconds: HOUR,
    message: "Хэт олон удаа өөрчиллөө. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // Housekeeping, and cheap: a storage remove and a row delete. Someone
  // tidying up a year of contracts should not run into a wall — and if they
  // do, it must not be the wall that also holds up their next upload.
  "delete-contract": {
    limit: 60,
    windowSeconds: HOUR,
    message: "Хэт олон гэрээ устгалаа. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
  // Succeeds once and there is no account left to call it again — repeats mean
  // retries after a failure. A small cap bounds the storage sweep behind it
  // without ever being the reason someone can't leave.
  "delete-account": {
    limit: 5,
    windowSeconds: HOUR,
    message:
      "Бүртгэл устгах хүсэлтийг хэт олон удаа илгээлээ. Хэсэг хүлээгээд дахин оролдоно уу.",
  },
} satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

/**
 * Check (and record) a rate-limited action for a subject via the
 * `check_rate_limit` Postgres function. Keyed on user id.
 *
 * Fails open: if the DB call errors (e.g. migration 007 not yet applied), the
 * action is allowed and the error is logged — losing protection is preferable
 * to taking the whole app down.
 */
export async function checkRateLimit(
  bucket: RateLimitBucket,
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
    return { allowed: true, retryAfter: 0, message: rule.message };
  }

  return {
    allowed: data === true,
    retryAfter: data === true ? 0 : rule.windowSeconds,
    message: rule.message,
  };
}

/**
 * The 429 for a refused action, carrying that action's own wording. Routes
 * return this rather than writing the response themselves, so the message a
 * user sees is decided next to the limit that produced it.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: result.message },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
}
