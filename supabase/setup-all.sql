-- ============================================================
-- Gereez: FULL DATABASE SETUP
-- Copy ALL of this file into Supabase → SQL Editor → Run
-- ============================================================

-- ---------- 001: Contracts + Storage ----------

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text,
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
create index if not exists contracts_user_id_idx on public.contracts (user_id);

alter table public.contracts enable row level security;

-- Per-user access — only the owner can read/write their contracts.
create policy "Users read own contracts"
  on public.contracts for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own contracts"
  on public.contracts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own contracts"
  on public.contracts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own contracts"
  on public.contracts for delete
  to authenticated
  using (auth.uid() = user_id);

-- Private bucket — contract files are reachable only via short-lived signed
-- URLs minted server-side. No public-read policy on storage.objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  false,
  20971520,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

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

-- ---------- 007: Rate limiting (per-user, DB-backed) ----------

create table if not exists public.rate_limits (
  id bigint generated always as identity primary key,
  bucket text not null,
  subject text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on public.rate_limits (bucket, subject, created_at desc);

alter table public.rate_limits enable row level security;
-- No policies: only the service-role client (API routes) accesses this table.

create or replace function public.check_rate_limit(
  p_bucket text,
  p_subject text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
as $$
declare
  v_count int;
begin
  delete from public.rate_limits
    where bucket = p_bucket
      and subject = p_subject
      and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into v_count
    from public.rate_limits
    where bucket = p_bucket
      and subject = p_subject;

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limits (bucket, subject)
    values (p_bucket, p_subject);

  return true;
end;
$$;

-- ---------- 010: Credits (pay-per-audit) ----------

create table if not exists public.user_credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

alter table public.user_credits enable row level security;

drop policy if exists "read own credits" on public.user_credits;
create policy "read own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

create table if not exists public.credit_charges (
  contract_id uuid primary key references public.contracts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.credit_charges enable row level security;
-- No policies on purpose: only the service-role client (API routes) touches it.

alter table public.contracts add column if not exists page_count integer;

create or replace function public.grant_initial_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, balance)
  values (new.id, 100)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_grant_credits on auth.users;
create trigger on_auth_user_created_grant_credits
  after insert on auth.users
  for each row execute function public.grant_initial_credits();

insert into public.user_credits (user_id, balance)
select id, 100 from auth.users
on conflict (user_id) do nothing;

create or replace function public.charge_credits(
  p_user uuid,
  p_contract uuid,
  p_amount integer
) returns integer
language plpgsql
as $$
declare
  v_balance integer;
begin
  if exists (select 1 from public.credit_charges where contract_id = p_contract) then
    select balance into v_balance from public.user_credits where user_id = p_user;
    return coalesce(v_balance, 0);
  end if;

  select balance into v_balance from public.user_credits
    where user_id = p_user
    for update;

  if v_balance is null then
    insert into public.user_credits (user_id, balance) values (p_user, 0)
      on conflict (user_id) do nothing;
    v_balance := 0;
  end if;

  if v_balance < p_amount then
    return -1; -- insufficient funds; caller rejects without auditing
  end if;

  update public.user_credits
    set balance = balance - p_amount, updated_at = now()
    where user_id = p_user;

  insert into public.credit_charges (contract_id, user_id, amount)
    values (p_contract, p_user, p_amount);

  return v_balance - p_amount;
end;
$$;

create or replace function public.refund_credits(
  p_contract uuid
) returns integer
language plpgsql
as $$
declare
  v_user uuid;
  v_amount integer;
  v_balance integer;
begin
  delete from public.credit_charges
    where contract_id = p_contract
    returning user_id, amount into v_user, v_amount;

  if v_user is null then
    return null; -- nothing to refund
  end if;

  update public.user_credits
    set balance = balance + v_amount, updated_at = now()
    where user_id = v_user
    returning balance into v_balance;

  return v_balance;
end;
$$;

create or replace function public.recharge_credits(
  p_user uuid,
  p_amount integer
) returns integer
language plpgsql
as $$
declare
  v_balance integer;
begin
  insert into public.user_credits (user_id, balance)
  values (p_user, p_amount)
  on conflict (user_id) do update
    set balance = public.user_credits.balance + excluded.balance,
        updated_at = now();

  select balance into v_balance from public.user_credits where user_id = p_user;
  return v_balance;
end;
$$;

-- ---------- 011: Contract tracking (expiry dates) ----------

alter table public.contracts add column if not exists start_date date;
alter table public.contracts add column if not exists end_date date;

create index if not exists contracts_end_date_idx
  on public.contracts (end_date)
  where end_date is not null;

-- ---------- 012: Alert read-state ----------

create table if not exists public.alert_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, alert_id)
);

alter table public.alert_reads enable row level security;

drop policy if exists "read own alert reads" on public.alert_reads;
create policy "read own alert reads"
  on public.alert_reads for select
  using (auth.uid() = user_id);

-- Gereez: expose when each law was last ingested
-- The notification feed warns a user when a law their audit cited has been
-- re-ingested since the audit ran (lawUpdateAlerts in lib/notifications.ts).
-- ingestLegalText replaces a law's rows wholesale, so max(created_at) per
-- law_name is that law's current version stamp.
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query).

create or replace function public.law_last_updated()
returns table (law_name text, last_updated timestamptz)
language sql
stable
set search_path = public
as $$
  select ld.law_name, max(ld.created_at) as last_updated
  from public.legal_documents ld
  group by ld.law_name;
$$;

-- ---------- 014: updated_at trigger + audit timestamp ----------
-- `updated_at` used to be written by hand, so any write that forgot left it
-- frozen at the upload time — which broke the failed-audit alert id and the
-- stranded-audit sweep. The trigger makes the stamp unforgettable.
--
-- `audited_at` then holds what `updated_at` used to be borrowed for: when the
-- audit actually ran, which lawUpdateAlerts (lib/notifications.ts) compares
-- against the law's last ingest. Any other write to the row now moves
-- `updated_at`, so the audit time needs a column of its own.

alter table public.contracts add column if not exists audited_at timestamptz;

update public.contracts
  set audited_at = updated_at
  where status = 'completed' and audited_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();
