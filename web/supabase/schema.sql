create extension if not exists pgcrypto;

create type public.user_role as enum ('staff', 'admin');

create type public.permit_kind as enum (
  '벽면이용간판',
  '돌출간판',
  '입간판',
  '지주간판',
  '옥상간판',
  '공공시설물이용 광고물',
  '교통수단이용 광고물'
);

create type public.permit_category as enum ('신규', '연장', '내용변경');

create type public.permit_status as enum (
  '접수',
  '공문발송',
  '내용보완',
  '본심의상정예정',
  '서울시심의 상정예정',
  '소심의 상정예정',
  '연장고지서 및 안전점검의뢰',
  '우편발송예정',
  '이메일 발송완료',
  '직접방문수령'
);

create type public.safety_check_status as enum ('대상', '대상아님', '확인필요');

create type public.renewal_target_status as enum ('연장대상', '연장대상 아님');

create type public.record_source_type as enum ('excel', 'manual');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text,
  role public.user_role not null default 'staff',
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_domain_check
    check (email ~* '^[A-Z0-9._%+-]+@gangnam\.go\.kr$')
);

create table if not exists public.permit_records (
  id uuid primary key default gen_random_uuid(),
  record_no text not null unique,
  kind public.permit_kind not null,
  category public.permit_category not null,
  advertiser text not null,
  place text not null,
  content text not null,
  size_text text,
  quantity integer not null default 1 check (quantity > 0),
  status public.permit_status not null,
  processed_at date,
  hearing_at date,
  safety_check public.safety_check_status not null default '확인필요',
  renewal_target public.renewal_target_status not null default '연장대상 아님',
  phone text,
  notes text,
  source_type public.record_source_type not null default 'manual',
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  permit_record_id uuid not null references public.permit_records(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action_type text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists permit_records_status_idx
  on public.permit_records(status);

create index if not exists permit_records_kind_idx
  on public.permit_records(kind);

create index if not exists permit_records_category_idx
  on public.permit_records(category);

create index if not exists permit_records_processed_at_idx
  on public.permit_records(processed_at desc);

create index if not exists permit_records_hearing_at_idx
  on public.permit_records(hearing_at);

create index if not exists activity_logs_permit_record_id_idx
  on public.activity_logs(permit_record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '^[A-Z0-9._%+-]+@gangnam\.go\.kr$' then
    raise exception 'Only @gangnam.go.kr email addresses are allowed.';
  end if;

  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        name = coalesce(public.profiles.name, excluded.name),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists permit_records_set_updated_at on public.permit_records;
create trigger permit_records_set_updated_at
  before update on public.permit_records
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.permit_records enable row level security;
alter table public.activity_logs enable row level security;

create policy "authenticated users can read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "authenticated users can read permits"
  on public.permit_records
  for select
  to authenticated
  using (true);

create policy "authenticated users can insert permits"
  on public.permit_records
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "authenticated users can update permits"
  on public.permit_records
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "admins can delete permits"
  on public.permit_records
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "authenticated users can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (true);

create policy "authenticated users can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);
