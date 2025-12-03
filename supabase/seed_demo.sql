-- =====================================================
-- 전체 데이터베이스 리셋 및 시연용 데이터 생성
-- =====================================================
-- 목표:
-- - 10명의 고객 (customer1, 2, 3는 로그인 가능)
-- - 9대 주차 중 (customer1, 2, 4~9)
-- - customer3는 나중에 입차 시나리오용 (주차 안 됨)
-- - A, B, C 구역에 랜덤 배치
-- =====================================================

-- =====================================================
-- 1. 모든 데이터 삭제 (순서 중요 - 외래키 때문)
-- =====================================================

TRUNCATE TABLE payment_logs CASCADE;
TRUNCATE TABLE parking_fees CASCADE;
TRUNCATE TABLE parking_sessions CASCADE;
TRUNCATE TABLE parking_events CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE payment_methods CASCADE;
TRUNCATE TABLE customers CASCADE;
DELETE FROM parking_locations;

-- =====================================================
-- 2. 주차 공간 생성 (좌표 포함)
-- =====================================================

-- A구역: 4그룹 x 2공간 = 8개 주차 공간
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
-- A_1 그룹
('A_1', 'preparation', 'A', '1F', 0, 0, 0, NULL),
('A_1_1', 'parking', 'A', '1F', 1.5, 0, 0, false),
('A_1_2', 'parking', 'A', '1F', 3, 0, 0, false),
-- A_2 그룹
('A_2', 'preparation', 'A', '1F', 0, 2, 1.57, NULL),
('A_2_1', 'parking', 'A', '1F', 0, 3.5, 1.57, false),
('A_2_2', 'parking', 'A', '1F', 0, 5, 1.57, false),
-- A_3 그룹
('A_3', 'preparation', 'A', '1F', 5, 0, 0, NULL),
('A_3_1', 'parking', 'A', '1F', 6.5, 0, 0, false),
('A_3_2', 'parking', 'A', '1F', 8, 0, 0, false),
-- A_4 그룹
('A_4', 'preparation', 'A', '1F', 5, 2, 1.57, NULL),
('A_4_1', 'parking', 'A', '1F', 5, 3.5, 1.57, false),
('A_4_2', 'parking', 'A', '1F', 5, 5, 1.57, false);

-- B구역: 4그룹 x 2공간 = 8개 주차 공간
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
-- B_1 그룹
('B_1', 'preparation', 'B', '1F', 10, 0, 0, NULL),
('B_1_1', 'parking', 'B', '1F', 11.5, 0, 0, false),
('B_1_2', 'parking', 'B', '1F', 13, 0, 0, false),
-- B_2 그룹
('B_2', 'preparation', 'B', '1F', 10, 2, 1.57, NULL),
('B_2_1', 'parking', 'B', '1F', 10, 3.5, 1.57, false),
('B_2_2', 'parking', 'B', '1F', 10, 5, 1.57, false),
-- B_3 그룹
('B_3', 'preparation', 'B', '1F', 15, 0, 0, NULL),
('B_3_1', 'parking', 'B', '1F', 16.5, 0, 0, false),
('B_3_2', 'parking', 'B', '1F', 18, 0, 0, false),
-- B_4 그룹
('B_4', 'preparation', 'B', '1F', 15, 2, 1.57, NULL),
('B_4_1', 'parking', 'B', '1F', 15, 3.5, 1.57, false),
('B_4_2', 'parking', 'B', '1F', 15, 5, 1.57, false);

