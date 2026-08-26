import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_ATTEMPT_PARAM,
  demoCredentials,
  demoRedirectUrl,
  shouldSignInAsDemo,
} from "@/lib/demo-user";
import { DASHBOARD_PATH } from "@/lib/routes";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Sign the visitor into the shared demo account and drop them on the page they
 * asked for. This is what the portfolio/demo link points at: `/demo` from a
 * cold browser lands on the dashboard already signed in.
 */
export async function GET(request: NextRequest) {
  const target = demoRedirectUrl(
    request.nextUrl.searchParams.get("next"),
    request.nextUrl.origin,
  );
  const credentials = demoCredentials();

  if (!credentials) {
    // No demo account configured — fall back to the normal login screen.
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Never replace a real user's session with the shared demo account.
  if (user && !shouldSignInAsDemo(user.email)) {
    return NextResponse.redirect(
      new URL(DASHBOARD_PATH, request.nextUrl.origin),
    );
  }

  if (!user) {
    const { error } = await supabase.auth.signInWithPassword(credentials);

    if (error) {
      console.error("demo sign-in failed:", error.message);
      const login = new URL("/login", request.nextUrl.origin);
      login.searchParams.set("demo", "failed");
      return NextResponse.redirect(login);
    }
  }

  // Marks "the sign-in already happened here" so a cookie-less client bounces
  // to /login instead of being sent back for another attempt.
  target.searchParams.set(DEMO_ATTEMPT_PARAM, "1");
  return NextResponse.redirect(target);
}
