-- 008: Accept image contracts (scanned photos / screenshots) alongside PDFs.
-- The vision model reads image-only PDFs and image files into text at audit
-- time; the storage bucket must allow the new MIME types or uploads are
-- rejected at the storage layer regardless of the API route's validation.

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
where id = 'contracts';
