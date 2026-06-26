import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import ws from "ws";

import { CONTRACTS_BUCKET } from "./supabase";

export { CONTRACTS_BUCKET };

const nodeSupabaseOptions = {
  realtime: {
    transport: ws as unknown as typeof WebSocket,
  },
};

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return url;
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

/**
 * Return the verified, authenticated user from the cookie session, or null.
 * Uses `getUser()`, which contacts the Auth server and verifies the token —
 * safe for authorization decisions (unlike `getSession()`).
 */
export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Server client — use in Server Components with cookie-based auth. */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can fail in Server Components; safe to ignore when read-only.
        }
      },
    },
  });
}

/** Admin client — service role for Storage uploads and DB writes in API routes. */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createSupabaseClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...nodeSupabaseOptions,
  });
}

/** Default lifetime for contract signed URLs (1 hour). */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Mint a short-lived signed URL for a contract PDF in the private bucket.
 * Use this whenever the UI needs to let a user view or download their file —
 * the bucket is private, so permanent public URLs no longer exist.
 */
export async function createSignedContractUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Файлын түр линк үүсгэхэд алдаа: ${error?.message ?? "тодорхойгүй"}`,
    );
  }

  return data.signedUrl;
}
