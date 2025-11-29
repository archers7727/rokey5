# 데이터베이스 스키마 문서

## ERD (Entity Relationship Diagram)

```
customers (고객)
    ├─ customer_id (PK)
    ├─ name
    ├─ phone
    └─ email
         │
         │ 1:N
         ↓
vehicles (차량)                  payment_methods (결제수단)
    ├─ vehicle_id (PK)              ├─ payment_id (PK)
    ├─ customer_id (FK)    ←────────├─ customer_id (FK)
    ├─ license_plate                ├─ payment_type
    └─ vehicle_type                 └─ is_default
         │
         │ 1:N
         ↓
parking_events (입출차)         parking_sessions (주차세션)
    ├─ event_id (PK)               ├─ session_id (PK)
    ├─ vehicle_id (FK)    ────►    ├─ vehicle_id (FK)
    ├─ event_type                  ├─ customer_id (FK)
    └─ event_time                  ├─ entry_time
                                   ├─ exit_time
                                   └─ status
                                        │
                                        │ 1:1
                                        ↓
parking_current_status          parking_fees (요금)
    ├─ spot_id (PK)                ├─ fee_id (PK)
    ├─ is_occupied                 ├─ session_id (FK)
    └─ last_updated                ├─ total_fee
                                   └─ payment_status
```

## 테이블 상세 스펙

### 1. customers (고객 정보)

고객의 기본 정보를 저장합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| customer_id | UUID | PK | 고객 ID (자동 생성) |
| name | VARCHAR(100) | NOT NULL | 고객 이름 |
| phone | VARCHAR(20) | NOT NULL, UNIQUE | 전화번호 |
| email | VARCHAR(100) | - | 이메일 |
| registration_date | TIMESTAMPTZ | DEFAULT NOW() | 등록일 |
| status | VARCHAR(20) | DEFAULT 'active' | 상태 (active, inactive, suspended) |
| notes | TEXT | - | 메모 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**인덱스:**
- `idx_customers_phone` on (phone)
- `idx_customers_status` on (status)
- `idx_customers_name` on (name)

---

### 2. vehicles (차량 정보)

고객이 소유한 차량 정보를 저장합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| vehicle_id | UUID | PK | 차량 ID (자동 생성) |
| customer_id | UUID | FK → customers | 소유 고객 ID |
| license_plate | VARCHAR(20) | NOT NULL, UNIQUE | 차량 번호판 |
| vehicle_type | VARCHAR(50) | - | 차량 종류 (승용차, SUV 등) |
| vehicle_color | VARCHAR(30) | - | 차량 색상 |
| registered_date | TIMESTAMPTZ | DEFAULT NOW() | 등록일 |
| is_primary | BOOLEAN | DEFAULT true | 대표 차량 여부 |
| notes | TEXT | - | 메모 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**인덱스:**
- `idx_vehicles_license_plate` on (license_plate)
- `idx_vehicles_customer_id` on (customer_id)

**외래키:**
- `customer_id` → `customers(customer_id)` ON DELETE CASCADE

---

### 3. payment_methods (결제 수단)

고객의 결제 수단 정보를 저장합니다. (PG 연동 없는 간소화 버전)

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| payment_id | UUID | PK | 결제 수단 ID |
| customer_id | UUID | FK → customers | 고객 ID |
| payment_type | VARCHAR(20) | NOT NULL | 결제 유형 (card, cash, transfer, other) |
| card_last4 | VARCHAR(4) | - | 카드 뒷 4자리 (참고용) |
| card_type | VARCHAR(20) | - | 카드 종류 (VISA, MASTERCARD 등) |
| description | TEXT | - | 설명 (예: "내 신한카드") |
| is_default | BOOLEAN | DEFAULT false | 기본 결제 수단 여부 |
| registered_date | TIMESTAMPTZ | DEFAULT NOW() | 등록일 |
| status | VARCHAR(20) | DEFAULT 'active' | 상태 (active, inactive, deleted) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**인덱스:**
- `idx_payment_customer` on (customer_id)
- `idx_payment_default` on (is_default)

---

### 4. parking_current_status (주차 공간 현재 상태)

