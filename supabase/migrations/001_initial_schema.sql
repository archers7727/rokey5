-- =====================================================
-- ROS2 기반 스마트 주차장 시스템 - 초기 스키마
-- 생성일: 2024-11-29
-- 버전: 1.0
-- =====================================================

-- =====================================================
-- 1. 고객 관리
-- =====================================================

-- 고객 정보 테이블
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100),
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_name ON customers(name);

COMMENT ON TABLE customers IS '고객 정보 테이블';
COMMENT ON COLUMN customers.status IS 'active: 활성, inactive: 비활성, suspended: 정지';

-- =====================================================
-- 2. 차량 관리
-- =====================================================

-- 차량 정보 테이블
CREATE TABLE vehicles (
    vehicle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(customer_id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type VARCHAR(50),
    vehicle_color VARCHAR(30),
    registered_date TIMESTAMPTZ DEFAULT NOW(),
    is_primary BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);

COMMENT ON TABLE vehicles IS '차량 정보 테이블';
COMMENT ON COLUMN vehicles.license_plate IS '차량 번호판 (예: 12가3456)';
COMMENT ON COLUMN vehicles.is_primary IS '고객의 대표 차량 여부';

-- =====================================================
-- 3. 결제 수단 관리 (간소화 버전 - PG 연동 없음)
-- =====================================================

-- 결제 수단 테이블
CREATE TABLE payment_methods (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(customer_id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('card', 'cash', 'transfer', 'other')),
    card_last4 VARCHAR(4),
    card_type VARCHAR(20),
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    registered_date TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_customer ON payment_methods(customer_id);
CREATE INDEX idx_payment_default ON payment_methods(is_default);

COMMENT ON TABLE payment_methods IS '결제 수단 정보 (PG 연동 없는 내부 관리용)';
COMMENT ON COLUMN payment_methods.payment_type IS 'card: 카드, cash: 현금, transfer: 계좌이체, other: 기타';
COMMENT ON COLUMN payment_methods.card_last4 IS '카드 뒷 4자리 (참고용)';

-- =====================================================
-- 4. 주차 공간 관리
-- =====================================================

-- 주차 공간 현재 상태 테이블
CREATE TABLE parking_current_status (
    spot_id VARCHAR(20) PRIMARY KEY,
    is_occupied BOOLEAN NOT NULL DEFAULT false,
    confidence FLOAT,
    zone VARCHAR(10),
    floor VARCHAR(10),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_parking_status_occupied ON parking_current_status(is_occupied);
CREATE INDEX idx_parking_status_zone ON parking_current_status(zone);
CREATE INDEX idx_parking_status_updated ON parking_current_status(last_updated DESC);

COMMENT ON TABLE parking_current_status IS '주차 공간 실시간 상태 (YOLO 감지 결과)';
COMMENT ON COLUMN parking_current_status.spot_id IS '주차 공간 ID (예: A-01, B-15)';
COMMENT ON COLUMN parking_current_status.confidence IS 'AI 감지 신뢰도 (0.0~1.0)';

-- =====================================================
-- 5. 입출차 이벤트
-- =====================================================

-- 입출차 이벤트 테이블
CREATE TABLE parking_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    license_plate VARCHAR(20) NOT NULL,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('entry', 'exit')),
    gate_id VARCHAR(20),
    event_time TIMESTAMPTZ DEFAULT NOW(),
    confidence FLOAT,
    is_registered BOOLEAN DEFAULT false,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_time ON parking_events(event_time DESC);
CREATE INDEX idx_events_vehicle ON parking_events(vehicle_id);
CREATE INDEX idx_events_plate ON parking_events(license_plate);
CREATE INDEX idx_events_type ON parking_events(event_type);

COMMENT ON TABLE parking_events IS '입출차 이벤트 로그 (LPR 인식 결과)';
COMMENT ON COLUMN parking_events.event_type IS 'entry: 입차, exit: 출차';
COMMENT ON COLUMN parking_events.confidence IS 'LPR 인식 신뢰도';
COMMENT ON COLUMN parking_events.is_registered IS '등록 차량 여부';

-- =====================================================
-- 6. 주차 세션
-- =====================================================

-- 주차 세션 테이블
CREATE TABLE parking_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(vehicle_id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(customer_id) ON DELETE SET NULL,
    license_plate VARCHAR(20) NOT NULL,
    parking_spot_id VARCHAR(20),
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'parked' CHECK (status IN ('parked', 'exited', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_session_status ON parking_sessions(status);
CREATE INDEX idx_session_entry ON parking_sessions(entry_time DESC);
CREATE INDEX idx_session_vehicle ON parking_sessions(vehicle_id);
CREATE INDEX idx_session_customer ON parking_sessions(customer_id);
CREATE INDEX idx_session_plate ON parking_sessions(license_plate);

COMMENT ON TABLE parking_sessions IS '주차 세션 (입차~출차)';
COMMENT ON COLUMN parking_sessions.status IS 'parked: 주차중, exited: 출차완료, cancelled: 취소';
COMMENT ON COLUMN parking_sessions.duration_minutes IS '주차 시간 (분 단위, 자동 계산)';

-- =====================================================
-- 7. 주차 요금
-- =====================================================

-- 주차 요금 테이블
CREATE TABLE parking_fees (
    fee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES parking_sessions(session_id) ON DELETE CASCADE,

    -- 요금 계산
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    additional_fee DECIMAL(10,2) DEFAULT 0,
    total_fee DECIMAL(10,2) NOT NULL,

    -- 결제 정보 (간소화)
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_method VARCHAR(20),
    payment_method_id UUID REFERENCES payment_methods(payment_id) ON DELETE SET NULL,
    payment_time TIMESTAMPTZ,
    payment_note TEXT,
    paid_by VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fee_session ON parking_fees(session_id);
CREATE INDEX idx_fee_status ON parking_fees(payment_status);
CREATE INDEX idx_fee_time ON parking_fees(payment_time DESC);

COMMENT ON TABLE parking_fees IS '주차 요금 정보';
COMMENT ON COLUMN parking_fees.payment_status IS 'unpaid: 미결제, paid: 결제완료, failed: 결제실패, refunded: 환불, cancelled: 취소';
COMMENT ON COLUMN parking_fees.payment_method IS '결제 방법 (card/cash/transfer)';
COMMENT ON COLUMN parking_fees.paid_by IS '결제 처리한 관리자';

-- =====================================================
-- 8. 결제 로그
-- =====================================================

-- 결제 로그 테이블
CREATE TABLE payment_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_id UUID REFERENCES parking_fees(fee_id) ON DELETE CASCADE,
    attempt_time TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20),
    payment_method VARCHAR(20),
    amount DECIMAL(10,2),
    error_message TEXT,
    processed_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_logs_fee ON payment_logs(fee_id);
CREATE INDEX idx_payment_logs_time ON payment_logs(attempt_time DESC);

COMMENT ON TABLE payment_logs IS '결제 시도 로그 (내부 관리용)';

-- =====================================================
-- 9. 요금 정책 설정
-- =====================================================

-- 요금 정책 테이블
CREATE TABLE parking_fee_policy (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(100) NOT NULL,

    -- 기본 요금
    base_time_minutes INTEGER NOT NULL DEFAULT 30,
    base_fee DECIMAL(10,2) NOT NULL DEFAULT 2000,

    -- 추가 요금
    additional_unit_minutes INTEGER NOT NULL DEFAULT 10,
    additional_fee DECIMAL(10,2) NOT NULL DEFAULT 1000,

    -- 무료 및 최대 요금
    free_minutes INTEGER DEFAULT 10,
    daily_max_fee DECIMAL(10,2) DEFAULT 20000,

    -- 활성화 여부
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 요금 정책 삽입
INSERT INTO parking_fee_policy (
    policy_name,
    base_time_minutes,
    base_fee,
    additional_unit_minutes,
    additional_fee,
    free_minutes,
    daily_max_fee,
    is_active
) VALUES (
    '기본 요금 정책',
    30,      -- 기본 30분
    2000,    -- 기본 2,000원
    10,      -- 추가 10분당
    1000,    -- 추가 1,000원
    10,      -- 최초 10분 무료
    20000,   -- 일 최대 20,000원
    true
);

COMMENT ON TABLE parking_fee_policy IS '주차 요금 정책 설정';

-- =====================================================
-- 10. 함수 및 트리거
-- =====================================================

-- 주차 시간 자동 계산 함수
CREATE OR REPLACE FUNCTION calculate_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exit_time IS NOT NULL AND NEW.entry_time IS NOT NULL THEN
        NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 주차 세션 트리거
CREATE TRIGGER update_session_duration
BEFORE INSERT OR UPDATE ON parking_sessions
FOR EACH ROW
EXECUTE FUNCTION calculate_duration();

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 updated_at 트리거 추가
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_parking_fees_updated_at
BEFORE UPDATE ON parking_fees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_parking_fee_policy_updated_at
BEFORE UPDATE ON parking_fee_policy
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 11. 주차 요금 계산 함수
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_parking_fee(
    p_entry_time TIMESTAMPTZ,
    p_exit_time TIMESTAMPTZ
)
RETURNS TABLE (
    base_fee DECIMAL,
    additional_fee DECIMAL,
    total_fee DECIMAL,
    duration_minutes INTEGER
) AS $$
DECLARE
    v_policy RECORD;
    v_duration_minutes INTEGER;
    v_billable_minutes INTEGER;
    v_base_fee DECIMAL;
    v_additional_fee DECIMAL;
    v_total_fee DECIMAL;
    v_extra_minutes INTEGER;
    v_additional_units INTEGER;
BEGIN
    -- 활성화된 요금 정책 조회
    SELECT * INTO v_policy
    FROM parking_fee_policy
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION '활성화된 요금 정책이 없습니다';
    END IF;

    -- 주차 시간 계산 (분 단위)
    v_duration_minutes := EXTRACT(EPOCH FROM (p_exit_time - p_entry_time)) / 60;

    -- 무료 시간 차감
    IF v_duration_minutes <= v_policy.free_minutes THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, v_duration_minutes;
        RETURN;
    END IF;

    v_billable_minutes := v_duration_minutes - v_policy.free_minutes;

    -- 기본 요금
    v_base_fee := v_policy.base_fee;

    -- 추가 요금 계산
    IF v_billable_minutes <= v_policy.base_time_minutes THEN
        v_additional_fee := 0;
    ELSE
        v_extra_minutes := v_billable_minutes - v_policy.base_time_minutes;
        v_additional_units := CEIL(v_extra_minutes::DECIMAL / v_policy.additional_unit_minutes);
        v_additional_fee := v_additional_units * v_policy.additional_fee;
    END IF;

    -- 총 요금
    v_total_fee := v_base_fee + v_additional_fee;

    -- 일 최대 요금 적용
    IF v_total_fee > v_policy.daily_max_fee THEN
        v_total_fee := v_policy.daily_max_fee;
    END IF;

    RETURN QUERY SELECT v_base_fee, v_additional_fee, v_total_fee, v_duration_minutes;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_parking_fee IS '주차 요금 자동 계산 (정책 기반)';

-- =====================================================
-- 12. 통계 함수
-- =====================================================

-- 오늘의 통계 조회 함수
CREATE OR REPLACE FUNCTION get_today_statistics()
RETURNS TABLE (
    total_entries BIGINT,
    total_exits BIGINT,
    currently_parked BIGINT,
    total_revenue DECIMAL,
    total_spaces INTEGER,
    occupied_spaces BIGINT,
    available_spaces BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM parking_events
         WHERE event_type = 'entry'
         AND DATE(event_time) = CURRENT_DATE) AS total_entries,

        (SELECT COUNT(*) FROM parking_events
         WHERE event_type = 'exit'
         AND DATE(event_time) = CURRENT_DATE) AS total_exits,

        (SELECT COUNT(*) FROM parking_sessions
         WHERE status = 'parked') AS currently_parked,

        (SELECT COALESCE(SUM(total_fee), 0) FROM parking_fees
         WHERE payment_status = 'paid'
         AND DATE(payment_time) = CURRENT_DATE) AS total_revenue,

        (SELECT COUNT(*)::INTEGER FROM parking_current_status) AS total_spaces,

        (SELECT COUNT(*) FROM parking_current_status
         WHERE is_occupied = true) AS occupied_spaces,

        (SELECT COUNT(*) FROM parking_current_status
         WHERE is_occupied = false) AS available_spaces;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_today_statistics IS '오늘의 주차장 통계';

-- =====================================================
-- 13. RLS (Row Level Security) 정책
-- =====================================================

-- RLS 활성화 (추후 관리자 인증 구현 시 사용)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE parking_fees ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 완료
-- =====================================================

COMMENT ON SCHEMA public IS 'ROS2 기반 스마트 주차장 시스템 v1.0';
