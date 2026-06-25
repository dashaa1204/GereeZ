-- ============================================================
-- Gereez: FULL DATABASE SETUP
-- Copy ALL of this file into Supabase → SQL Editor → Run
-- ============================================================

-- ---------- 001: Contracts + Storage ----------

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_url text not null,
  storage_path text not null,
  compliance_score integer check (compliance_score >= 0 and compliance_score <= 100),
  audit_summary jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_status_idx on public.contracts (status);
create index if not exists contracts_created_at_idx on public.contracts (created_at desc);

alter table public.contracts enable row level security;

create policy "Allow public read access on contracts"
  on public.contracts for select
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "Allow public read on contract files"
  on storage.objects for select
  using (bucket_id = 'contracts');

-- ---------- 002: Legal documents + pgvector ----------

create extension if not exists vector with schema extensions;

create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  law_name text not null,
  article_number text,
  section_title text,
  content text not null,
  metadata jsonb not null default '{}',
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists legal_documents_law_name_idx
  on public.legal_documents (law_name);

create index if not exists legal_documents_article_number_idx
  on public.legal_documents (article_number);

create index if not exists legal_documents_embedding_idx
  on public.legal_documents
  using ivfflat (embedding extensions.vector_cosine_ops)
  with (lists = 100);

alter table public.legal_documents enable row level security;

create policy "Allow public read on legal documents"
  on public.legal_documents for select
  using (true);

create or replace function public.match_legal_documents (
  query_embedding extensions.vector(768),
  match_threshold float default 0.35,
  match_count int default 12,
  filter_law_name text default null
)
returns table (
  id uuid,
  law_name text,
  article_number text,
  section_title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    ld.id,
    ld.law_name,
    ld.article_number,
    ld.section_title,
    ld.content,
    ld.metadata,
    1 - (ld.embedding <=> query_embedding) as similarity
  from public.legal_documents ld
  where
    (filter_law_name is null or ld.law_name = filter_law_name)
    and 1 - (ld.embedding <=> query_embedding) > match_threshold
  order by ld.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------- 004: Site content (disclaimer, privacy, terms) ----------

create table if not exists public.site_content (
  slug text primary key
    check (slug in ('disclaimer', 'privacy_policy', 'terms_of_service')),
  title text not null,
  content text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

create policy "Allow public read on site content"
  on public.site_content for select
  using (true);

insert into public.site_content (slug, title, content) values
(
  'disclaimer',
  'Анхааруулга',
  'GereeZ платформ нь AI технологид суурилсан гэрээний туслах хэрэгсэл бөгөөд хууль зүйн зөвлөгөө өгөх эрх бүхий байгууллага биш.

• GereeZ-ийн шинжилгээ, оноо, анхааруулга нь зөвхөн мэдээллийн зорилготой.
• AI систем алдаа гаргах, бүрэн бус мэдээлэл өгөх боломжтой.
• Мэргэжлийн хууль зүйн зөвлөхөд хандахыг зөвлөж байна.

Энэ анхааруулгыг уншиж, ойлгосны дараа үйлчилгээг ашиглана уу.'
),
(
  'privacy_policy',
  'Нууцлалын бодлого',
  'GereeZ таны нууцлалыг хүндэтгэн хамгаална. Оруулсан PDF, шинжилгээний үр дүн зөвхөн үйлчилгээний зорилгоор ашиглагдана.'
),
(
  'terms_of_service',
  'Үйлчилгээний нөхцөл',
  'GereeZ платформыг ашигласнаар та үйлчилгээний нөхцөлийг хүлээн зөвшөөрсөнд тооцогдоно. Шинжилгээний үр дүнг мэргэжлийн зөвлөгөөний оронд ашиглахгүй байна.'
)
on conflict (slug) do nothing;