주차 공간의 실시간 점유 상태를 저장합니다. (YOLO 감지 결과)

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| spot_id | VARCHAR(20) | PK | 주차 공간 ID (예: "A-01") |
| is_occupied | BOOLEAN | NOT NULL, DEFAULT false | 점유 여부 |
| confidence | FLOAT | - | AI 감지 신뢰도 (0.0~1.0) |
| zone | VARCHAR(10) | - | 구역 (A, B, C 등) |
| floor | VARCHAR(10) | - | 층 (1F, 2F 등) |
| last_updated | TIMESTAMPTZ | DEFAULT NOW() | 마지막 업데이트 시간 |
| notes | TEXT | - | 메모 |

**인덱스:**
- `idx_parking_status_occupied` on (is_occupied)
- `idx_parking_status_zone` on (zone)
- `idx_parking_status_updated` on (last_updated DESC)

---

### 5. parking_events (입출차 이벤트)

차량의 입출차 이벤트를 기록합니다. (LPR 인식 결과)

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| event_id | UUID | PK | 이벤트 ID |
| vehicle_id | UUID | FK → vehicles (nullable) | 차량 ID |
| license_plate | VARCHAR(20) | NOT NULL | 차량 번호판 |
| event_type | VARCHAR(10) | NOT NULL | 이벤트 유형 (entry, exit) |
| gate_id | VARCHAR(20) | - | 게이트 ID |
| event_time | TIMESTAMPTZ | DEFAULT NOW() | 이벤트 발생 시간 |
| confidence | FLOAT | - | LPR 인식 신뢰도 |
| is_registered | BOOLEAN | DEFAULT false | 등록 차량 여부 |
| image_url | TEXT | - | 차량 이미지 URL |
| notes | TEXT | - | 메모 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |

**인덱스:**
- `idx_events_time` on (event_time DESC)
- `idx_events_vehicle` on (vehicle_id)
- `idx_events_plate` on (license_plate)
- `idx_events_type` on (event_type)

---

### 6. parking_sessions (주차 세션)

입차부터 출차까지의 주차 세션을 관리합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| session_id | UUID | PK | 세션 ID |
| vehicle_id | UUID | FK → vehicles (nullable) | 차량 ID |
| customer_id | UUID | FK → customers (nullable) | 고객 ID |
| license_plate | VARCHAR(20) | NOT NULL | 차량 번호판 |
| parking_spot_id | VARCHAR(20) | - | 주차 공간 ID |
| entry_time | TIMESTAMPTZ | NOT NULL | 입차 시간 |
| exit_time | TIMESTAMPTZ | - | 출차 시간 |
| duration_minutes | INTEGER | - | 주차 시간 (분, 자동 계산) |
| status | VARCHAR(20) | DEFAULT 'parked' | 상태 (parked, exited, cancelled) |
| notes | TEXT | - | 메모 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**인덱스:**
- `idx_session_status` on (status)
- `idx_session_entry` on (entry_time DESC)
- `idx_session_vehicle` on (vehicle_id)
- `idx_session_customer` on (customer_id)
- `idx_session_plate` on (license_plate)

**트리거:**
- `update_session_duration`: exit_time이 설정되면 duration_minutes 자동 계산

---

### 7. parking_fees (주차 요금)

주차 세션에 대한 요금 정보를 저장합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| fee_id | UUID | PK | 요금 ID |
| session_id | UUID | FK → parking_sessions | 세션 ID |
| base_fee | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | 기본 요금 |
| additional_fee | DECIMAL(10,2) | DEFAULT 0 | 추가 요금 |
| total_fee | DECIMAL(10,2) | NOT NULL | 총 요금 |
| payment_status | VARCHAR(20) | DEFAULT 'unpaid' | 결제 상태 |
| payment_method | VARCHAR(20) | - | 결제 방법 (card, cash, transfer) |
| payment_method_id | UUID | FK → payment_methods (nullable) | 결제 수단 ID |
| payment_time | TIMESTAMPTZ | - | 결제 시간 |
| payment_note | TEXT | - | 결제 메모 |
| paid_by | VARCHAR(100) | - | 결제 처리한 관리자 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**인덱스:**
- `idx_fee_session` on (session_id)
- `idx_fee_status` on (payment_status)
- `idx_fee_time` on (payment_time DESC)

**결제 상태:**
- `unpaid`: 미결제
- `paid`: 결제완료
- `failed`: 결제실패
- `refunded`: 환불
- `cancelled`: 취소

---

### 8. payment_logs (결제 로그)

