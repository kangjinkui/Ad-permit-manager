-- 06_migration_fees.sql
-- 허가수수료, 안전점검 수수료 컬럼 추가
alter table public.permit_records
  add column if not exists permit_fee integer,
  add column if not exists safety_fee integer;
