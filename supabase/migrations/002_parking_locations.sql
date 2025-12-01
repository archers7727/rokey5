-- =====================================================
-- 주차 위치 시스템 마이그레이션
-- =====================================================
-- 설명:
-- - 준비 좌표(preparation)와 주차 공간(parking)을 하나의 테이블로 통합
-- - 모든 위치에 ROS2 좌표 정보 포함
-- - 기존 parking_current_status를 VIEW로 변환하여 호환성 유지
-- =====================================================

-- =====================================================
-- 1. 새로운 parking_locations 테이블 생성
-- =====================================================

CREATE TABLE IF NOT EXISTS parking_locations (
  location_id VARCHAR(20) PRIMARY KEY,     -- 'A_1', 'A_1_1', 'A_1_2' 등
  location_type VARCHAR(20) NOT NULL,      -- 'preparation' 또는 'parking'
  zone VARCHAR(10) NOT NULL,               -- 'A', 'B', 'C'
  floor VARCHAR(10) DEFAULT '1F',

  -- ROS2 좌표 (모든 위치에 필수)
  x FLOAT8 NOT NULL,
  y FLOAT8 NOT NULL,
  orientation FLOAT8 NOT NULL DEFAULT 0,   -- 라디안 (기본값 0)

  -- 주차 상태 (parking 타입만 사용, preparation은 NULL)
  is_occupied BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT NOW(),

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT check_location_type CHECK (location_type IN ('preparation', 'parking')),
  CONSTRAINT check_parking_occupied CHECK (
    (location_type = 'preparation' AND is_occupied IS NULL) OR
    (location_type = 'parking' AND is_occupied IS NOT NULL)
  )
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_parking_locations_type ON parking_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_parking_locations_zone ON parking_locations(zone);
CREATE INDEX IF NOT EXISTS idx_parking_available ON parking_locations(location_type, is_occupied)
  WHERE location_type = 'parking' AND is_occupied = false;

-- =====================================================
-- 2. 기존 parking_current_status 데이터 마이그레이션
-- =====================================================

-- 기존 테이블이 있으면 데이터 복사
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied, last_updated)
SELECT
  spot_id as location_id,
  'parking' as location_type,
  zone,
  floor,
  x,
  y,
  COALESCE(orient, 0) as orientation,
  is_occupied,
  last_updated
FROM parking_current_status
WHERE spot_id LIKE '%_%_%'  -- A_1_1 형태만 (주차 공간)
ON CONFLICT (location_id) DO NOTHING;

-- 준비 좌표 데이터 추가 (A_1, A_2 등)
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied)
SELECT DISTINCT
  SUBSTRING(spot_id FROM 1 FOR LENGTH(spot_id) - 2) as location_id,  -- A_1_1 -> A_1
  'preparation' as location_type,
  zone,
  floor,
  x - 1.0 as x,  -- 준비 좌표는 주차 공간보다 1m 앞
  y,
  COALESCE(orient, 0) as orientation,
  NULL as is_occupied
FROM parking_current_status
WHERE spot_id LIKE '%_%_%'
ON CONFLICT (location_id) DO NOTHING;

-- =====================================================
-- 3. 기존 parking_current_status를 VIEW로 변환
-- =====================================================

-- 기존 테이블 삭제 (외래키 제약 포함)
DROP TABLE IF EXISTS parking_current_status CASCADE;

-- VIEW로 재생성 (기존 코드 호환성 유지)
CREATE VIEW parking_current_status AS
SELECT
  location_id as spot_id,
  is_occupied,
  zone,
  floor,
  x,
  y,
  orientation as orient,
  last_updated
FROM parking_locations
WHERE location_type = 'parking';

-- =====================================================
-- 4. 트리거: last_updated 자동 업데이트
-- =====================================================

CREATE OR REPLACE FUNCTION update_parking_location_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parking_location_timestamp
  BEFORE UPDATE ON parking_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_parking_location_timestamp();

-- =====================================================
-- 5. 유틸리티 함수: 이용 가능한 주차 공간과 준비 좌표 찾기
-- =====================================================

CREATE OR REPLACE FUNCTION get_available_parking_with_prep()
RETURNS TABLE (
  prep_location_id VARCHAR(20),
  prep_x FLOAT8,
  prep_y FLOAT8,
  prep_orientation FLOAT8,
  parking_location_id VARCHAR(20),
  parking_x FLOAT8,
  parking_y FLOAT8,
  parking_orientation FLOAT8
) AS $$
BEGIN
  RETURN QUERY
  WITH available_space AS (
    SELECT * FROM parking_locations
    WHERE location_type = 'parking' AND is_occupied = false
    ORDER BY location_id
    LIMIT 1
  )
  SELECT
    prep.location_id,
    prep.x, prep.y, prep.orientation,
    park.location_id,
    park.x, park.y, park.orientation
  FROM available_space park
  JOIN parking_locations prep
    ON prep.location_id = REGEXP_REPLACE(park.location_id, '_\d+$', '')
    AND prep.location_type = 'preparation';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 완료
-- =====================================================

COMMENT ON TABLE parking_locations IS '주차장 모든 위치 정보 (준비 좌표 + 주차 공간)';
COMMENT ON COLUMN parking_locations.location_type IS 'preparation: 로봇 대기 위치, parking: 실제 주차 공간';
COMMENT ON VIEW parking_current_status IS '기존 코드 호환용 VIEW (parking 타입만 표시)';
