-- 옥상간판 등 다면 광고물 규격/조명 저장
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'permit_kind'
  ) THEN
    ALTER TYPE public.permit_kind ADD VALUE IF NOT EXISTS '현수막게시틀';
  END IF;
END
$$;

ALTER TABLE public.permit_records
  ADD COLUMN IF NOT EXISTS sign_faces jsonb;