-- C구역: 4그룹 x 2공간 = 8개 주차 공간
INSERT INTO parking_locations (location_id, location_type, zone, floor, x, y, orientation, is_occupied) VALUES
-- C_1 그룹
('C_1', 'preparation', 'C', '1F', 20, 0, 0, NULL),
('C_1_1', 'parking', 'C', '1F', 21.5, 0, 0, false),
('C_1_2', 'parking', 'C', '1F', 23, 0, 0, false),
-- C_2 그룹
('C_2', 'preparation', 'C', '1F', 20, 2, 1.57, NULL),
('C_2_1', 'parking', 'C', '1F', 20, 3.5, 1.57, false),
('C_2_2', 'parking', 'C', '1F', 20, 5, 1.57, false),
-- C_3 그룹
('C_3', 'preparation', 'C', '1F', 25, 0, 0, NULL),
('C_3_1', 'parking', 'C', '1F', 26.5, 0, 0, false),
('C_3_2', 'parking', 'C', '1F', 28, 0, 0, false),
-- C_4 그룹
('C_4', 'preparation', 'C', '1F', 25, 2, 1.57, NULL),
('C_4_1', 'parking', 'C', '1F', 25, 3.5, 1.57, false),
('C_4_2', 'parking', 'C', '1F', 25, 5, 1.57, false);

-- =====================================================
-- 3. 고객 10명 생성 (customer1, 2, 3는 로그인 가능)
-- =====================================================

INSERT INTO customers (customer_id, name, phone, email, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '홍길동', '010-1234-5678', 'customer1@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440002', '김철수', '010-2345-6789', 'customer2@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440003', '이영희', '010-3456-7890', 'customer3@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440004', '박민수', '010-4567-8901', 'park@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440005', '최지은', '010-5678-9012', 'choi@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440006', '정태영', '010-6789-0123', 'jung@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440007', '강민지', '010-7890-1234', 'kang@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440008', '조현우', '010-8901-2345', 'jo@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440009', '윤서연', '010-9012-3456', 'yoon@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440010', '임재현', '010-0123-4567', 'lim@example.com', 'active');

-- =====================================================
-- 4. 차량 10대 생성
-- =====================================================

INSERT INTO vehicles (vehicle_id, customer_id, license_plate, vehicle_type, vehicle_color) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '12가3456', '승용차', '검정'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '34나7890', 'SUV', '흰색'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '56다1234', '승용차', '은색'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '78라5678', '승용차', '파란색'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '90마9012', '승용차', '빨간색'),
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '12바3456', 'SUV', '회색'),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '34사7890', '승용차', '노란색'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', '56아1234', '트럭', '녹색'),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', '78자5678', '승용차', '보라색'),
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', '90차9012', 'SUV', '주황색');

-- =====================================================
-- 5. 주차 세션 생성 (9대 - customer3 제외)
-- =====================================================
-- 랜덤하게 A, B, C 구역에 배치:
-- A구역: customer1, 4, 7 (3대)
-- B구역: customer2, 5, 8 (3대)
-- C구역: customer6, 9, 10 (3대)

INSERT INTO parking_sessions (session_id, vehicle_id, customer_id, license_plate, parking_spot_id, entry_time, status) VALUES
-- A구역
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '12가3456', 'A_1_1', NOW() - interval '3 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '78라5678', 'A_2_1', NOW() - interval '2 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440007', '34사7890', 'A_3_2', NOW() - interval '1 hour', 'parked'),
-- B구역
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '34나7890', 'B_1_2', NOW() - interval '4 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '90마9012', 'B_2_1', NOW() - interval '1.5 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440008', '56아1234', 'B_3_1', NOW() - interval '45 minutes', 'parked'),
-- C구역
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440006', '12바3456', 'C_1_1', NOW() - interval '5 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440009', '78자5678', 'C_2_2', NOW() - interval '2.5 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440010', '90차9012', 'C_4_1', NOW() - interval '30 minutes', 'parked');

-- =====================================================
-- 6. 주차 공간 점유 상태 업데이트
-- =====================================================

UPDATE parking_locations SET is_occupied = true
WHERE location_id IN (
  'A_1_1', 'A_2_1', 'A_3_2',
  'B_1_2', 'B_2_1', 'B_3_1',
  'C_1_1', 'C_2_2', 'C_4_1'
);

-- =====================================================
-- 7. 입차 이벤트 생성
-- =====================================================

