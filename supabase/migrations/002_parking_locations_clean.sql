-- =====================================================
-- 주차 위치 시스템 - 깨끗한 마이그레이션
-- =====================================================
-- 실행 순서:
-- 1. 기존 테이블 삭제
-- 2. 새 테이블 생성
-- 3. 샘플 데이터 삽입
-- =====================================================

-- =====================================================
-- 1. 기존 테이블 삭제
-- =====================================================

DROP VIEW IF EXISTS parking_current_status CASCADE;
DROP TABLE IF EXISTS parking_locations CASCADE;

-- =====================================================
-- 2. parking_locations 테이블 생성
-- =====================================================

CREATE TABLE parking_locations (
  location_id VARCHAR(20) PRIMARY KEY,
  location_type VARCHAR(20) NOT NULL,
  zone VARCHAR(10) NOT NULL,
  floor VARCHAR(10) DEFAULT '1F',

  -- ROS2 좌표
  x FLOAT8 NOT NULL,
  y FLOAT8 NOT NULL,
  orientation FLOAT8 NOT NULL DEFAULT 0,

  -- 주차 상태 (parking만 사용)
  is_occupied BOOLEAN,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_location_type CHECK (location_type IN ('preparation', 'parking')),
  CONSTRAINT check_parking_occupied CHECK (
    (location_type = 'preparation' AND is_occupied IS NULL) OR
    (location_type = 'parking' AND is_occupied IS NOT NULL)
  )
);

-- 인덱스
CREATE INDEX idx_parking_locations_type ON parking_locations(location_type);
CREATE INDEX idx_parking_locations_zone ON parking_locations(zone);
CREATE INDEX idx_parking_available ON parking_locations(location_type, is_occupied)
  WHERE location_type = 'parking' AND is_occupied = false;

-- =====================================================
-- 3. parking_current_status VIEW 생성 (기존 코드 호환)
-- =====================================================

CREATE VIEW parking_current_status AS
SELECT
  location_id as spot_id,
  is_occupied,
  zone,
  floor,
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
-- 5. 샘플 데이터 삽입 (A 구역만 예시)
-- =====================================================

-- A_1 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('A_1', 'preparation', 'A', '1F', -1.14, 0.551, 0, NULL),
('A_1_1', 'parking', 'A', '1F', 0.5, 0, 0, false),
('A_1_2', 'parking', 'A', '1F', 1, 0, 0, false);

-- A_2 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('A_2', 'preparation', 'A', '1F', 0, 1.5, 1.57, NULL),
('A_2_1', 'parking', 'A', '1F', 0, 3, 1.57, false),
('A_2_2', 'parking', 'A', '1F', 0, 4, 1.57, false);

-- A_3 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('A_3', 'preparation', 'A', '1F', 3, 0, 0, NULL),
('A_3_1', 'parking', 'A', '1F', 5, 0, 0, false),
('A_3_2', 'parking', 'A', '1F', 6, 0, 0, false);

-- A_4 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('A_4', 'preparation', 'A', '1F', 4.5, 0, 0, NULL),
('A_4_1', 'parking', 'A', '1F', 6.5, 0, 0, false),
('A_4_2', 'parking', 'A', '1F', 7.5, 0, 0, false);

-- B_1 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('B_1', 'preparation', 'B', '1F', 5, 0, 1.57, NULL),
('B_1_1', 'parking', 'B', '1F', 5, 1.5, 1.57, false),
('B_1_2', 'parking', 'B', '1F', 5, 2.5, 1.57, false);

-- B_2 그룹
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
('B_2', 'preparation', 'B', '1F', 5, 1.5, 1.57, NULL),
('B_2_1', 'parking', 'B', '1F', 5, 4, 1.57, false),
('B_2_2', 'parking', 'B', '1F', 5, 5, 1.57, false);

-- =====================================================
-- 6. 유틸리티 함수
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
-- 완료 - 확인 쿼리
-- =====================================================

-- 전체 위치 확인
SELECT location_id, location_type, zone, x, y, is_occupied
FROM parking_locations
ORDER BY location_id;

-- VIEW 확인
SELECT * FROM parking_current_status ORDER BY spot_id;
