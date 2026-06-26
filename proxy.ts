import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all routes except API routes (they self-authenticate), Next
  // internals, and static assets. Excluding these avoids blocking CSS/JS/images.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
