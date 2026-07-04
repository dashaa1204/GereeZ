import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all routes except API routes (they self-authenticate), Next
  // internals, static assets, and well-known public files (the PWA manifest
  // and robots.txt must be reachable without a session, e.g. from /login).
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
