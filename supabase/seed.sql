-- =====================================================
-- 테스트용 샘플 데이터
-- =====================================================

-- =====================================================
-- 1. 고객 데이터
-- =====================================================

INSERT INTO customers (customer_id, name, phone, email, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '홍길동', '010-1234-5678', 'hong@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440002', '김철수', '010-2345-6789', 'kim@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440003', '이영희', '010-3456-7890', 'lee@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440004', '박민수', '010-4567-8901', 'park@example.com', 'active'),
('550e8400-e29b-41d4-a716-446655440005', '최지은', '010-5678-9012', 'choi@example.com', 'active');

-- =====================================================
-- 2. 차량 데이터
-- =====================================================

INSERT INTO vehicles (vehicle_id, customer_id, license_plate, vehicle_type, vehicle_color) VALUES
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '12가3456', '승용차', '검정'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '34나7890', 'SUV', '흰색'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '56다1234', '승용차', '은색'),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '78라5678', '트럭', '파란색'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '90마9012', '승용차', '빨간색');

-- =====================================================
-- 3. 결제 수단 데이터
-- =====================================================

INSERT INTO payment_methods (customer_id, payment_type, card_last4, card_type, description, is_default) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'card', '1234', 'VISA', '신한카드', true),
('550e8400-e29b-41d4-a716-446655440002', 'card', '5678', 'MASTERCARD', '국민카드', true),
('550e8400-e29b-41d4-a716-446655440003', 'cash', NULL, NULL, '현금 결제', true),
('550e8400-e29b-41d4-a716-446655440004', 'transfer', NULL, NULL, '계좌이체', true),
('550e8400-e29b-41d4-a716-446655440005', 'card', '9012', 'AMEX', '우리카드', true);

-- =====================================================
-- 4. 주차 공간 데이터 (100개)
-- =====================================================

-- A구역 (1~30)
INSERT INTO parking_current_status (spot_id, is_occupied, zone, floor)
SELECT
    'A-' || LPAD(num::TEXT, 2, '0'),
    CASE WHEN num % 3 = 0 THEN true ELSE false END,
    'A',
    '1F'
FROM generate_series(1, 30) AS num;

-- B구역 (1~30)
INSERT INTO parking_current_status (spot_id, is_occupied, zone, floor)
SELECT
    'B-' || LPAD(num::TEXT, 2, '0'),
    CASE WHEN num % 4 = 0 THEN true ELSE false END,
    'B',
    '1F'
FROM generate_series(1, 30) AS num;

-- C구역 (1~40)
INSERT INTO parking_current_status (spot_id, is_occupied, zone, floor)
SELECT
    'C-' || LPAD(num::TEXT, 2, '0'),
    CASE WHEN num % 5 = 0 THEN true ELSE false END,
    'C',
    '2F'
FROM generate_series(1, 40) AS num;

-- =====================================================
-- 5. 입출차 이벤트 (최근 20건)
-- =====================================================

-- 입차 이벤트
INSERT INTO parking_events (vehicle_id, license_plate, event_type, gate_id, event_time, is_registered, confidence)
SELECT
    v.vehicle_id,
    v.license_plate,
    'entry',
    'GATE-01',
    NOW() - (interval '1 hour' * (row_number() OVER ())),
    true,
    0.95
FROM vehicles v
LIMIT 5;

-- 출차 이벤트
INSERT INTO parking_events (vehicle_id, license_plate, event_type, gate_id, event_time, is_registered, confidence)
SELECT
    v.vehicle_id,
    v.license_plate,
    'exit',
    'GATE-01',
    NOW() - (interval '30 minutes' * (row_number() OVER ())),
    true,
    0.92
FROM vehicles v
LIMIT 3;

-- =====================================================
-- 6. 주차 세션 (현재 주차 중인 차량 3대)
-- =====================================================

INSERT INTO parking_sessions (session_id, vehicle_id, customer_id, license_plate, parking_spot_id, entry_time, status) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '12가3456', 'A-03', NOW() - interval '2 hours', 'parked'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '34나7890', 'B-04', NOW() - interval '1 hour 30 minutes', 'parked'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '56다1234', 'C-05', NOW() - interval '45 minutes', 'parked');

-- 출차 완료된 세션
INSERT INTO parking_sessions (session_id, vehicle_id, customer_id, license_plate, parking_spot_id, entry_time, exit_time, status)
VALUES
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '78라5678', 'A-10', NOW() - interval '5 hours', NOW() - interval '3 hours', 'exited'),
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '90마9012', 'B-15', NOW() - interval '4 hours', NOW() - interval '2 hours', 'exited');

-- =====================================================
-- 7. 주차 요금 (출차 완료 세션에 대한 요금)
-- =====================================================

-- 세션 1: 2시간 주차 -> 2,000원 (기본) + 9,000원 (추가 11개 단위) = 11,000원
INSERT INTO parking_fees (session_id, base_fee, additional_fee, total_fee, payment_status, payment_method, payment_time, paid_by)
VALUES
('770e8400-e29b-41d4-a716-446655440004', 2000, 9000, 11000, 'paid', 'card', NOW() - interval '3 hours', '관리자');

-- 세션 2: 2시간 주차 -> 2,000원 (기본) + 9,000원 (추가) = 11,000원
INSERT INTO parking_fees (session_id, base_fee, additional_fee, total_fee, payment_status, payment_method, payment_time, paid_by)
VALUES
('770e8400-e29b-41d4-a716-446655440005', 2000, 9000, 11000, 'paid', 'cash', NOW() - interval '2 hours', '관리자');

-- 현재 주차중인 차량에 대한 미결제 요금 생성 (출차 시 계산될 예정)
INSERT INTO parking_fees (session_id, base_fee, additional_fee, total_fee, payment_status)
SELECT
    session_id,
    0,
    0,
    0,
    'unpaid'
FROM parking_sessions
WHERE status = 'parked';

-- =====================================================
-- 8. 결제 로그
-- =====================================================

INSERT INTO payment_logs (fee_id, status, payment_method, amount, processed_by)
SELECT
    fee_id,
    'success',
    payment_method,
    total_fee,
    paid_by
FROM parking_fees
WHERE payment_status = 'paid';

-- =====================================================
-- 완료
-- =====================================================
