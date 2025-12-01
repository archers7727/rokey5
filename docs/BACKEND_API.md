# Backend API 문서

Smart Parking System의 Backend API 엔드포인트 문서입니다.

## Base URL

- **Production**: `https://your-project.vercel.app/api`
- **Development**: `http://localhost:3000/api`

## 인증

현재 버전은 간단한 데모용으로 인증이 필요하지 않습니다.
프로덕션 환경에서는 JWT 또는 API Key 인증을 추가하는 것을 권장합니다.

## API 엔드포인트

### 1. 입차 처리

차량 입차를 처리하고 주차 공간을 할당합니다.

**Endpoint:** `POST /parking/entry`

**Request Body:**
```json
{
  "license_plate": "12가3456",
  "gate_id": "GATE-01",
  "is_registered": true,
  "vehicle_id": "uuid-optional",
  "customer_id": "uuid-optional"
}
```

**Required Fields:**
- `license_plate` (string): 차량 번호판
- `gate_id` (string): 게이트 ID

**Optional Fields:**
- `is_registered` (boolean): 등록 차량 여부 (default: false)
- `vehicle_id` (string): 차량 ID (등록 차량인 경우)
- `customer_id` (string): 고객 ID (등록 차량인 경우)

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "session": {
      "session_id": "770e8400-...",
      "license_plate": "12가3456",
      "parking_spot_id": "A-01",
      "entry_time": "2024-12-01T05:30:00.000Z",
      "status": "parked"
    },
    "parking_spot": "A-01"
  },
  "message": "Vehicle entry processed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No available parking spots"
}
```

**사용 예시:**
```typescript
const response = await api.processEntry({
  license_plate: "12가3456",
  gate_id: "GATE-01",
  is_registered: true,
  customer_id: "550e8400-..."
});
```

---

### 2. 출차 처리

차량 출차를 처리하고 요금을 계산합니다.

**Endpoint:** `POST /parking/exit`

**Request Body:**
```json
{
  "session_id": "770e8400-e29b-41d4-a716-446655440001",
  "gate_id": "CUSTOMER-APP"
}
```

**Required Fields:**
- `session_id` (string): 주차 세션 ID

**Optional Fields:**
- `gate_id` (string): 게이트 ID (default: "CUSTOMER-APP")

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "session_id": "770e8400-...",
    "exit_time": "2024-12-01T07:30:00.000Z",
    "fee": {
      "base_fee": 2000,
      "additional_fee": 9000,
      "total_fee": 11000
    }
  },
  "message": "Vehicle exit processed successfully"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Parking session not found"
}
```

**사용 예시:**
```typescript
const response = await api.processExit(sessionId, "CUSTOMER-APP");
```

---

### 3. 고객 세션 조회

특정 고객의 현재 주차 세션을 조회합니다.

**Endpoint:** `GET /customer/session`

**Query Parameters:**
- `customer_id` (required): 고객 UUID

**Request:**
```
GET /customer/session?customer_id=550e8400-e29b-41d4-a716-446655440001
```

**Response (Success - Session Found):**
```json
{
  "success": true,
  "data": {
    "session_id": "770e8400-...",
    "customer_id": "550e8400-...",
    "license_plate": "12가3456",
    "parking_spot_id": "A-03",
    "entry_time": "2024-12-01T05:30:00.000Z",
    "status": "parked",
    "vehicles": {
      "vehicle_id": "660e8400-...",
      "license_plate": "12가3456",
      "vehicle_type": "승용차",
      "vehicle_color": "검정"
    }
  }
}
```

**Response (Success - No Session):**
```json
{
  "success": true,
  "data": null,
  "message": "No active parking session"
}
```

**사용 예시:**
```typescript
const response = await api.getCustomerSession(customerId);
```

---

### 4. 주차 현황 조회

전체 주차장의 현재 상태를 조회합니다.

**Endpoint:** `GET /parking/status`

