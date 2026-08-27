import {
  DEMO_USER_NAME,
  type DemoCredentials,
} from "./demo-user";
import { createAdminClient } from "./supabase-server";

/**
 * Put the shared demo account back the way the seed script left it.
 *
 * Every visitor is signed into one real Supabase account, holding a real
 * session — so anything that session is allowed to do, a visitor with a
 * console is allowed to do, including changing the account's own password. The
 * app refuses that (`app/api/account`, the reset-password page), but a refusal
 * in the app is not a refusal in Supabase, and the one that gets through takes
 * the public demo down until someone re-runs `npm run seed:demo` by hand.
 *
 * So the demo repairs itself on the next visit instead: `/demo` restores the
 * credentials when the sign-in it is about to do would otherwise fail, and
 * restores the display name when it has drifted. Both come from the same
 * source the seed uses — env and `DEMO_USER_NAME` — so "repaired" and "freshly
 * seeded" mean the same thing.
 */

/** How far into the user list to look for the demo account. */
const LOOKUP_PAGES = 10;
const PER_PAGE = 200;

/** The demo account's user id, or null when no such user exists yet. */
async function findDemoUserId(email: string): Promise<string | null> {
  const supabase = createAdminClient();
  const wanted = email.trim().toLowerCase();

  for (let page = 1; page <= LOOKUP_PAGES; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) {
      console.error("demo repair: listUsers failed:", error.message);
      return null;
    }
    const found = data.users.find((u) => u.email?.toLowerCase() === wanted);
    if (found) return found.id;
    if (data.users.length < PER_PAGE) return null;
  }
  return null;
}

/**
 * Reset the demo account's password and name to the configured ones. Called
 * only when a sign-in with those credentials has already failed, so it is the
 * repair path and not something a normal visit pays for.
 *
 * Returns true when the account was restored and a retry is worth making.
 */
export async function restoreDemoCredentials(
  credentials: DemoCredentials,
): Promise<boolean> {
  const userId = await findDemoUserId(credentials.email);
  if (!userId) return false;

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: credentials.password,
    user_metadata: { full_name: DEMO_USER_NAME },
  });
  if (error) {
    console.error("demo repair: password reset failed:", error.message);
    return false;
  }

  console.warn("demo repair: credentials restored for", credentials.email);
  return true;
}

/**
 * Restore the demo account's display name. Cheap enough to sit on the sign-in
 * path because the caller only reaches it when the name it just read back is
 * not the one it should be.
 */
export async function restoreDemoName(userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { full_name: DEMO_USER_NAME },
  });
  if (error) {
    console.error("demo repair: name reset failed:", error.message);
    return;
  }
  console.warn("demo repair: display name restored");
}
