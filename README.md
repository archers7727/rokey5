# 🚗 ROS2 기반 스마트 주차장 시스템

Supabase 기반 실시간 주차장 관리 및 모니터링 웹 대시보드

## 📋 프로젝트 개요

이 프로젝트는 ROS2와 Supabase를 활용한 스마트 주차장 관리 시스템입니다. AI 기반 주차 공간 감지, 차량 번호판 인식(LPR), 실시간 모니터링, 자동 요금 계산 등의 기능을 제공합니다.

### 주요 기능

- ✅ **실시간 주차 현황 모니터링**: YOLO 기반 차량 감지 및 주차 공간 상태 실시간 업데이트
- ✅ **차량 번호판 자동 인식**: OCR 기반 LPR 시스템
- ✅ **고객 및 차량 관리**: 고객 정보, 차량 등록 및 관리
- ✅ **자동 요금 계산**: 정책 기반 주차 요금 자동 계산
- ✅ **결제 관리**: 내부 결제 상태 관리 (PG 연동 없음)
- ✅ **통계 및 리포트**: 일/주/월별 통계 및 차트

## 🏗️ 기술 스택

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Charts**: Recharts
- **Routing**: React Router v6
- **Database**: Supabase (PostgreSQL + Realtime)

### Backend
- **Database**: Supabase PostgreSQL
- **Realtime**: Supabase Realtime Subscriptions
- **Functions**: PostgreSQL Functions & Triggers

### ROS2 Integration (별도 개발)
- **Framework**: ROS2 (Humble/Iron)
- **Computer Vision**: YOLO v5/v8, OpenCV
- **OCR**: EasyOCR / PaddleOCR

## 📁 프로젝트 구조

```
rokey5/
├── frontend/                 # React 웹 대시보드
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   │   └── Layout.tsx
│   │   ├── pages/           # 페이지
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ParkingStatus.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── Vehicles.tsx
│   │   │   ├── Events.tsx
│   │   │   ├── Payments.tsx
│   │   │   └── Reports.tsx
│   │   ├── services/        # Supabase 클라이언트
│   │   │   └── supabase.ts
│   │   ├── types/           # TypeScript 타입
│   │   │   └── database.types.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── supabase/                # Supabase 설정
│   ├── migrations/          # DB 마이그레이션
│   │   └── 001_initial_schema.sql
│   └── seed.sql             # 초기 데이터
│
├── docs/                    # 문서
│   ├── API.md              # API 명세 (ROS2 연동용)
│   └── DATABASE.md         # DB 스키마 문서
│
└── README.md
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18 이상
- npm 또는 yarn
- Supabase 계정

### 1. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL 에디터에서 마이그레이션 실행:
   ```sql
   -- supabase/migrations/001_initial_schema.sql 파일 내용 복사하여 실행
   ```
3. 샘플 데이터 삽입 (선택):
   ```sql
   -- supabase/seed.sql 파일 내용 복사하여 실행
   ```
4. Realtime 활성화:
   - Database > Replication 설정
   - 다음 테이블에 대해 Realtime 활성화:
     - `parking_current_status`
     - `parking_events`
     - `parking_sessions`

### 2. Frontend 설정

```bash
# 프로젝트 클론
cd rokey5/frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

`.env` 파일 편집:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 4. 빌드

```bash
npm run build
```

## 📊 데이터베이스 스키마

### 주요 테이블

1. **customers** - 고객 정보
2. **vehicles** - 차량 정보
3. **parking_current_status** - 실시간 주차 현황
4. **parking_events** - 입출차 이벤트 로그
5. **parking_sessions** - 주차 세션 (입차~출차)
6. **parking_fees** - 주차 요금 정보
7. **payment_methods** - 결제 수단 (간소화)
8. **parking_fee_policy** - 요금 정책 설정

자세한 스키마는 [DATABASE.md](./docs/DATABASE.md) 참고

