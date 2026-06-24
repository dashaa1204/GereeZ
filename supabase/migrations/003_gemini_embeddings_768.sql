-- Gereez: switch embeddings to Google Gemini text-embedding-004 (768 dims)
-- Run in Supabase SQL Editor if you already ran the 1536-dim setup

drop function if exists public.match_legal_documents;

drop table if exists public.legal_documents;

create extension if not exists vector with schema extensions;

create table public.legal_documents (
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
