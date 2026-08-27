import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_ATTEMPT_PARAM,
  demoCredentials,
  demoNameDrifted,
  safeDemoRedirect,
} from "@/lib/demo-user";
import { restoreDemoCredentials, restoreDemoName } from "@/lib/demo-repair";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

/**
 * Sign the visitor into the shared demo account and drop them on the page they
 * asked for. This is what the portfolio/demo link points at: `/demo` from a
 * cold browser lands on the dashboard already signed in.
 */
export async function GET(request: NextRequest) {
  const target = new URL(
    safeDemoRedirect(request.nextUrl.searchParams.get("next")),
    request.nextUrl.origin,
  );
  const credentials = demoCredentials();

  if (!credentials) {
    // No demo account configured — fall back to the normal login screen.
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  let { data, error } = await supabase.auth.signInWithPassword(credentials);

  // The configured password no longer opens the account. The likeliest reason
  // is that a visitor changed it — the session they are handed is a real one —
  // so put it back and try once more rather than leaving the public demo shut
  // until someone re-runs the seed. A second failure is a real failure.
  if (error && (await restoreDemoCredentials(credentials))) {
    ({ data, error } = await supabase.auth.signInWithPassword(credentials));
  }

  if (error) {
    console.error("demo sign-in failed:", error.message);
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("demo", "failed");
    return NextResponse.redirect(login);
  }

  // The name is shared furniture: whatever a visitor renamed it to is what the
  // next visitor would see. Reading it back costs nothing here, so put it right
  // before handing over the session.
  const user = data.user;
  if (user && demoNameDrifted(user.user_metadata?.full_name)) {
    await restoreDemoName(user.id);
  }

  // Marks "the sign-in already happened here" so a cookie-less client bounces
  // to /login instead of being sent back for another attempt.
  target.searchParams.set(DEMO_ATTEMPT_PARAM, "1");
  return NextResponse.redirect(target);
}
