import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ATTEMPT_PARAM, isDemoAutoLoginEnabled } from "@/lib/demo-user";
import { DASHBOARD_PATH } from "@/lib/routes";

/** Paths reachable without an authenticated session. */
const PUBLIC_PREFIXES = ["/login", "/legal", "/auth", "/demo"];

function isPublicPath(pathname: string): boolean {
  // "/" is the marketing landing page. It is matched exactly rather than added
  // to PUBLIC_PREFIXES, where its trailing-slash form would whitelist the
  // entire app.
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refresh the Supabase auth session on every navigation and redirect
 * unauthenticated users to /login. Runs from `proxy.ts`.
 *
 * Note: proxy is a first gate only — API routes and server actions must still
 * verify the user themselves (see getAuthenticatedUser).
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Misconfigured env — let the request through so the app surfaces the error.
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Must run getUser() to refresh the token cookies before rendering.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    // With a demo account configured, a first-time visitor is signed into it
    // rather than being asked to register — /login is still reachable directly.
    const demoAlreadyTried = request.nextUrl.searchParams.has(DEMO_ATTEMPT_PARAM);
    if (isDemoAutoLoginEnabled() && !demoAlreadyTried) {
      redirectUrl.pathname = "/demo";
      redirectUrl.search = "";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (demoAlreadyTried) redirectUrl.searchParams.set("demo", "failed");
    else redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Already signed in but visiting the landing page or /login → the dashboard
  // is what they actually want.
  if (user && (pathname === "/login" || pathname === "/")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DASHBOARD_PATH;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
