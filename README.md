# GereeZ

**Гэрээгээ бүрэн уншаагүй ч болно — GereeZ таны өмнөөс шалгаад, эрсдэлийг ойлгомжтой харуулна.**

AI-powered contract compliance platform for Mongolia. Upload a PDF agreement, get a legal score, and plain-language alerts grounded in Mongolian law.

[github.com/dashaa1204/GereeZ](https://github.com/dashaa1204/GereeZ)

---

## Why GereeZ exists

In Mongolia, people deal with many different contracts every day — rent, employment, loans, services — often with minimal attention. Most people cannot or will not read every clause. That leads to unfair terms, lost rights, deposit disputes, and costly surprises.

GereeZ is built for that pain point:

1. **Understand** — AI audit explains risks in clear Mongolian, not legal jargon
2. **Track** — keep uploaded contracts and audit history in one place
3. **Manage** *(roadmap)* — renewals, reminders, and lifecycle tools for all your agreements

MVP starts with **rent and civil-law contracts** in Mongolia. The architecture is designed to support **all contract types** and **multiple legal knowledge bases** as the product grows.

---

## Features (current)

- PDF contract upload (drag & drop, max 10 MB)
- AI legal audit with compliance score (0–100)
- Severity-based alerts (`high`, `medium`, `low`, `info`) with law references
- RAG pipeline against **Иргэний хууль** (Civil Code) via Supabase pgvector
- Dashboard with live metrics, legal score, alerts, and contract list
- Supabase Storage for PDFs + Postgres for audit results

---

## Tech stack

| Layer | Tools |
|-------|--------|
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Supabase (Postgres + Storage) |
| AI | Vercel AI SDK — Anthropic / Groq / Google |
| RAG | Gemini embeddings (768d), pgvector, PDF text extraction |
| Language | Mongolian UI (global-ready structure planned) |

---

## Getting started

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) project
- At least one AI provider key: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`
- Google API key for embeddings (RAG vector search)

### 1. Clone and install

```bash
git clone https://github.com/dashaa1204/GereeZ.git
cd GereeZ
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI audit (at least one)
ANTHROPIC_API_KEY=sk-ant-...
# GROQ_API_KEY=...
# GOOGLE_GENERATIVE_AI_API_KEY=...

# Embeddings for RAG
# Uses GOOGLE_GENERATIVE_AI_API_KEY above

# Optional
ANTHROPIC_MODEL=claude-haiku-4-5
LEGAL_INGEST_SECRET=your-random-secret
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Database setup

Run migrations in the Supabase SQL Editor (in order):

1. `supabase/migrations/001_contracts.sql`
2. `supabase/migrations/002_legal_documents_pgvector.sql`
3. `supabase/migrations/003_gemini_embeddings_768.sql`

Or run the combined script: `supabase/setup-all.sql`

### 4. Ingest legal knowledge base

Place legal source files in `knowledge-base/` (PDF or TXT), then:

```bash
npm run ingest:legal
```

This ingests `knowledge-base/ИРГЭНИЙ ХУУЛЬ.pdf` by default. See [knowledge-base/README.md](./knowledge-base/README.md) for details.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF contract, and view the audit on the dashboard.

---

## Project structure

```
app/
  api/contracts/upload/   # PDF → Supabase Storage + DB
  api/contracts/audit/      # AI audit + save results
  api/legal/ingest/       # Legal document ingestion
  page.tsx                  # Dashboard (server component)

components/
  contracts/ContractUpload.tsx
  dashboard/                # Metrics, alerts, contract list
  ui/                       # shadcn components

lib/
  audit/                    # Schema, prompts, analyze (RAG)
  services/                 # Client-side API wrappers
  contracts.ts              # Dashboard data fetching
  ai.ts, vector-store.ts    # AI providers + RAG
  supabase-server.ts        # Server/admin Supabase clients
  types/                    # Contract & audit types

knowledge-base/             # Legal source documents
supabase/migrations/        # Database schema
scripts/                    # Ingest & test utilities
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run ingest:legal` | Ingest Civil Code PDF into vector DB |
| `npx tsx --env-file=.env.local scripts/test-audit.ts` | Test audit pipeline |
| `npx tsx --env-file=.env.local scripts/test-env.ts` | Verify env configuration |

---

## Roadmap

- [ ] **Phase 1 — Audit** *(current)* — PDF upload, AI score, alerts, dashboard
- [ ] **Phase 2 — Track** — renewal dates, reminders, contract metadata extraction
- [ ] **Phase 3 — Manage** — search, filters, version history, multi-contract workspace
- [ ] **Phase 4 — Expand** — additional law modules, English UI, international markets

---

## Architecture principles

- **Thin API routes** — business logic lives in `lib/`
- **Law-agnostic audit engine** — knowledge base per jurisdiction (`knowledge-base/`)
- **Global-ready structure** — Mongolian-first UX, prepared for i18n expansion
- **Real data, no demo placeholders** — dashboard reads from Supabase

---

## License

Private — all rights reserved.
