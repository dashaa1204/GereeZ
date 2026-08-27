/**
 * The one rule for a display name, shared by the settings input and the route
 * that stores it — the input caps typing at the same number the server
 * enforces, so the limit can't drift between what a user is allowed to type
 * and what is accepted. Free of server-only imports.
 */

/** Longest display name we store. */
export const MAX_PROFILE_NAME_LENGTH = 60;

/**
 * The name as it should be saved, or null when it isn't one: blank (including
 * whitespace-only) or longer than the cap. Trims, because a trailing space is
 * a typo rather than part of a name.
 */
export function normalizeProfileName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const name = input.trim();
  if (!name || name.length > MAX_PROFILE_NAME_LENGTH) return null;
  return name;
}
