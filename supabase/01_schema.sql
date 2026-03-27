-- ============================================================
-- 01_schema.sql
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- ── 1. permit_records ──────────────────────────────────────
create table if not exists permit_records (
  id             text primary key,          -- 'PM-YYYY-NNN' 형식
  kind           text not null,             -- 종류 (7종 고정값)
  category       text not null,             -- 신규 | 연장 | 내용변경
  advertiser     text not null,
  place          text not null,
  content        text not null,
  quantity       integer not null default 1,
  status         text not null,             -- 상태 (10종 고정값)
  processed_at   date,
  hearing_at     date,
  safety_check   text not null default '확인필요',   -- 대상 | 대상아님 | 확인필요
  renewal_target text not null default '연장대상 아님', -- 연장대상 | 연장대상 아님
  source_type    text not null default 'manual',    -- excel | manual
  created_by     uuid references auth.users,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists permit_records_updated_at on permit_records;
create trigger permit_records_updated_at
  before update on permit_records
  for each row execute function set_updated_at();

-- RLS 활성화 (로그인 사용자만 CRUD)
alter table permit_records enable row level security;

drop policy if exists "authenticated read"   on permit_records;
drop policy if exists "authenticated insert" on permit_records;
drop policy if exists "authenticated update" on permit_records;

create policy "authenticated read"
  on permit_records for select
  using (auth.uid() is not null);

create policy "authenticated insert"
  on permit_records for insert
  with check (auth.uid() is not null);

create policy "authenticated update"
  on permit_records for update
  using (auth.uid() is not null);


-- ── 2. permit_status_history ───────────────────────────────
create table if not exists permit_status_history (
  id          uuid primary key default gen_random_uuid(),
  permit_id   text references permit_records(id) on delete cascade,
  from_status text,          -- null = 최초 등록 이력
  to_status   text not null,
  changed_by  uuid references auth.users,
  changed_at  timestamptz default now(),
  note        text
);

alter table permit_status_history enable row level security;

drop policy if exists "authenticated read"   on permit_status_history;
drop policy if exists "authenticated insert" on permit_status_history;

create policy "authenticated read"
  on permit_status_history for select
  using (auth.uid() is not null);

create policy "authenticated insert"
  on permit_status_history for insert
  with check (auth.uid() is not null);
