-- Gereez: make the contracts bucket PRIVATE
-- Uploaded contracts contain personal data (names, addresses, amounts) and must
-- not be reachable through guessable public URLs. Access is now granted only via
-- short-lived signed URLs minted server-side from `storage_path`.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

-- 1. Flip the existing bucket to private.
update storage.buckets
  set public = false
  where id = 'contracts';

-- 2. Remove the policy that allowed anyone to read contract files.
--    The service-role client (API routes) bypasses RLS, so signed-URL minting
--    and downloads keep working without a public-read policy.
drop policy if exists "Allow public read on contract files" on storage.objects;

-- 3. We no longer store a permanent public URL — keep the column for backward
--    compatibility but allow null (URLs are now generated on demand).
alter table public.contracts
  alter column file_url drop not null;