## 🔗 ROS2 연동 가이드

ROS2 노드에서 Supabase REST API를 사용하여 데이터 전송:

```python
import requests

SUPABASE_URL = "https://your-project.supabase.co"
SUPABASE_KEY = "your-anon-key"

# 주차 현황 업데이트
def update_parking_status(spot_id, is_occupied, confidence):
    url = f"{SUPABASE_URL}/rest/v1/parking_current_status"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    data = {
        "spot_id": spot_id,
        "is_occupied": is_occupied,
        "confidence": confidence
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# 입차 이벤트 생성
def create_entry_event(license_plate, gate_id, confidence):
    url = f"{SUPABASE_URL}/rest/v1/parking_events"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "license_plate": license_plate,
        "event_type": "entry",
        "gate_id": gate_id,
        "confidence": confidence,
        "is_registered": True  # 차량 등록 여부는 별도 조회 필요
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

자세한 API 명세는 [API.md](./docs/API.md) 참고

## 📱 주요 화면

### 1. 대시보드
- 실시간 통계 (전체 주차칸, 현재 주차 중, 오늘 입차, 오늘 매출)
- 주차 현황 (점유율, 이용 가능 칸)
- 최근 입출차 이벤트

### 2. 실시간 주차 현황
- 주차 공간 맵 (그리드 뷰)
- 구역별 필터링
- 실시간 업데이트

### 3. 고객 관리
- 고객 목록 조회 및 검색
- 고객 등록/수정/삭제
- 차량 정보 연동

### 4. 차량 관리
- 차량 목록 및 검색
- 차량 등록/수정/삭제
- 고객 정보 연동

### 5. 입출차 이벤트
- 실시간 입출차 로그
- 이벤트 타입별 필터링
- 차량번호 검색

### 6. 결제 관리
- 결제 내역 조회
- 수동 결제 처리
- 환불 처리

### 7. 통계 및 리포트
- 오늘의 통계
- 시간대별 입출차 차트
- 주간 매출 추이
- CSV 다운로드

## ⚙️ 요금 정책

기본 요금 정책 (수정 가능):

- **무료 시간**: 최초 10분
- **기본 요금**: 30분 2,000원
- **추가 요금**: 10분당 1,000원
- **일 최대 요금**: 20,000원

요금 정책은 `parking_fee_policy` 테이블에서 관리

## 🔒 보안

- Supabase Row Level Security (RLS) 설정 가능
- API Key는 환경 변수로 관리
- HTTPS 통신
- `.env` 파일은 `.gitignore`에 포함

## 🛠️ 개발 가이드

### 새로운 페이지 추가

1. `src/pages/` 에 새 컴포넌트 생성
2. `src/App.tsx` 에 라우트 추가
3. `src/components/Layout.tsx` 에 메뉴 아이템 추가

### Supabase 함수 호출

```typescript
import { supabase } from '@/services/supabase';

// 데이터 조회
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .order('created_at', { ascending: false });

// 데이터 삽입
const { data, error } = await supabase
  .from('customers')
  .insert([{ name: '홍길동', phone: '010-1234-5678' }]);

// Realtime 구독
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'parking_events' },
    (payload) => console.log(payload)
  )
  .subscribe();
```

## 📝 TODO

- [ ] 고객 등록/수정 다이얼로그 구현
- [ ] 차량 등록/수정 다이얼로그 구현
- [ ] 결제 처리 로직 구현
- [ ] 환불 처리 로직 구현
- [ ] 관리자 인증 시스템
- [ ] RLS 정책 설정
- [ ] 이미지 업로드 (차량 사진)
- [ ] 알림 시스템
- [ ] 다국어 지원

## 🤝 기여

이 프로젝트는 ROS2 기반 스마트 주차장 시스템의 웹 대시보드입니다.

## 📄 라이선스

MIT License

## 📞 문의

프로젝트 관련 문의사항이 있으시면 이슈를 등록해주세요.
