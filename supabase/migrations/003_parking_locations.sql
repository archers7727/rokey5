-- =====================================================
-- 주차 위치 정보 테이블 (preparation + parking 구조)
-- =====================================================

-- 기존 parking_current_status 테이블에 컬럼 추가
ALTER TABLE parking_current_status
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'parking'
    CHECK (location_type IN ('preparation', 'parking'));

-- location_type별 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_parking_location_type ON parking_current_status(location_type);

COMMENT ON COLUMN parking_current_status.location_type IS 'preparation: 대기구역(X_n), parking: 주차칸(X_n_1, X_n_2)';

-- =====================================================
-- preparation 점유 상태 자동 업데이트 함수
-- =====================================================

CREATE OR REPLACE FUNCTION update_preparation_status()
RETURNS TRIGGER AS $$
DECLARE
    prep_spot_id VARCHAR(20);
    child_count INTEGER;
    occupied_count INTEGER;
BEGIN
    -- X_n_1 또는 X_n_2 패턴인 경우에만 처리
    IF NEW.spot_id ~ '^[A-Z]_\d+_[12]$' THEN
        -- preparation spot_id 추출 (예: A_1_1 → A_1)
        prep_spot_id := SUBSTRING(NEW.spot_id FROM '^([A-Z]_\d+)_[12]$');

        -- 해당 preparation의 자식 칸 개수
        SELECT COUNT(*) INTO child_count
        FROM parking_current_status
        WHERE spot_id LIKE prep_spot_id || '_%'
          AND location_type = 'parking';

        -- 점유된 자식 칸 개수
        SELECT COUNT(*) INTO occupied_count
        FROM parking_current_status
        WHERE spot_id LIKE prep_spot_id || '_%'
          AND location_type = 'parking'
          AND is_occupied = true;

        -- 모든 자식이 점유되면 preparation도 true
        UPDATE parking_current_status
        SET is_occupied = (occupied_count = child_count AND child_count > 0)
        WHERE spot_id = prep_spot_id
          AND location_type = 'preparation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (주차 상태 변경 시 preparation 자동 업데이트)
DROP TRIGGER IF EXISTS trigger_update_preparation ON parking_current_status;
CREATE TRIGGER trigger_update_preparation
AFTER UPDATE OF is_occupied ON parking_current_status
FOR EACH ROW
EXECUTE FUNCTION update_preparation_status();

COMMENT ON FUNCTION update_preparation_status IS 'X_n_1, X_n_2가 모두 occupied면 X_n도 true로 자동 업데이트';
