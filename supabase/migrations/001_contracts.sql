-- Gereez: contracts table + storage bucket
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

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

-- Public read for dashboard (tighten when auth is added)
create policy "Allow public read access on contracts"
  on public.contracts for select
  using (true);

-- Storage bucket for PDF contracts
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do nothing;

-- Allow public read of uploaded PDFs (service role bypasses RLS for uploads)
create policy "Allow public read on contract files"
  on storage.objects for select
  using (bucket_id = 'contracts');
