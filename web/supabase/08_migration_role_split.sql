-- ============================================================
-- 08_migration_role_split.sql
-- admin은 사용자 승인/거절 + 업무 기능 가능
-- staff는 업무 기능 가능, 사용자 승인/거절은 불가
-- Supabase SQL Editor에서 실행
-- ============================================================

drop policy if exists "active users can read permits" on public.permit_records;
drop policy if exists "active users can insert permits" on public.permit_records;
drop policy if exists "active users can update permits" on public.permit_records;
drop policy if exists "admins can delete permits" on public.permit_records;
drop policy if exists "staff can delete permits" on public.permit_records;
drop policy if exists "active users can delete permits" on public.permit_records;

create policy "active users can read permits"
  on public.permit_records
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can insert permits"
  on public.permit_records
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can update permits"
  on public.permit_records
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can delete permits"
  on public.permit_records
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

alter table public.permit_status_history enable row level security;

drop policy if exists "active users can read history" on public.permit_status_history;
drop policy if exists "active users can insert history" on public.permit_status_history;
drop policy if exists "admins can delete history" on public.permit_status_history;
drop policy if exists "staff can read history" on public.permit_status_history;
drop policy if exists "staff can insert history" on public.permit_status_history;
drop policy if exists "staff can delete history" on public.permit_status_history;
drop policy if exists "active users can delete history" on public.permit_status_history;

create policy "active users can read history"
  on public.permit_status_history
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can insert history"
  on public.permit_status_history
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can delete history"
  on public.permit_status_history
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

drop policy if exists "active users can read activity logs" on public.activity_logs;
drop policy if exists "active users can insert activity logs" on public.activity_logs;

create policy "active users can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

drop policy if exists "active users can read fee calculations" on public.fee_calculations;
drop policy if exists "active users can insert fee calculations" on public.fee_calculations;

create policy "active users can read fee calculations"
  on public.fee_calculations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );

create policy "active users can insert fee calculations"
  on public.fee_calculations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    )
  );
