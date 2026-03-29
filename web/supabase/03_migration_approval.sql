-- 기존 DB에 승인 기반 인증 구조를 추가하는 마이그레이션
-- Supabase SQL Editor에서 순서대로 실행

-- 1. user_status ENUM 추가
create type public.user_status as enum ('pending', 'active', 'rejected');

-- 2. 이메일 도메인 제약 제거 (도메인 제한 폐지)
alter table public.profiles drop constraint if exists profiles_email_domain_check;

-- 3. name NOT NULL 변경 — 기존 null 값 먼저 채움
update public.profiles
set name = split_part(email, '@', 1)
where name is null or trim(name) = '';

alter table public.profiles alter column name set not null;

-- 4. status 컬럼 추가 — 기존 사용자는 active로 보호
alter table public.profiles
  add column status public.user_status not null default 'active';

-- 5. handle_new_user trigger 수정 — 도메인 검사 제거, status = pending으로 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, status)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      split_part(new.email, '@', 1)
    ),
    'pending'
  )
  on conflict (id) do update
    set email      = excluded.email,
        name       = coalesce(nullif(trim(public.profiles.name), ''), excluded.name),
        updated_at = now();

  return new;
end;
$$;

-- 6. RLS 정책 재작성

-- profiles: admin이 모든 프로필 수정 가능 정책 추가
create policy "admins can update any profile"
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
        and status = 'active'
    )
  );

-- permit_records 기존 정책 교체 (active 사용자만)
drop policy if exists "authenticated users can read permits" on public.permit_records;
drop policy if exists "authenticated users can insert permits" on public.permit_records;
drop policy if exists "authenticated users can update permits" on public.permit_records;
drop policy if exists "admins can delete permits" on public.permit_records;

create policy "active users can read permits"
  on public.permit_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

create policy "active users can insert permits"
  on public.permit_records
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

create policy "active users can update permits"
  on public.permit_records
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

create policy "admins can delete permits"
  on public.permit_records
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
        and status = 'active'
    )
  );

-- activity_logs 기존 정책 교체
drop policy if exists "authenticated users can read activity logs" on public.activity_logs;
drop policy if exists "authenticated users can insert activity logs" on public.activity_logs;

create policy "active users can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

create policy "active users can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

-- 7. 최초 슈퍼유저 설정 (이메일 주소를 실제 값으로 변경 후 실행)
-- update public.profiles
-- set role = 'admin', status = 'active', name = '강진규'
-- where email = 'superuser@example.com';
