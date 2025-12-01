# 🚀 ROS2 출차 컨트롤러 빠른 시작

## 📋 준비물

1. Python 3.8 이상
2. Supabase 프로젝트 (URL과 API Key)
3. `ros2_commands` 테이블 생성 완료

## ⚡ 5분 만에 시작하기

### 1️⃣ 테이블 생성 (Supabase SQL Editor)

```sql
-- supabase/migrations/002_ros2_commands.sql 파일 내용 실행
```

### 2️⃣ Realtime 활성화 (Supabase Dashboard)

```
Database → Replication → ros2_commands 테이블 활성화
```

### 3️⃣ Python 패키지 설치

```bash
pip install -r requirements-ros2.txt
```

### 4️⃣ 환경 변수 설정

```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_ANON_KEY='your-anon-key-here'
```

### 5️⃣ ROS2 컨트롤러 실행

```bash
python ros2_exit_controller.py
```

### 6️⃣ 테스트 (별도 터미널)

```bash
# 출차 명령 테스트
python test_ros2_command.py
```

## 🎯 예상 결과

### ROS2 컨트롤러 터미널

```
📨 새 명령 수신: EXIT_GATE_OPEN
🔓 EXIT-01 게이트 열기
⏱️  5초 동안 게이트 열림...
🔒 EXIT-01 게이트 닫기
✅ 명령 완료!

==================================================
🎉 출차 완료!
==================================================
차량번호: 12가3456
주차 요금: ₩4,000
안녕히 가세요!
==================================================
```

## 🔍 핵심 포인트

### ✅ Realtime Subscribe 방식

- **DB를 계속 조회하지 않음** (Polling ❌)
- **WebSocket으로 실시간 푸시 받음** (Subscribe ✅)
- **응답 시간: ~100ms**
- **DB 부하: 0회**

### 📊 데이터 흐름

```
웹 출차 버튼 클릭
    ↓
Backend API (processExit)
    ↓
Supabase (INSERT into ros2_commands)
    ↓ WebSocket Push
ROS2 Controller (handle_command)
    ↓
게이트 제어 (open → wait → close)
    ↓
상태 업데이트 (completed)
```

## 📁 파일 구조

```
rokey5/
├── ros2_exit_controller.py      # 메인 컨트롤러
├── test_ros2_command.py          # 테스트 스크립트
├── requirements-ros2.txt         # Python 의존성
├── supabase/migrations/
│   └── 002_ros2_commands.sql    # 테이블 스키마
├── docs/
│   └── ROS2_INTEGRATION.md      # 상세 문서
└── lib/
    └── parking.service.ts        # Backend (명령 삽입)
```

## 🐛 문제 해결

### "명령이 감지되지 않아요"

1. Realtime 활성화 확인
   - Supabase → Database → Replication
   - `ros2_commands` 체크

2. 환경 변수 확인
   ```bash
   echo $SUPABASE_URL
   ```

3. 네트워크 확인
   - WebSocket 포트 열려있는지 확인

### "DB 조회가 너무 많아요"

→ Polling 방식을 사용 중입니다!
→ 코드에서 `while True` + `time.sleep()` 제거
→ `channel.subscribe(callback)` 방식으로 변경

## 📚 더 알아보기

- [ROS2_INTEGRATION.md](./docs/ROS2_INTEGRATION.md) - 상세 가이드
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - 공식 문서