**Request:**
```
GET /parking/status
```

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "spot_id": "A-01",
      "is_occupied": true,
      "zone": "A",
      "floor": "1F",
      "last_updated": "2024-12-01T05:30:00.000Z"
    },
    {
      "spot_id": "A-02",
      "is_occupied": false,
      "zone": "A",
      "floor": "1F",
      "last_updated": "2024-12-01T04:15:00.000Z"
    }
    // ... 나머지 주차 공간들
  ]
}
```

**사용 예시:**
```typescript
const response = await api.getParkingStatus();
```

---

## 에러 코드

### HTTP 상태 코드

- `200 OK`: 요청 성공
- `400 Bad Request`: 잘못된 요청 (필수 필드 누락 등)
- `405 Method Not Allowed`: 허용되지 않은 HTTP 메서드
- `500 Internal Server Error`: 서버 내부 오류

### 에러 응답 형식

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

---

## 비즈니스 로직

### 입차 처리 흐름

1. 빈 주차 공간 검색 (`is_occupied = false`)
2. 입차 이벤트 생성 (`parking_events`)
3. 주차 세션 생성 (`parking_sessions`)
4. 주차 공간 점유 상태 업데이트 (`parking_current_status`)

### 출차 처리 흐름

1. 주차 세션 조회 및 검증
2. 출차 이벤트 생성 (`parking_events`)
3. 세션 종료 처리 (`exit_time`, `status = 'exited'`)
4. 주차 요금 계산 (RPC 함수 호출)
5. 요금 기록 생성 (`parking_fees`)
6. 주차 공간 비우기 (`is_occupied = false`)

### 요금 계산 정책

- **무료 시간**: 10분
- **기본 요금**: 30분까지 ₩2,000
- **추가 요금**: 10분당 ₩1,000
- **일일 최대**: ₩20,000

**계산 예시:**
```
120분 주차:
- 무료: 10분
- 기본: 30분 → ₩2,000
- 추가: 80분 = 8개 단위 → ₩8,000
- 총액: ₩10,000
```

---

## TypeScript 타입 정의

```typescript
// 요청 타입
interface EntryRequest {
  license_plate: string;
  gate_id: string;
  is_registered?: boolean;
  vehicle_id?: string;
  customer_id?: string;
}

interface ExitRequest {
  session_id: string;
  gate_id?: string;
}

// 응답 타입
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ParkingSession {
  session_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  license_plate: string;
  parking_spot_id: string | null;
  entry_time: string;
  exit_time: string | null;
  status: 'parked' | 'exited';
}

interface ParkingFee {
  base_fee: number;
  additional_fee: number;
  total_fee: number;
}
```

---

## ROS2 통합 예시

Python으로 ROS2 노드에서 API 호출:

```python
import requests
import json

API_BASE_URL = "https://your-project.vercel.app/api"

# 입차 처리
def process_vehicle_entry(license_plate, gate_id="GATE-01"):
    url = f"{API_BASE_URL}/parking/entry"
    payload = {
        "license_plate": license_plate,
        "gate_id": gate_id,
        "is_registered": False
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result["success"]:
        session = result["data"]["session"]
        spot = result["data"]["parking_spot"]
        print(f"입차 완료: {license_plate} → {spot}")
        return session
    else:
        print(f"입차 실패: {result['error']}")
        return None

# 출차 처리
def process_vehicle_exit(session_id):
    url = f"{API_BASE_URL}/parking/exit"
    payload = {
        "session_id": session_id,
        "gate_id": "GATE-01"
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result["success"]:
        fee = result["data"]["fee"]["total_fee"]
        print(f"출차 완료: 요금 ₩{fee:,}")
        return result["data"]
    else:
        print(f"출차 실패: {result['error']}")
        return None
```

---

## 성능 고려사항

### Vercel Serverless Function 제한

- **무료 티어**: 함수 실행 시간 10초 제한
- **메모리**: 1024MB
- **동시 실행**: 제한 없음 (단, 콜드 스타트 있음)

### 최적화 팁

1. **Supabase 클라이언트 재사용**: 싱글톤 패턴 사용 (`lib/supabase.ts`)
2. **쿼리 최적화**: 필요한 필드만 select
3. **에러 핸들링**: try-catch로 모든 에러 처리
4. **트랜잭션 없음**: Supabase REST API는 트랜잭션 미지원 (수동 롤백 필요시 고려)

---

## 보안 고려사항

### 현재 구현 (데모용)

- ❌ 인증 없음
- ❌ Rate limiting 없음
- ❌ Input validation 최소
- ✅ CORS 허용 (모든 origin)

### 프로덕션 권장사항

1. **인증 추가**: JWT 토큰 또는 API Key
2. **Rate Limiting**: Vercel Edge Config 또는 Redis 사용
3. **Input Validation**: Zod 등의 라이브러리 사용
4. **CORS 제한**: 특정 도메인만 허용
5. **Supabase RLS**: Row Level Security 활성화
6. **환경변수 보호**: Supabase Service Role Key 사용 시 주의

---

## 문제 해결

### 일반적인 문제

**문제**: API 호출 시 500 에러
**해결**:
- Vercel 대시보드에서 로그 확인
- Supabase 환경변수 확인
- 네트워크 콘솔에서 요청/응답 확인

**문제**: CORS 에러
**해결**:
- API 파일의 CORS 헤더 확인
- Preflight OPTIONS 요청 처리 확인

**문제**: 타임아웃 에러
**해결**:
- 쿼리 최적화
- 불필요한 DB 호출 제거
- Pro Plan 고려

---

## 관련 문서

- [배포 가이드](./DEPLOYMENT.md)
- [데이터베이스 스키마](./DATABASE.md)
- [프론트엔드 API 클라이언트](../frontend/src/services/api.ts)
