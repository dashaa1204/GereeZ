import { NextResponse, type NextRequest } from "next/server";
import { demoCredentials, safeDemoRedirect } from "@/lib/demo-user";
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
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    console.error("demo sign-in failed:", error.message);
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("demo", "failed");
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(target);
}
