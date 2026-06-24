# Legal Knowledge Base

Place your Mongolian legal text files here before ingesting into the vector database.

## Getting started

1. Add your Civil Code text file, e.g.:
   - `irgenii-huuli.txt` (Иргэний хууль)

2. Run the Supabase migration:
   - `supabase/migrations/002_legal_documents_pgvector.sql`

3. Ingest the file via API:

```bash
curl -X POST http://localhost:3000/api/legal/ingest \
  -H "x-ingest-secret: your-secret" \
  -F "file=@knowledge-base/irgenii-huuli.txt" \
  -F "lawName=Иргэний хууль"
```

In development, the ingest endpoint works without a secret if `LEGAL_INGEST_SECRET` is unset.

## Supported formats

- Plain text (`.txt`) — UTF-8 encoded
- PDF (`.pdf`) — text-based PDFs only (scanned images won't work)
- Articles are auto-detected via patterns: `Зүйл 287`, `287.`, `287 дугаар зүйл`

## Quick ingest (recommended)

With `.env.local` configured, run:

```bash
npm run ingest:legal
```

This ingests `knowledge-base/ИРГЭНИЙ ХУУЛЬ.pdf` by default.

Or specify a file:

```bash
npm run ingest:legal -- "knowledge-base/your-file.pdf"
```

## Tips

- Use clean, article-structured source text for best chunking
- Re-ingesting replaces existing chunks for the same `lawName` by default
- After ingesting 100+ chunks, the IVFFlat index in Supabase will perform better
