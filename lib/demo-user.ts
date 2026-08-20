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
 */
export function safeDemoRedirect(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return DASHBOARD_PATH;
  if (next.startsWith("/demo") || next.startsWith("/login")) return DASHBOARD_PATH;
  // The landing page bounces a signed-in visitor straight back here.
  if (next === "/") return DASHBOARD_PATH;
  return next;
}

/** True when this email is the shared demo account. */
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = process.env.DEMO_USER_EMAIL?.trim();
  if (!demo || !email) return false;
  return email.trim().toLowerCase() === demo.toLowerCase();
}
