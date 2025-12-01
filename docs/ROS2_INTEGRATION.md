# ROS2 출차 컨트롤러 통합 가이드

## 📌 개요

웹에서 출차 버튼 클릭 → ROS2가 실시간으로 감지 → 게이트 제어를 구현한 예시입니다.

## 🔍 DB 조회 방식 비교

### ❌ Polling 방식 (권장하지 않음)

```python
# 나쁜 예: 1초마다 DB 조회
while True:
    commands = supabase.table('ros2_commands') \
        .select('*') \
        .eq('status', 'pending') \
        .execute()

    # 명령 처리...
    time.sleep(1)  # ❌ DB에 부하!
```

**문제점:**
- 초당 1회 쿼리 = 시간당 3,600회 쿼리
- Supabase 무료 플랜 제한 (500MB/월, 50,000 API 요청/월)
- 응답 지연 (최대 1초)
- 불필요한 네트워크 트래픽

### ✅ Realtime Subscribe 방식 (추천)

```python
# 좋은 예: WebSocket으로 실시간 푸시
channel = supabase.channel('my-channel')
channel.on_postgres_changes(
    event='INSERT',
    schema='public',
    table='ros2_commands',
    callback=handle_command
).subscribe()

# 명령이 INSERT될 때만 callback 호출!
# DB 조회 0회, 응답시간 100ms 이내
```

**장점:**
- **DB 부하 0회** (PostgreSQL의 LISTEN/NOTIFY 기능 사용)
- **실시간 반응** (100~300ms 이내)
- **네트워크 효율** (WebSocket 한 번만 연결)
- **무료 플랜 안전** (API 요청 카운트 안 됨)

## 🚀 설치 및 실행

### 1. Python 패키지 설치

```bash
pip install supabase
```

### 2. 환경 변수 설정

```bash
export SUPABASE_URL='https://your-project.supabase.co'
export SUPABASE_ANON_KEY='your-anon-key-here'
```

### 3. 실행

```bash
python ros2_exit_controller.py
```

**실행 화면:**
```
==================================================
🤖 ROS2 출차 컨트롤러 시작
==================================================
Supabase URL: https://xxx.supabase.co
Realtime Subscribe 방식으로 명령 대기 중...
⚠️  DB를 계속 조회하지 않습니다! (WebSocket으로 푸시 받음)
==================================================

🚀 Exit Controller 초기화 완료
✅ Realtime Subscribe 연결 완료!
💡 출차 버튼을 누르면 즉시 반응합니다...
```

### 4. 출차 버튼 클릭 시

```
📨 새 명령 수신: EXIT_GATE_OPEN (ID: xxx)
   차량번호: 12가3456
   주차위치: A-01
⏳ 처리 시작...
   상태 업데이트: processing
🔓 EXIT-01 게이트 열기
⏱️  10초 동안 게이트 열림...
🔒 EXIT-01 게이트 닫기
✅ 명령 완료!
   상태 업데이트: completed

==================================================
🎉 출차 완료!
==================================================
차량번호: 12가3456
주차 요금: ₩4,000
안녕히 가세요!
==================================================
```

## 📊 데이터 흐름

```
[Frontend: CustomerView.tsx]
    ↓ 출차 버튼 클릭
[Backend: api/parking/exit.ts]
    ↓ processExit() 호출
[ParkingService]
    ↓ ros2_commands 테이블에 INSERT
    ↓ status: 'pending'
[Supabase]
    ↓ WebSocket으로 실시간 푸시 (LISTEN/NOTIFY)
    ↓ 100~300ms 이내
[ROS2: ros2_exit_controller.py]
    ↓ handle_command() 콜백 실행
    ↓ status → 'processing'
[게이트 제어]
    ↓ 게이트 열기
    ↓ 10초 대기
    ↓ 게이트 닫기
[완료]
    ↓ status → 'completed'
    ↓ completed_at 기록
```

## 🔧 실제 ROS2 통합

실제 ROS2 프로젝트에 통합할 때:

