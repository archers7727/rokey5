-- =====================================================
-- 주차 위치 정보 테이블 (preparation + parking 구조)
-- =====================================================

-- parking_locations 테이블은 이미 존재함
-- location_type, is_occupied 컬럼도 이미 존재

-- location_type별 인덱스 추가 (없으면)
CREATE INDEX IF NOT EXISTS idx_parking_location_type ON parking_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_parking_is_occupied ON parking_locations(is_occupied);

COMMENT ON COLUMN parking_locations.location_type IS 'preparation: 대기구역(X_n), parking: 주차칸(X_n_1, X_n_2)';

-- =====================================================
-- preparation 점유 상태 자동 업데이트 함수
-- =====================================================

CREATE OR REPLACE FUNCTION update_preparation_status()
RETURNS TRIGGER AS $$
DECLARE
    prep_location_id VARCHAR(20);
    child_count INTEGER;
    occupied_count INTEGER;
BEGIN
    -- X_n_1 또는 X_n_2 패턴인 경우에만 처리
    IF NEW.location_id ~ '^[A-Z]_\d+_[12]$' THEN
        -- preparation location_id 추출 (예: A_1_1 → A_1)
        prep_location_id := SUBSTRING(NEW.location_id FROM '^([A-Z]_\d+)_[12]$');

        -- 해당 preparation의 자식 칸 개수
        SELECT COUNT(*) INTO child_count
        FROM parking_locations
        WHERE location_id LIKE prep_location_id || '_%'
          AND location_type = 'parking';

        -- 점유된 자식 칸 개수
        SELECT COUNT(*) INTO occupied_count
        FROM parking_locations
        WHERE location_id LIKE prep_location_id || '_%'
          AND location_type = 'parking'
          AND is_occupied = true;

        -- 모든 자식이 점유되면 preparation도 true
        UPDATE parking_locations
        SET is_occupied = (occupied_count = child_count AND child_count > 0),
            last_updated = NOW()
        WHERE location_id = prep_location_id
          AND location_type = 'preparation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성 (주차 상태 변경 시 preparation 자동 업데이트)
DROP TRIGGER IF EXISTS trigger_update_preparation ON parking_locations;
CREATE TRIGGER trigger_update_preparation
AFTER UPDATE OF is_occupied ON parking_locations
FOR EACH ROW
EXECUTE FUNCTION update_preparation_status();

COMMENT ON FUNCTION update_preparation_status IS 'X_n_1, X_n_2가 모두 occupied면 X_n도 true로 자동 업데이트';
