-- ============================================================
-- 05_migration_history_rls.sql
-- permit_status_history RLS 정책 추가
-- 이력 조회/삽입이 안 되는 경우 Supabase SQL Editor에서 실행
-- ============================================================

-- RLS 활성화
alter table public.permit_status_history enable row level security;

-- 기존 정책 정리
drop policy if exists "authenticated read" on public.permit_status_history;
drop policy if exists "authenticated insert" on public.permit_status_history;
drop policy if exists "active users can read history" on public.permit_status_history;
drop policy if exists "active users can insert history" on public.permit_status_history;
drop policy if exists "admins can delete history" on public.permit_status_history;

-- active 사용자: 이력 읽기
create policy "active users can read history"
  on public.permit_status_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

-- active 사용자: 이력 삽입
create policy "active users can insert history"
  on public.permit_status_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

-- admin: 이력 삭제 (허가 삭제 시 연쇄)
create policy "admins can delete history"
  on public.permit_status_history
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
