-- 담당자 검토의견 컬럼 추가
ALTER TABLE permit_records ADD COLUMN IF NOT EXISTS review_opinion TEXT;
