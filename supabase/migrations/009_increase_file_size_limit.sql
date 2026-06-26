-- 009: Raise the contracts bucket size limit to 20 MB.
-- Scanned multi-page PDFs and phone photos of contracts routinely exceed 10 MB;
-- 20 MB keeps base64-encoded uploads (~27 MB) under Anthropic's 32 MB request
-- cap with headroom. Must stay in sync with MAX_FILE_SIZE in the upload route
-- and the client-side check.

update storage.buckets
set file_size_limit = 20971520
where id = 'contracts';
