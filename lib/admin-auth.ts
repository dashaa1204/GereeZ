/** Admin API routes — reuse LEGAL_INGEST_SECRET or allow dev without secret. */
export function isAdminAuthorized(request: Request): boolean {
  const secret = process.env.LEGAL_INGEST_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV === "development";

  const header =
    request.headers.get("x-admin-secret") ??
    request.headers.get("x-ingest-secret");

  return header === secret;
}
