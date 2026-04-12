-- 소심의 의결서 자동 생성을 위한 광고물 규격/조명 필드 추가
ALTER TABLE permit_records
  ADD COLUMN IF NOT EXISTS width   numeric,
  ADD COLUMN IF NOT EXISTS height  numeric,
  ADD COLUMN IF NOT EXISTS lighting text
    CHECK (lighting IN ('비조명', '내부조명', '외부조명'));
