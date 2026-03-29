-- ============================================================
-- 04_migration_text_columns.sql
-- permit_status, permit_kind, permit_category enum → text 전환
-- 실제 업무 데이터의 다양한 값을 수용하기 위함
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. permit_records의 enum 컬럼을 text로 변환
ALTER TABLE public.permit_records
  ALTER COLUMN status TYPE text,
  ALTER COLUMN kind TYPE text,
  ALTER COLUMN category TYPE text;

-- 2. enum 타입 삭제
DROP TYPE IF EXISTS public.permit_status;
DROP TYPE IF EXISTS public.permit_kind;
DROP TYPE IF EXISTS public.permit_category;
