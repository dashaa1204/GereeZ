/**
 * Where a contract's file lives in the private bucket.
 *
 * The path used to be `${Date.now()}-${name}` for everyone, so two users
 * uploading the same file name in the same millisecond collided — `upsert:
 * false` turns that into a 500 for whoever is second. Owning the first segment
 * fixes that, and gives the bucket a shape RLS can be written against if reads
 * ever stop going through the service-role client: everything under a user's
 * id is theirs.
 *
 * The random segment covers the same collision within one user, which the
 * prefix cannot: one person uploading the same file twice in a millisecond is
 * unlikely, but it is the same bug and costs one field to rule out.
 */

/** Bytes of randomness in the middle segment, as hex characters. */
const RANDOM_LENGTH = 8;

function randomSegment(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, RANDOM_LENGTH);
}

/**
 * Storage key for a new upload: `<userId>/<millis>-<random>-<safe name>`.
 *
 * The name keeps only characters that are safe in a storage key; everything
 * else becomes `_`. It is cosmetic — `contracts.file_name` holds what the user
 * actually called the file, and that is what the UI shows.
 */
export function contractStoragePath(userId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${Date.now()}-${randomSegment()}-${safeName}`;
}
