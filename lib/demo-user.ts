/**
 * A shared, pre-seeded account so anyone handed the app's URL can look around
 * without signing up (portfolio links, client walkthroughs). It is a real
 * Supabase user — RLS, credits and every API path behave normally — so the only
 * special-casing is: the app can log a visitor into it automatically, and the
 * two irreversible actions are refused for it (see `isDemoEmail`). Seed the
 * account with `npm run seed:demo`.
 *
 * Everyone who follows the link shares this one account and sees the same data.
 * Leave it off (unset `DEMO_AUTOLOGIN`) on any deployment holding real user
 * contracts.
 */

import { DASHBOARD_PATH } from "@/lib/routes";

export interface DemoCredentials {
  email: string;
  password: string;
}

/** Configured demo login, or null when the deployment has none. */
export function demoCredentials(): DemoCredentials | null {
  const email = process.env.DEMO_USER_EMAIL?.trim();
  const password = process.env.DEMO_USER_PASSWORD?.trim();
  if (!email || !password) return null;
  return { email, password };
}

/** True when anonymous visitors should land in the demo account instead of /login. */
export function isDemoAutoLoginEnabled(): boolean {
  return process.env.DEMO_AUTOLOGIN === "true" && demoCredentials() !== null;
}

/**
 * Marker `/demo` puts on its post-sign-in redirect. A client that keeps cookies
 * arrives signed in and it is just a stray query param; a client that does NOT
 * keep them (link checkers, crawlers, previews) arrives anonymous, and the
 * marker is what tells the proxy to send it to /login rather than back to
 * /demo — otherwise the two bounce off each other forever.
 */
export const DEMO_ATTEMPT_PARAM = "demo";

/**
 * Where `/demo?next=…` may send the visitor after signing them in: in-app paths
 * only, never an absolute URL an attacker could plant, and never back into the
 * demo/login routes (which would loop).
 *
 * `/\\host` is rejected too: WHATWG URL treats a backslash like `/`, so
 * `new URL("/\\evil.com", origin)` is `https://evil.com/` — an open redirect
 * the `//` check alone does not catch. Login's `safeRedirect` already blocks
 * this; keep the two in lockstep.
 */
export function safeDemoRedirect(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return DASHBOARD_PATH;
  }
  if (next.startsWith("/demo") || next.startsWith("/login")) return DASHBOARD_PATH;
  // The landing page bounces a signed-in visitor straight back here.
  if (next === "/") return DASHBOARD_PATH;
  return next;
}

/**
 * Resolve `next` against this deployment's origin. Even if `safeDemoRedirect`
 * misses a parser quirk, a URL that leaves the origin is replaced with the
 * dashboard — `/demo` uses `NextResponse.redirect(url)` which follows whatever
 * origin the URL constructor produced.
 */
export function demoRedirectUrl(
  next: string | null | undefined,
  origin: string,
): URL {
  const fallback = new URL(DASHBOARD_PATH, origin);
  try {
    const url = new URL(safeDemoRedirect(next), origin);
    if (url.origin !== new URL(origin).origin) return fallback;
    return url;
  } catch {
    return fallback;
  }
}

/**
 * `/demo` is a public path, so a signed-in user can hit it. Signing them into
 * the shared demo account would drop their real session — and any contract they
 * then uploaded would be visible to every other demo visitor. Only anonymous
 * visitors (and the demo user themselves) should go through demo sign-in.
 */
export function shouldSignInAsDemo(
  currentEmail: string | null | undefined,
): boolean {
  if (!currentEmail) return true;
  return isDemoEmail(currentEmail);
}

/** True when this email is the shared demo account. */
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = process.env.DEMO_USER_EMAIL?.trim();
  if (!demo || !email) return false;
  return email.trim().toLowerCase() === demo.toLowerCase();
}
