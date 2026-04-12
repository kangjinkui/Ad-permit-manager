-- ============================================================
-- 10_migration_staff_title.sql
-- profiles 테이블에 직급(title) 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ============================================================

alter table public.profiles
  add column if not exists title text;
