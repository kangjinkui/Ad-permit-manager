create table if not exists public.fee_calculations (
  id uuid primary key default gen_random_uuid(),
  permit_record_no text references public.permit_records(record_no) on delete set null,
  fee_sign_type text not null,
  permit_kind_snapshot text,
  category_snapshot text,
  input_data jsonb not null,
  permit_fee integer,
  safety_fee integer,
  total_fee integer,
  change_fee integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists fee_calculations_permit_record_no_idx
  on public.fee_calculations(permit_record_no, created_at desc);

create index if not exists fee_calculations_created_by_idx
  on public.fee_calculations(created_by, created_at desc);

alter table public.fee_calculations enable row level security;

create policy "active users can read fee calculations"
  on public.fee_calculations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );

create policy "active users can insert fee calculations"
  on public.fee_calculations
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and status = 'active'
    )
  );
