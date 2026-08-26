# GereeZ

**Гэрээгээ бүрэн уншиж амжаагүй юу? Зүгээрээ — GereeZ таны өмнөөс шалгаад, эрсдэлийг ойлгомжтой харуулна.**

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

- Public landing page at `/` (the signed-in app lives at `/app`)
- PDF or image contract upload (drag & drop, max 20 MB; scanned/image files are OCR'd with Google Cloud Vision, up to 50 scanned pages)
- AI legal audit with compliance score (0–100)
- Severity-based audit findings (`high`, `medium`, `low`, `info`) with law references
- RAG pipeline against **Иргэний хууль** (Civil Code) via Supabase pgvector
- Contract metadata extraction (parties, rent, deposit, dates, payment day, notice period) with expiry tracking
- Notification feed of app-raised reminders, never a copy of the audit — audit findings stay on the audit screen and never appear here. It carries approaching deadlines (expiry countdown at 30/14/3/1/0 days then expired, notice-window warning, monthly payment-day reminder, deposit-return reminder after expiry) plus the account-level things the app has to raise itself (stranded or failed audits, low credit balance, a cited law that was re-ingested). Read-state persisted
- Credit-based pay-per-audit flow: 1 page = 1 credit, quote → confirm → audit (demo top-up for now — no payment provider yet)
- Contract and account deletion, password reset, editable profile name
- Installable as a PWA (web app manifest + icons)
- Supabase Storage for PDFs + Postgres for audit results

---

## Tech stack

| Layer | Tools |
|-------|--------|
| Frontend | Next.js 16, React 19, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes, Supabase (Postgres + Storage) |
| AI | Vercel AI SDK — Anthropic / Google |
| RAG | Gemini embeddings (768d), pgvector, PDF text extraction |
| Language | Mongolian UI (global-ready structure planned) |

---

## Getting started

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) project
- At least one AI provider key: `ANTHROPIC_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`
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
# GOOGLE_GENERATIVE_AI_API_KEY=...

# Embeddings for RAG
# Uses GOOGLE_GENERATIVE_AI_API_KEY above

# OCR for scanned PDFs and images — a GCP Console key scoped to the
# Cloud Vision API (NOT a Gemini/AI Studio key)
GOOGLE_VISION_API_KEY=...

# Optional
ANTHROPIC_MODEL=claude-haiku-4-5
LEGAL_INGEST_SECRET=your-random-secret
DEMO_MODE=false
NEXT_PUBLIC_DEMO_UI=false
```

### 3. Database setup

For a fresh project, run the combined script `supabase/setup-all.sql` in the
Supabase SQL Editor — it covers everything: contracts + private bucket +
per-user RLS, the pgvector legal store, site content, rate limits, credits
(010), contract tracking dates (011), alert read-state (012), law version
stamps for notifications (013), and the updated_at trigger plus audit
timestamp (014).

For an existing project, apply only the new numbered files from
`supabase/migrations/` in order.

### 3a. Enable authentication

GereeZ requires users to sign in — uploads, audits, and the dashboard are all
gated. In the Supabase dashboard go to **Authentication → Providers → Email** and
enable **Email + Password**. Email confirmation is optional; if left on, new users
must confirm their address before signing in.

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
  page.tsx                  # Public landing page (static)
  (app)/app/page.tsx        # Dashboard (server component)

components/
  landing/                  # Landing page sections
  app/screens/              # Home, contracts, audit, alerts, settings
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
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest, in `tests/`) |
| `npm run ingest:legal` | Ingest Civil Code PDF into vector DB |
| `npx tsx --env-file=.env.local scripts/test-env.ts` | Verify env configuration |

CI (GitHub Actions) runs lint + type-check + tests on every push and PR —
see `.github/workflows/ci.yml`.

---

## Roadmap

- [x] **Phase 1 — Audit** — PDF upload, AI score, alerts, dashboard
- [x] **Phase 2 — Track** — expiry dates, contract metadata extraction, in-app alerts
- [ ] **Phase 3 — Monetize** — real payment provider (QPay), и-баримт, email/push reminders
- [ ] **Phase 4 — Manage** — search, filters, version history, multi-contract workspace
- [ ] **Phase 5 — Expand** — additional law modules, English UI, international markets

---

## Architecture principles

- **Thin API routes** — business logic lives in `lib/`
- **Law-agnostic audit engine** — knowledge base per jurisdiction (`knowledge-base/`)
- **Global-ready structure** — Mongolian-first UX, prepared for i18n expansion
- **Real data, no demo placeholders** — dashboard reads from Supabase

---

## License

Private — all rights reserved.
