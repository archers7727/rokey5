# 스마트 주차장 시스템 - 데모 개발 가이드

> **데모 시나리오**: YOLO 차량 감지 → 랜덤 번호판 부여 → 자동 입출차 처리

---

## 📋 목차
1. [프로젝트 현황](#1-프로젝트-현황)
2. [데이터베이스 구조](#2-데이터베이스-구조)
3. [데모 시나리오](#3-데모-시나리오)
4. [API 사용법](#4-api-사용법)
5. [개발 체크리스트](#5-개발-체크리스트)

---

## 1. 프로젝트 현황

### 🎯 완료된 것
- ✅ Supabase 데이터베이스 설정 완료
- ✅ 웹 대시보드 구현 (React + TypeScript)
- ✅ 로그인 시스템 (admin/admin)
- ✅ 주차 공간 24개 (A-01~08, B-01~08, C-01~08)
- ✅ 실시간 주차 현황 UI
- ✅ 차량 정보 팝업

### 🚀 구현할 것 (데모)
- ⏳ YOLO 차량 감지 시뮬레이션
- ⏳ 랜덤 번호판 생성
- ⏳ 자동 입차 처리
- ⏳ 자동 출차 처리

---

## 2. 데이터베이스 구조

### 📊 테이블 관계도

```
customers (고객)
    └─ vehicles (차량)
         └─ parking_sessions (주차 세션)
              └─ parking_fees (요금)

parking_current_status (주차 공간 상태) - 독립
parking_events (입출차 이벤트) - 독립
```

### 🗂️ 주요 테이블 설명

#### 1. `parking_current_status` (주차 공간 상태)
**역할**: 물리적 주차 공간의 실시간 점유 상태 (YOLO 감지 결과)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| spot_id | VARCHAR(20) | 주차 공간 ID (PK) | "A-03" |
| is_occupied | BOOLEAN | 점유 여부 | true/false |
| confidence | FLOAT | AI 감지 신뢰도 | 0.95 |
| zone | VARCHAR(10) | 구역 | "A" |
| floor | VARCHAR(10) | 층 | "1F" |
| last_updated | TIMESTAMPTZ | 최종 업데이트 시간 | 현재 시간 |

**언제 업데이트?**
- YOLO가 차량 감지할 때마다 (1-2초 간격)

---

#### 2. `customers` (고객)
**역할**: 고객 기본 정보

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| customer_id | UUID | 고객 ID (PK) | auto-generated |
| name | VARCHAR(100) | 이름 | "홍길동" |
| phone | VARCHAR(20) | 전화번호 (UNIQUE) | "010-1234-5678" |
| email | VARCHAR(100) | 이메일 | "hong@example.com" |
| status | VARCHAR(20) | 상태 | "active" |

**데모용 샘플 데이터**: 이미 5명 등록됨 (홍길동, 김철수, 이영희, 박민수, 최지은)

---

#### 3. `vehicles` (차량)
**역할**: 고객이 소유한 차량 정보

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| vehicle_id | UUID | 차량 ID (PK) | auto-generated |
| customer_id | UUID | 소유자 ID (FK) | customers.customer_id |
| license_plate | VARCHAR(20) | 차량 번호 (UNIQUE) | "12가3456" |
| vehicle_type | VARCHAR(50) | 차량 종류 | "승용차" |
| vehicle_color | VARCHAR(30) | 색상 | "검정" |

**데모용 샘플 데이터**: 이미 5대 등록됨

---

#### 4. `parking_events` (입출차 이벤트)
**역할**: 모든 입출차 이벤트 로그 (LPR 인식 결과)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| event_id | UUID | 이벤트 ID (PK) | auto-generated |
| vehicle_id | UUID | 차량 ID (FK, nullable) | vehicles.vehicle_id |
| license_plate | VARCHAR(20) | 번호판 | "12가3456" |
| event_type | VARCHAR(10) | 이벤트 유형 | "entry" / "exit" |
| gate_id | VARCHAR(20) | 게이트 ID | "GATE-01" |
| event_time | TIMESTAMPTZ | 발생 시간 | NOW() |
| is_registered | BOOLEAN | 등록 차량 여부 | true/false |
| confidence | FLOAT | LPR 신뢰도 | 0.97 |

**언제 생성?**
- 차량이 입차할 때 (event_type = "entry")
- 차량이 출차할 때 (event_type = "exit")

---

#### 5. `parking_sessions` (주차 세션)
**역할**: 입차부터 출차까지의 주차 세션 관리

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| session_id | UUID | 세션 ID (PK) | auto-generated |
| vehicle_id | UUID | 차량 ID (FK, nullable) | vehicles.vehicle_id |
| customer_id | UUID | 고객 ID (FK, nullable) | customers.customer_id |
| license_plate | VARCHAR(20) | 번호판 | "12가3456" |
| parking_spot_id | VARCHAR(20) | 주차 공간 ID | "A-03" |
| entry_time | TIMESTAMPTZ | 입차 시간 | NOW() |
| exit_time | TIMESTAMPTZ | 출차 시간 (nullable) | NOW() |
| duration_minutes | INTEGER | 주차 시간 (분) | 자동 계산 |
| status | VARCHAR(20) | 상태 | "parked" / "exited" |

**언제 생성/업데이트?**
- 입차 시: 새 레코드 생성 (status = "parked")
- 출차 시: exit_time 업데이트, status = "exited"

---

#### 6. `parking_fees` (주차 요금)
**역할**: 주차 요금 정보

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| fee_id | UUID | 요금 ID (PK) | auto-generated |
| session_id | UUID | 세션 ID (FK) | parking_sessions.session_id |
| base_fee | DECIMAL(10,2) | 기본 요금 | 2000 |
| additional_fee | DECIMAL(10,2) | 추가 요금 | 3000 |
| total_fee | DECIMAL(10,2) | 총 요금 | 5000 |
| payment_status | VARCHAR(20) | 결제 상태 | "unpaid" / "paid" |
| payment_method | VARCHAR(20) | 결제 방법 | "card" |

**언제 생성?**
- 출차 시 자동 생성

---

## 3. 데모 시나리오

### 🎬 시나리오 1: 등록 차량 입차

```
[YOLO 감지] → [번호판 생성] → [차량 조회] → [주차 공간 할당] → [세션 생성]
```

#### Step 1: YOLO 차량 감지
```python
# 차량이 감지됨
detected = True
```

#### Step 2: 랜덤 번호판 생성 (등록 차량)
```python
# 기존 등록 차량 중 하나를 랜덤으로 선택
registered_plates = ["12가3456", "34나7890", "56다1234", "78라5678", "90마9012"]
license_plate = random.choice(registered_plates)
```

#### Step 3: 입차 이벤트 생성
```sql
INSERT INTO parking_events (license_plate, event_type, gate_id, is_registered, confidence)
VALUES ('12가3456', 'entry', 'GATE-01', true, 0.95);
```

#### Step 4: 차량 정보 조회
```sql
SELECT v.*, c.name, c.phone
FROM vehicles v
JOIN customers c ON v.customer_id = c.customer_id
WHERE v.license_plate = '12가3456';
```

#### Step 5: 빈 주차 공간 찾기
```sql
SELECT spot_id
FROM parking_current_status
WHERE is_occupied = false
LIMIT 1;
-- 결과: "A-01"
```

#### Step 6: 주차 세션 생성
```sql
INSERT INTO parking_sessions (
    vehicle_id,
    customer_id,
    license_plate,
    parking_spot_id,
    entry_time,
    status
) VALUES (
    '660e8400-e29b-41d4-a716-446655440001',  -- vehicle_id
    '550e8400-e29b-41d4-a716-446655440001',  -- customer_id
    '12가3456',
    'A-01',
    NOW(),
    'parked'
);
```

#### Step 7: 주차 공간 상태 업데이트
```sql
UPDATE parking_current_status
SET is_occupied = true, last_updated = NOW()
WHERE spot_id = 'A-01';
```

---

### 🎬 시나리오 2: 미등록 차량 입차

```
[YOLO 감지] → [랜덤 번호판 생성] → [차량 미등록] → [주차 공간 할당] → [세션 생성]
```

#### Step 1-2: YOLO 감지 + 랜덤 번호판 생성
```python
# 랜덤 번호판 생성 (미등록)
import random
numbers = random.randint(1000, 9999)
license_plate = f"{random.randint(10, 99)}가{numbers}"
# 결과: "45가7823"
```

#### Step 3: 입차 이벤트 생성
```sql
INSERT INTO parking_events (license_plate, event_type, gate_id, is_registered, confidence)
VALUES ('45가7823', 'entry', 'GATE-01', false, 0.95);
```

#### Step 4: 차량 조회 (결과 없음)
```sql
SELECT * FROM vehicles WHERE license_plate = '45가7823';
-- 결과: 없음 (미등록 차량)
```

#### Step 5-7: 주차 공간 할당 및 세션 생성
```sql
-- 빈 공간 찾기
SELECT spot_id FROM parking_current_status WHERE is_occupied = false LIMIT 1;

-- 세션 생성 (vehicle_id, customer_id NULL)
INSERT INTO parking_sessions (
    vehicle_id,
    customer_id,
    license_plate,
    parking_spot_id,
    entry_time,
    status
) VALUES (
    NULL,  -- 미등록 차량
    NULL,  -- 미등록 차량
    '45가7823',
    'A-02',
    NOW(),
    'parked'
);

-- 주차 공간 업데이트
UPDATE parking_current_status
SET is_occupied = true, last_updated = NOW()
WHERE spot_id = 'A-02';
```

---

### 🎬 시나리오 3: 차량 출차

```
[번호판 인식] → [세션 조회] → [세션 종료] → [요금 계산] → [주차 공간 비우기]
```

#### Step 1: 출차 이벤트 생성
```sql
INSERT INTO parking_events (license_plate, event_type, gate_id, confidence)
VALUES ('12가3456', 'exit', 'GATE-01', 0.95);
```

#### Step 2: 활성 세션 조회
```sql
SELECT *
FROM parking_sessions
WHERE license_plate = '12가3456'
AND status = 'parked'
LIMIT 1;
```

#### Step 3: 세션 종료
```sql
UPDATE parking_sessions
SET
    exit_time = NOW(),
    status = 'exited'
WHERE session_id = '세션ID';
-- duration_minutes는 트리거로 자동 계산됨
```

#### Step 4: 요금 계산
```sql
-- PostgreSQL 함수 호출
SELECT * FROM calculate_parking_fee(
    '2024-11-29 14:00:00'::TIMESTAMPTZ,  -- entry_time
    NOW()                                 -- exit_time
);
-- 결과: base_fee, additional_fee, total_fee, duration_minutes
```

#### Step 5: 요금 기록
```sql
INSERT INTO parking_fees (
    session_id,
    base_fee,
    additional_fee,
    total_fee,
    payment_status
) VALUES (
    '세션ID',
    2000,
    3000,
    5000,
    'unpaid'
);
```

#### Step 6: 주차 공간 비우기
```sql
UPDATE parking_current_status
SET is_occupied = false, last_updated = NOW()
WHERE spot_id = 'A-01';
```

---

## 4. API 사용법

### 🔧 Supabase REST API 기본 설정

```python
import os
from supabase import create_client, Client

# 환경 변수에서 가져오기
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
```

### 📡 주요 API 엔드포인트

#### 1. 주차 공간 상태 업데이트 (UPSERT)
```python
def update_parking_status(spot_id: str, is_occupied: bool):
    """주차 공간 상태 업데이트"""
    data = {
        "spot_id": spot_id,
        "is_occupied": is_occupied,
        "last_updated": datetime.now().isoformat()
    }

    response = supabase.table('parking_current_status')\
        .upsert(data)\
        .execute()

    return response.data
```

#### 2. 입차 이벤트 생성
```python
def create_entry_event(license_plate: str, is_registered: bool):
    """입차 이벤트 생성"""
    data = {
        "license_plate": license_plate,
        "event_type": "entry",
        "gate_id": "GATE-01",
        "is_registered": is_registered,
        "confidence": 0.95
    }

    response = supabase.table('parking_events')\
        .insert(data)\
        .execute()

    return response.data
```

#### 3. 차량 조회
```python
def get_vehicle_by_plate(license_plate: str):
    """번호판으로 차량 조회"""
    response = supabase.table('vehicles')\
        .select('*, customers(*)')\
        .eq('license_plate', license_plate)\
        .execute()

    return response.data[0] if response.data else None
```

#### 4. 빈 주차 공간 찾기
```python
def find_available_spot():
    """빈 주차 공간 찾기"""
    response = supabase.table('parking_current_status')\
        .select('spot_id')\
        .eq('is_occupied', False)\
        .limit(1)\
        .execute()

    return response.data[0] if response.data else None
```

#### 5. 주차 세션 생성
```python
def create_parking_session(license_plate: str, spot_id: str, vehicle_data=None):
    """주차 세션 생성"""
    data = {
        "license_plate": license_plate,
        "parking_spot_id": spot_id,
        "entry_time": datetime.now().isoformat(),
        "status": "parked"
    }

    # 등록 차량인 경우
    if vehicle_data:
        data["vehicle_id"] = vehicle_data['vehicle_id']
        data["customer_id"] = vehicle_data['customer_id']

    response = supabase.table('parking_sessions')\
        .insert(data)\
        .execute()

    return response.data
```

#### 6. 활성 세션 조회
```python
def get_active_session(license_plate: str):
    """활성 주차 세션 조회"""
    response = supabase.table('parking_sessions')\
        .select('*')\
        .eq('license_plate', license_plate)\
        .eq('status', 'parked')\
        .limit(1)\
        .execute()

    return response.data[0] if response.data else None
```

#### 7. 세션 종료
```python
def close_session(session_id: str):
    """주차 세션 종료"""
    data = {
        "exit_time": datetime.now().isoformat(),
        "status": "exited"
    }

    response = supabase.table('parking_sessions')\
        .update(data)\
        .eq('session_id', session_id)\
        .execute()

    return response.data
```

#### 8. 요금 계산
```python
def calculate_fee(entry_time: str, exit_time: str):
    """주차 요금 계산"""
    response = supabase.rpc('calculate_parking_fee', {
        'p_entry_time': entry_time,
        'p_exit_time': exit_time
    }).execute()

    return response.data[0] if response.data else None
```

#### 9. 요금 기록 생성
```python
def create_parking_fee(session_id: str, fee_data: dict):
    """주차 요금 기록 생성"""
    data = {
        "session_id": session_id,
        "base_fee": fee_data['base_fee'],
        "additional_fee": fee_data['additional_fee'],
        "total_fee": fee_data['total_fee'],
        "payment_status": "unpaid"
    }

    response = supabase.table('parking_fees')\
        .insert(data)\
        .execute()

    return response.data
```

---

## 5. 데모 전체 코드 예시

### 🚗 입차 처리 전체 흐름

```python
import random
from datetime import datetime
from supabase import create_client

class ParkingDemo:
    def __init__(self, supabase_url, supabase_key):
        self.supabase = create_client(supabase_url, supabase_key)

        # 등록 차량 목록
        self.registered_plates = [
            "12가3456", "34나7890", "56다1234",
            "78라5678", "90마9012"
        ]

    def generate_random_plate(self, registered=True):
        """랜덤 번호판 생성"""
        if registered:
            return random.choice(self.registered_plates)
        else:
            num1 = random.randint(10, 99)
            num2 = random.randint(1000, 9999)
            region = random.choice(['가', '나', '다', '라', '마'])
            return f"{num1}{region}{num2}"

    def handle_entry(self, license_plate=None, is_registered=True):
        """입차 처리"""
        # 1. 번호판 생성 (없으면)
        if not license_plate:
            license_plate = self.generate_random_plate(is_registered)

        print(f"[입차] 차량 번호: {license_plate}")

        # 2. 입차 이벤트 생성
        self.supabase.table('parking_events').insert({
            "license_plate": license_plate,
            "event_type": "entry",
            "gate_id": "GATE-01",
            "is_registered": is_registered,
            "confidence": 0.95
        }).execute()
        print("  ✓ 입차 이벤트 생성")

        # 3. 차량 조회
        vehicle_response = self.supabase.table('vehicles')\
            .select('*, customers(*)')\
            .eq('license_plate', license_plate)\
            .execute()

        vehicle = vehicle_response.data[0] if vehicle_response.data else None

        if vehicle:
            print(f"  ✓ 등록 차량: {vehicle['customers']['name']}")
        else:
            print("  ⚠ 미등록 차량")

        # 4. 빈 주차 공간 찾기
        spot_response = self.supabase.table('parking_current_status')\
            .select('spot_id')\
            .eq('is_occupied', False)\
            .limit(1)\
            .execute()

        if not spot_response.data:
            print("  ✗ 주차 공간 없음")
            return None

        spot_id = spot_response.data[0]['spot_id']
        print(f"  ✓ 주차 공간 할당: {spot_id}")

        # 5. 주차 세션 생성
        session_data = {
            "license_plate": license_plate,
            "parking_spot_id": spot_id,
            "entry_time": datetime.now().isoformat(),
            "status": "parked"
        }

        if vehicle:
            session_data["vehicle_id"] = vehicle['vehicle_id']
            session_data["customer_id"] = vehicle['customer_id']

        session_response = self.supabase.table('parking_sessions')\
            .insert(session_data)\
            .execute()
        print("  ✓ 주차 세션 생성")

        # 6. 주차 공간 상태 업데이트
        self.supabase.table('parking_current_status')\
            .update({"is_occupied": True})\
            .eq('spot_id', spot_id)\
            .execute()
        print(f"  ✓ 주차 공간 {spot_id} 점유로 변경")

        return session_response.data[0]

    def handle_exit(self, license_plate):
        """출차 처리"""
        print(f"[출차] 차량 번호: {license_plate}")

        # 1. 출차 이벤트 생성
        self.supabase.table('parking_events').insert({
            "license_plate": license_plate,
            "event_type": "exit",
            "gate_id": "GATE-01",
            "confidence": 0.95
        }).execute()
        print("  ✓ 출차 이벤트 생성")

        # 2. 활성 세션 조회
        session_response = self.supabase.table('parking_sessions')\
            .select('*')\
            .eq('license_plate', license_plate)\
            .eq('status', 'parked')\
            .limit(1)\
            .execute()

        if not session_response.data:
            print("  ✗ 활성 세션 없음")
            return None

        session = session_response.data[0]
        spot_id = session['parking_spot_id']
        print(f"  ✓ 세션 조회: {spot_id}")

        # 3. 세션 종료
        self.supabase.table('parking_sessions')\
            .update({
                "exit_time": datetime.now().isoformat(),
                "status": "exited"
            })\
            .eq('session_id', session['session_id'])\
            .execute()
        print("  ✓ 세션 종료")

        # 4. 요금 계산
        fee_response = self.supabase.rpc('calculate_parking_fee', {
            'p_entry_time': session['entry_time'],
            'p_exit_time': datetime.now().isoformat()
        }).execute()

        fee_data = fee_response.data[0]
        print(f"  ✓ 요금 계산: {fee_data['total_fee']:,.0f}원")

        # 5. 요금 기록
        self.supabase.table('parking_fees').insert({
            "session_id": session['session_id'],
            "base_fee": fee_data['base_fee'],
            "additional_fee": fee_data['additional_fee'],
            "total_fee": fee_data['total_fee'],
            "payment_status": "unpaid"
        }).execute()
        print("  ✓ 요금 기록 생성")

        # 6. 주차 공간 비우기
        self.supabase.table('parking_current_status')\
            .update({"is_occupied": False})\
            .eq('spot_id', spot_id)\
            .execute()
        print(f"  ✓ 주차 공간 {spot_id} 비움")

        return fee_data

# 사용 예시
if __name__ == "__main__":
    demo = ParkingDemo(
        supabase_url="https://your-project.supabase.co",
        supabase_key="your-anon-key"
    )

    # 등록 차량 입차
    session = demo.handle_entry(is_registered=True)

    # 미등록 차량 입차
    # session = demo.handle_entry(is_registered=False)

    # 출차 (입차한 차량 번호로)
    # demo.handle_exit("12가3456")
```

---

## 6. 개발 체크리스트

### Phase 1: 환경 설정
- [ ] Python 가상환경 생성
- [ ] `pip install supabase` 설치
- [ ] 환경 변수 설정 (.env 파일)
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_KEY=your-anon-key
  ```

### Phase 2: 기본 기능 테스트
- [ ] Supabase 연결 확인
- [ ] 주차 공간 조회 테스트
- [ ] 차량 조회 테스트

### Phase 3: 입차 로직 구현
- [ ] 랜덤 번호판 생성 함수
- [ ] 입차 이벤트 생성
- [ ] 차량 조회 (등록 여부 확인)
- [ ] 빈 주차 공간 찾기
- [ ] 주차 세션 생성
- [ ] 주차 공간 상태 업데이트

### Phase 4: 출차 로직 구현
- [ ] 출차 이벤트 생성
- [ ] 활성 세션 조회
- [ ] 세션 종료
- [ ] 요금 계산 (RPC 호출)
- [ ] 요금 기록 생성
- [ ] 주차 공간 비우기

### Phase 5: 데모 시나리오 테스트
- [ ] 등록 차량 입차 → 출차
- [ ] 미등록 차량 입차 → 출차
- [ ] 여러 차량 동시 처리
- [ ] 웹 대시보드 확인

---

## 7. 트러블슈팅

### 문제 1: 주차 공간이 없을 때
```python
spot_response = supabase.table('parking_current_status')\
    .select('spot_id')\
    .eq('is_occupied', False)\
    .limit(1)\
    .execute()

if not spot_response.data:
    print("주차 공간이 가득 찼습니다")
    return None
```

### 문제 2: 차량이 이미 주차 중일 때
```python
# 입차 전에 확인
existing = supabase.table('parking_sessions')\
    .select('*')\
    .eq('license_plate', license_plate)\
    .eq('status', 'parked')\
    .execute()

if existing.data:
    print("이미 주차 중인 차량입니다")
    return None
```

### 문제 3: 요금 계산 함수 오류
```python
try:
    fee_response = supabase.rpc('calculate_parking_fee', {
        'p_entry_time': entry_time,
        'p_exit_time': exit_time
    }).execute()
except Exception as e:
    print(f"요금 계산 오류: {e}")
    # 기본 요금 적용
    return {"base_fee": 2000, "additional_fee": 0, "total_fee": 2000}
```

---

## 8. 다음 단계

1. **Python 데모 스크립트 작성**
   - 위의 코드 참고하여 구현

2. **웹 대시보드 확인**
   - http://localhost:3000/parking-status
   - 실시간으로 주차 공간 변화 확인

3. **ROS2 연동 (나중에)**
   - YOLO 노드와 연결
   - LPR 노드와 연결

---

## 📞 참고 자료

- [Supabase Python 문서](https://supabase.com/docs/reference/python/introduction)
- [PostgreSQL 함수 문서](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [프로젝트 README](../README.md)
- [데이터베이스 스키마](./DATABASE.md)
- [API 문서](./API.md)

---

**마지막 업데이트**: 2024-11-29
**작성자**: Claude
**버전**: 1.0