INSERT INTO parking_events (vehicle_id, license_plate, event_type, gate_id, event_time, is_registered, confidence) VALUES
('660e8400-e29b-41d4-a716-446655440001', '12가3456', 'entry', 'GATE-01', NOW() - interval '3 hours', true, 0.95),
('660e8400-e29b-41d4-a716-446655440002', '34나7890', 'entry', 'GATE-01', NOW() - interval '4 hours', true, 0.98),
('660e8400-e29b-41d4-a716-446655440004', '78라5678', 'entry', 'GATE-01', NOW() - interval '2 hours', true, 0.92),
('660e8400-e29b-41d4-a716-446655440005', '90마9012', 'entry', 'GATE-01', NOW() - interval '1.5 hours', true, 0.96),
('660e8400-e29b-41d4-a716-446655440006', '12바3456', 'entry', 'GATE-01', NOW() - interval '5 hours', true, 0.94),
('660e8400-e29b-41d4-a716-446655440007', '34사7890', 'entry', 'GATE-01', NOW() - interval '1 hour', true, 0.97),
('660e8400-e29b-41d4-a716-446655440008', '56아1234', 'entry', 'GATE-01', NOW() - interval '45 minutes', true, 0.93),
('660e8400-e29b-41d4-a716-446655440009', '78자5678', 'entry', 'GATE-01', NOW() - interval '2.5 hours', true, 0.91),
('660e8400-e29b-41d4-a716-446655440010', '90차9012', 'entry', 'GATE-01', NOW() - interval '30 minutes', true, 0.99);

-- =====================================================
-- 8. 결제 수단 추가 (데모용)
-- =====================================================

INSERT INTO payment_methods (customer_id, payment_type, card_last4, card_type, description, is_default) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'card', '1234', 'VISA', '신한카드', true),
('550e8400-e29b-41d4-a716-446655440002', 'card', '5678', 'MASTERCARD', '국민카드', true),
('550e8400-e29b-41d4-a716-446655440003', 'card', '9012', 'VISA', '우리카드', true);

-- =====================================================
-- 9. 확인 쿼리
-- =====================================================

-- 주차 공간 현황
SELECT
  location_id,
  location_type,
  zone,
  is_occupied,
  CASE WHEN is_occupied THEN '🔴 점유' ELSE '🟢 비어있음' END as status
FROM parking_locations
WHERE location_type = 'parking'
ORDER BY location_id;

-- 현재 주차 중인 차량
SELECT
  s.parking_spot_id,
  c.name as customer_name,
  v.license_plate,
  v.vehicle_type,
  s.entry_time,
  EXTRACT(HOUR FROM (NOW() - s.entry_time)) || '시간 ' ||
  EXTRACT(MINUTE FROM (NOW() - s.entry_time)) || '분' as parking_duration
FROM parking_sessions s
JOIN customers c ON s.customer_id = c.customer_id
JOIN vehicles v ON s.vehicle_id = v.vehicle_id
WHERE s.status = 'parked'
ORDER BY s.parking_spot_id;

-- 통계
SELECT
  COUNT(*) FILTER (WHERE location_type = 'parking') as total_spaces,
  COUNT(*) FILTER (WHERE location_type = 'parking' AND is_occupied = true) as occupied,
  COUNT(*) FILTER (WHERE location_type = 'parking' AND is_occupied = false) as available,
  ROUND(
    COUNT(*) FILTER (WHERE location_type = 'parking' AND is_occupied = true)::numeric /
    COUNT(*) FILTER (WHERE location_type = 'parking')::numeric * 100,
    1
  ) as occupancy_rate
FROM parking_locations;

-- =====================================================
-- 완료!
-- =====================================================

SELECT '✅ 데이터베이스 리셋 완료!' as message,
       '- 24개 주차 공간 (A, B, C 각 8개)' as spaces,
       '- 10명 고객 (customer1, 2, 3 로그인 가능)' as customers,
       '- 9대 주차 중 (customer3은 주차 안 됨)' as parked,
       '- A구역 3대, B구역 3대, C구역 3대' as distribution;