```python
import rclpy
from rclpy.node import Node
from your_msgs.msg import GateControl

class ExitController(Node):
    def __init__(self):
        super().__init__('exit_controller')

        # ROS2 Publisher
        self.gate_pub = self.create_publisher(
            GateControl,
            '/parking/gate_control',
            10
        )

        # Supabase Realtime Subscribe
        channel = supabase.channel('ros2-commands')
        channel.on_postgres_changes(
            event='INSERT',
            schema='public',
            table='ros2_commands',
            callback=self.handle_command
        ).subscribe()

    def execute_exit_gate_open(self, command):
        """실제 게이트 제어"""
        command_id = command['command_id']

        try:
            # 1. 상태 업데이트
            self.update_command_status(command_id, 'processing')

            # 2. ROS2 메시지 발행
            msg = GateControl()
            msg.gate_id = command['payload']['gate_id']
            msg.action = 'open'
            msg.duration = command['payload']['duration_seconds']

            self.gate_pub.publish(msg)
            self.get_logger().info(f'Gate control published: {msg.gate_id}')

            # 3. 완료 대기 (실제로는 feedback 구독)
            time.sleep(msg.duration)

            # 4. 완료 처리
            self.update_command_status(command_id, 'completed')

        except Exception as e:
            self.get_logger().error(f'Gate control failed: {e}')
            self.update_command_status(command_id, 'failed', str(e))
```

## 🎯 핵심 포인트

### ✅ 이렇게 하세요

1. **Realtime Subscribe 사용** (WebSocket)
2. **단방향 데이터 흐름** (웹 → DB → ROS2)
3. **상태 추적** (pending → processing → completed)
4. **에러 처리** (failed 상태 + error_message)

### ❌ 이렇게 하지 마세요

1. **Polling으로 DB 계속 조회** ← 성능 문제!
2. **ROS2에서 웹으로 직접 HTTP 요청** ← 결합도 증가
3. **명령 이력 삭제** ← 디버깅 어려움
4. **타임아웃 처리 없음** ← 무한 대기 가능

## 📈 성능 비교

| 방식 | 응답시간 | DB 쿼리 (1시간) | 네트워크 |
|------|---------|----------------|----------|
| Polling (1초) | 0~1초 | 3,600회 | 높음 |
| Polling (5초) | 0~5초 | 720회 | 보통 |
| Realtime Subscribe | ~100ms | 0회 | 매우 낮음 |

## 🔐 보안 고려사항

1. **RLS (Row Level Security)** 설정
   ```sql
   ALTER TABLE ros2_commands ENABLE ROW LEVEL SECURITY;

   -- ROS2는 모든 명령 읽기 가능
   CREATE POLICY "ROS2 can read commands"
   ON ros2_commands FOR SELECT
   USING (true);

   -- ROS2는 상태만 업데이트 가능
   CREATE POLICY "ROS2 can update status"
   ON ros2_commands FOR UPDATE
   USING (true)
   WITH CHECK (status IN ('processing', 'completed', 'failed'));
   ```

2. **Service Role Key 사용** (프로덕션)
   - Anon Key: 웹 Frontend
   - Service Role Key: ROS2 백엔드

## 🐛 트러블슈팅

### 명령이 감지되지 않음

1. Realtime이 테이블에 활성화되어 있는지 확인
   - Supabase Dashboard → Database → Replication
   - `ros2_commands` 테이블 활성화

2. 환경 변수 확인
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

3. 네트워크 연결 확인
   - WebSocket 연결 가능한지 확인
   - 방화벽/프록시 설정

### 명령이 중복 실행됨

- `status = 'pending'` 필터링 확인
- 중복 구독 방지 (channel 한 번만 생성)

## 📚 참고 자료

- [Supabase Realtime 문서](https://supabase.com/docs/guides/realtime)
- [PostgreSQL LISTEN/NOTIFY](https://www.postgresql.org/docs/current/sql-notify.html)
- [ROS2 Python 예제](https://docs.ros2.org/latest/api/rclpy/)
