-- 배당금 테이블에 상세 정보 필드 추가
-- 2025-10-31: 배당금 자동 가져오기 개선

-- dividends 테이블에 새로운 컬럼 추가
ALTER TABLE dividends ADD COLUMN amount_per_share FLOAT;
ALTER TABLE dividends ADD COLUMN shares_held FLOAT;
ALTER TABLE dividends ADD COLUMN tax_withheld_usd FLOAT;

-- cash 테이블에 배당금 연결 컬럼 추가
ALTER TABLE cash ADD COLUMN related_dividend_id INTEGER;

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_cash_related_dividend ON cash(related_dividend_id);

