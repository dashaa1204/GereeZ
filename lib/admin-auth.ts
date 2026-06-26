import { timingSafeEqual } from "node:crypto";

/** Constant-time string compare — avoids leaking the secret via response timing. */
export function secureCompare(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch; guard it without short-circuiting
  // on the secret's content.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Admin API routes — reuse LEGAL_INGEST_SECRET or allow dev without secret. */
export function isAdminAuthorized(request: Request): boolean {
  const secret = process.env.LEGAL_INGEST_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";

  const header =
    request.headers.get("x-admin-secret") ??
    request.headers.get("x-ingest-secret");

  return secureCompare(header, secret);
}