결제 시도 기록을 저장합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| log_id | UUID | PK | 로그 ID |
| fee_id | UUID | FK → parking_fees | 요금 ID |
| attempt_time | TIMESTAMPTZ | DEFAULT NOW() | 시도 시간 |
| status | VARCHAR(20) | - | 상태 (success, failed) |
| payment_method | VARCHAR(20) | - | 결제 방법 |
| amount | DECIMAL(10,2) | - | 금액 |
| error_message | TEXT | - | 오류 메시지 |
| processed_by | VARCHAR(100) | - | 처리자 |
| notes | TEXT | - | 메모 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |

---

### 9. parking_fee_policy (요금 정책)

주차 요금 정책을 관리합니다.

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| policy_id | UUID | PK | 정책 ID |
| policy_name | VARCHAR(100) | NOT NULL | 정책명 |
| base_time_minutes | INTEGER | NOT NULL, DEFAULT 30 | 기본 시간 (분) |
| base_fee | DECIMAL(10,2) | NOT NULL, DEFAULT 2000 | 기본 요금 (원) |
| additional_unit_minutes | INTEGER | NOT NULL, DEFAULT 10 | 추가 단위 시간 (분) |
| additional_fee | DECIMAL(10,2) | NOT NULL, DEFAULT 1000 | 추가 요금 (원) |
| free_minutes | INTEGER | DEFAULT 10 | 무료 시간 (분) |
| daily_max_fee | DECIMAL(10,2) | DEFAULT 20000 | 일 최대 요금 (원) |
| is_active | BOOLEAN | DEFAULT true | 활성화 여부 |
| valid_from | TIMESTAMPTZ | DEFAULT NOW() | 유효 시작일 |
| valid_to | TIMESTAMPTZ | - | 유효 종료일 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일시 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일시 |

**기본 정책:**
- 최초 10분 무료
- 기본 30분: 2,000원
- 추가 10분당: 1,000원
- 일 최대: 20,000원

---

## PostgreSQL 함수

### calculate_parking_fee()

주차 요금을 자동 계산하는 함수입니다.

```sql
SELECT * FROM calculate_parking_fee(entry_time, exit_time);
```

**반환값:**
- `base_fee`: 기본 요금
- `additional_fee`: 추가 요금
- `total_fee`: 총 요금
- `duration_minutes`: 주차 시간 (분)

**계산 로직:**
1. 주차 시간 계산 (분 단위)
2. 무료 시간 차감
3. 기본 요금 적용
4. 추가 요금 계산 (10분 단위)
5. 일 최대 요금 적용

---

### get_today_statistics()

오늘의 통계를 조회하는 함수입니다.

```sql
SELECT * FROM get_today_statistics();
```

**반환값:**
- `total_entries`: 오늘 총 입차 수
- `total_exits`: 오늘 총 출차 수
- `currently_parked`: 현재 주차 중인 차량 수
- `total_revenue`: 오늘 총 매출
- `total_spaces`: 전체 주차 공간 수
- `occupied_spaces`: 점유 중인 공간 수
- `available_spaces`: 이용 가능한 공간 수

---

## 트리거

### calculate_duration()

주차 세션의 duration_minutes를 자동으로 계산합니다.

**대상 테이블:** `parking_sessions`
**실행 시점:** BEFORE INSERT OR UPDATE
**조건:** exit_time이 설정되었을 때

---

### update_updated_at()

updated_at 컬럼을 자동으로 업데이트합니다.

**대상 테이블:**
- customers
- vehicles
- payment_methods
- parking_fees
- parking_fee_policy

**실행 시점:** BEFORE UPDATE

---

## Realtime 설정

다음 테이블에 대해 Realtime을 활성화해야 합니다:

1. `parking_current_status` - 주차 현황 실시간 업데이트
2. `parking_events` - 입출차 이벤트 실시간 알림
3. `parking_sessions` - 주차 세션 상태 변경 감지

**Supabase 대시보드에서 설정:**
- Database > Replication
- Source: 해당 테이블 선택
- Realtime 활성화

---

## 보안 (RLS)

Row Level Security 정책을 설정하여 데이터 접근을 제어할 수 있습니다.

```sql
-- 예시: 고객은 자신의 데이터만 조회 가능
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
ON customers
FOR SELECT
USING (auth.uid() = customer_id);
```

현재는 관리자 전용 시스템이므로 RLS 비활성화 상태입니다.
