# Vercel 배포 가이드

이 문서는 Smart Parking System을 Vercel에 배포하는 방법을 설명합니다.

## 프로젝트 구조

```
rokey5/
├── frontend/           # React 프론트엔드
├── api/               # Vercel Serverless Functions (백엔드)
│   ├── parking/       # 주차 관련 API
│   └── customer/      # 고객 관련 API
├── lib/               # 공통 라이브러리 (Supabase 클라이언트 등)
├── vercel.json        # Vercel 배포 설정
└── package.json       # 백엔드 의존성
```

## 배포 전 준비사항

### 1. Supabase 프로젝트 설정

Supabase 대시보드에서 다음 정보를 확인:
- Project URL
- Anon (public) key

### 2. Vercel 계정 생성

1. [Vercel](https://vercel.com) 가입
2. GitHub 계정 연동

## Vercel 배포 단계

### 1단계: Vercel에 프로젝트 Import

```bash
# Vercel CLI 설치 (선택사항)
npm install -g vercel

# 프로젝트 루트에서 배포
vercel
```

또는 Vercel 웹 대시보드에서:
1. "Add New Project" 클릭
2. GitHub 저장소 선택
3. rokey5 프로젝트 import

### 2단계: 환경변수 설정

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables

다음 환경변수 추가:

**Backend API용:**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Frontend용:**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_BASE_URL=/api
```

### 3단계: Build 설정

Vercel이 자동으로 `vercel.json`을 읽어서 설정합니다.

**Build Command (Frontend):**
```bash
cd frontend && npm install && npm run build
```

**Output Directory:**
```
frontend/dist
```

### 4단계: 배포 확인

배포 완료 후 Vercel이 제공하는 URL로 접속:
```
https://your-project-name.vercel.app
```

## API 엔드포인트 테스트

### 주차 현황 조회
```bash
curl https://your-project-name.vercel.app/api/parking/status
```

### 고객 세션 조회
```bash
curl "https://your-project-name.vercel.app/api/customer/session?customer_id=550e8400-e29b-41d4-a716-446655440001"
```

### 입차 처리
```bash
curl -X POST https://your-project-name.vercel.app/api/parking/entry \
  -H "Content-Type: application/json" \
  -d '{
    "license_plate": "12가3456",
    "gate_id": "GATE-01",
    "is_registered": true
  }'
```

### 출차 처리
```bash
curl -X POST https://your-project-name.vercel.app/api/parking/exit \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "your-session-id-here"
  }'
```

## 로컬 개발 환경

### Backend 개발

```bash
# 루트 디렉토리에서
npm install

# Vercel Dev 서버 실행
vercel dev
# 또는
npm run dev
```

Backend API는 `http://localhost:3000/api`에서 실행됩니다.

### Frontend 개발

```bash
cd frontend
npm install
npm run dev
```

Frontend는 `http://localhost:5173`에서 실행됩니다.

### 환경변수 설정 (로컬)

**루트 디렉토리 `.env` (Backend용):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**`frontend/.env` (Frontend용):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_BASE_URL=http://localhost:3000/api
```

## 트러블슈팅

### 1. API 호출 시 CORS 에러

각 API 파일에 CORS 헤더가 설정되어 있는지 확인:
```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
```

### 2. Supabase 연결 오류

환경변수가 올바르게 설정되었는지 확인:
- Vercel 대시보드 → Environment Variables
- 변수 이름: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (정확한 대소문자)

### 3. 함수 타임아웃 (10초 제한)

무료 티어는 10초 제한이 있습니다. 만약 타임아웃이 발생하면:
- 데이터베이스 쿼리 최적화
- 불필요한 작업 제거
- Pro Plan 고려 (60초 제한)

### 4. Build 실패

Frontend build 실패 시:
```bash
cd frontend
npm install
npm run build
```

로컬에서 먼저 테스트 후 배포하세요.

## 배포 자동화

GitHub에 push하면 자동으로 Vercel이 배포합니다:

```bash
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

Vercel이 자동으로:
1. 코드 변경 감지
2. Build 실행
3. 배포 완료
4. 새 URL 생성

## 프로덕션 체크리스트

배포 전 확인사항:
- [ ] Supabase 환경변수 설정 완료
- [ ] Frontend 환경변수 설정 완료
- [ ] API 엔드포인트 테스트 완료
- [ ] 로컬에서 정상 작동 확인
- [ ] CORS 설정 확인
- [ ] 에러 핸들링 확인
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 샘플 데이터 삽입 완료

## 추가 리소스

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [프로젝트 README](../README.md)
