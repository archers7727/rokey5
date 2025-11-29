# ROS2 연동 API 문서

ROS2 노드에서 Supabase REST API를 사용하여 데이터를 전송하는 방법을 설명합니다.

## 🔑 인증

모든 API 요청에는 다음 헤더가 필요합니다:

```python
headers = {
    "apikey": "YOUR_SUPABASE_ANON_KEY",
    "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
    "Content-Type": "application/json"
}
```

## 📍 엔드포인트

Base URL: `https://your-project.supabase.co/rest/v1`

---

## 1. 주차 공간 상태 업데이트

### POST /parking_current_status

주차 공간의 점유 상태를 업데이트합니다. (YOLO 감지 결과)

**Request:**
```python
import requests

url = "https://your-project.supabase.co/rest/v1/parking_current_status"
headers = {
    "apikey": "YOUR_KEY",
    "Authorization": "Bearer YOUR_KEY",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"  # UPSERT 동작
}

data = {
    "spot_id": "A-01",
    "is_occupied": True,
    "confidence": 0.95,
    "zone": "A",
    "floor": "1F"
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

**Response:**
```json
{
  "spot_id": "A-01",
  "is_occupied": true,
  "confidence": 0.95,
  "zone": "A",
  "floor": "1F",
  "last_updated": "2024-11-29T10:30:00Z"
}
```

### 일괄 업데이트 (여러 주차 공간)

```python
data = [
    {"spot_id": "A-01", "is_occupied": True, "confidence": 0.95},
    {"spot_id": "A-02", "is_occupied": False, "confidence": 0.92},
    {"spot_id": "A-03", "is_occupied": True, "confidence": 0.88}
]

response = requests.post(url, json=data, headers=headers)
```

---

## 2. 입출차 이벤트 생성

### POST /parking_events

차량의 입차 또는 출차 이벤트를 생성합니다. (LPR 인식 결과)

**입차 이벤트:**
```python
url = "https://your-project.supabase.co/rest/v1/parking_events"

data = {
    "license_plate": "12가3456",
    "event_type": "entry",
    "gate_id": "GATE-01",
    "confidence": 0.97,
    "is_registered": True  # 차량 등록 여부
}

response = requests.post(url, json=data, headers=headers)
```

**출차 이벤트:**
```python
data = {
    "license_plate": "12가3456",
    "event_type": "exit",
    "gate_id": "GATE-01",
    "confidence": 0.95,
    "is_registered": True
}

response = requests.post(url, json=data, headers=headers)
```

---

## 3. 차량 정보 조회

### GET /vehicles

차량 번호판으로 등록된 차량 정보를 조회합니다.

```python
url = "https://your-project.supabase.co/rest/v1/vehicles"
params = {
    "license_plate": "eq.12가3456",
    "select": "*,customers(name,phone)"
}

response = requests.get(url, params=params, headers=headers)
vehicles = response.json()

if vehicles:
    print(f"등록 차량: {vehicles[0]['customers']['name']}")
else:
    print("미등록 차량")
```

---

## 4. 주차 세션 관리

### POST /parking_sessions (입차 시)

새로운 주차 세션을 생성합니다.

```python
url = "https://your-project.supabase.co/rest/v1/parking_sessions"

# 먼저 차량 정보 조회
vehicle = get_vehicle_by_plate("12가3456")

data = {
    "vehicle_id": vehicle['vehicle_id'],
    "customer_id": vehicle['customer_id'],
    "license_plate": "12가3456",
    "parking_spot_id": "A-01",
    "entry_time": "2024-11-29T10:30:00Z",
    "status": "parked"
}

response = requests.post(url, json=data, headers=headers)
session = response.json()
```

### PATCH /parking_sessions (출차 시)

주차 세션을 종료합니다.

```python
# 1. 활성 세션 조회
url = "https://your-project.supabase.co/rest/v1/parking_sessions"
params = {
    "license_plate": "eq.12가3456",
    "status": "eq.parked",
    "select": "*"
}

response = requests.get(url, params=params, headers=headers)
sessions = response.json()

if sessions:
    session_id = sessions[0]['session_id']

    # 2. 세션 업데이트
    update_url = f"{url}?session_id=eq.{session_id}"
    data = {
        "exit_time": "2024-11-29T12:30:00Z",
        "status": "exited"
    }

    response = requests.patch(update_url, json=data, headers=headers)
```

---

## 5. 주차 요금 계산

### RPC /calculate_parking_fee

주차 요금을 계산합니다.

```python
url = "https://your-project.supabase.co/rest/v1/rpc/calculate_parking_fee"

data = {
    "p_entry_time": "2024-11-29T10:30:00Z",
    "p_exit_time": "2024-11-29T12:30:00Z"
}

response = requests.post(url, json=data, headers=headers)
fee_info = response.json()[0]

print(f"기본 요금: {fee_info['base_fee']}")
print(f"추가 요금: {fee_info['additional_fee']}")
print(f"총 요금: {fee_info['total_fee']}")
print(f"주차 시간: {fee_info['duration_minutes']}분")
```

---

## 6. 통계 조회

### RPC /get_today_statistics

오늘의 통계를 조회합니다.

```python
url = "https://your-project.supabase.co/rest/v1/rpc/get_today_statistics"

response = requests.post(url, json={}, headers=headers)
stats = response.json()[0]

print(f"오늘 총 입차: {stats['total_entries']}")
print(f"오늘 총 출차: {stats['total_exits']}")
print(f"현재 주차 중: {stats['currently_parked']}")
print(f"오늘 총 매출: {stats['total_revenue']}")
print(f"점유율: {stats['occupied_spaces'] / stats['total_spaces'] * 100:.1f}%")
```

---

## 🤖 ROS2 노드 예제

### Python 예제 (rclpy)

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
import requests
from datetime import datetime

class SupabaseBridge(Node):
    def __init__(self):
        super().__init__('supabase_bridge')

        # Supabase 설정
        self.supabase_url = "https://your-project.supabase.co"
        self.supabase_key = "your-anon-key"
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }

        # ROS2 구독자 (예시)
        # self.create_subscription(ParkingOccupancy, '/parking/occupancy', self.parking_callback, 10)
        # self.create_subscription(LicensePlate, '/parking/license_plate', self.lpr_callback, 10)

    def update_parking_status(self, spot_id, is_occupied, confidence):
        """주차 공간 상태 업데이트"""
        url = f"{self.supabase_url}/rest/v1/parking_current_status"
        headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}

        data = {
            "spot_id": spot_id,
            "is_occupied": is_occupied,
            "confidence": confidence
        }

        try:
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            self.get_logger().info(f"Updated parking status: {spot_id}")
        except Exception as e:
            self.get_logger().error(f"Failed to update parking status: {e}")

    def create_entry_event(self, license_plate, gate_id, confidence):
        """입차 이벤트 생성"""
        url = f"{self.supabase_url}/rest/v1/parking_events"

        # 먼저 차량이 등록되어 있는지 확인
        is_registered = self.check_vehicle_registered(license_plate)

        data = {
            "license_plate": license_plate,
            "event_type": "entry",
            "gate_id": gate_id,
            "confidence": confidence,
            "is_registered": is_registered
        }

        try:
            response = requests.post(url, json=data, headers=headers)
            response.raise_for_status()
            self.get_logger().info(f"Entry event created: {license_plate}")

            # 등록 차량이면 주차 세션 생성
            if is_registered:
                self.create_parking_session(license_plate)

        except Exception as e:
            self.get_logger().error(f"Failed to create entry event: {e}")

    def check_vehicle_registered(self, license_plate):
        """차량 등록 여부 확인"""
        url = f"{self.supabase_url}/rest/v1/vehicles"
        params = {"license_plate": f"eq.{license_plate}"}

        try:
            response = requests.get(url, params=params, headers=self.headers)
            vehicles = response.json()
            return len(vehicles) > 0
        except:
            return False

    def create_parking_session(self, license_plate):
        """주차 세션 생성"""
        # 차량 정보 조회
        vehicle_url = f"{self.supabase_url}/rest/v1/vehicles"
        params = {
            "license_plate": f"eq.{license_plate}",
            "select": "vehicle_id,customer_id"
        }

        try:
            response = requests.get(vehicle_url, params=params, headers=self.headers)
            vehicles = response.json()

            if vehicles:
                vehicle = vehicles[0]

                # 세션 생성
                session_url = f"{self.supabase_url}/rest/v1/parking_sessions"
                data = {
                    "vehicle_id": vehicle['vehicle_id'],
                    "customer_id": vehicle['customer_id'],
                    "license_plate": license_plate,
                    "entry_time": datetime.utcnow().isoformat(),
                    "status": "parked"
                }

                response = requests.post(session_url, json=data, headers=self.headers)
                response.raise_for_status()
                self.get_logger().info(f"Parking session created: {license_plate}")

        except Exception as e:
            self.get_logger().error(f"Failed to create parking session: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = SupabaseBridge()
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

---

## 🔄 데이터 흐름

### 입차 프로세스

```
1. LPR 노드에서 번호판 인식
   ↓
2. Supabase Bridge: parking_events 생성 (entry)
   ↓
3. Supabase Bridge: 차량 등록 여부 확인
   ↓
4. 등록 차량인 경우: parking_sessions 생성
   ↓
5. 웹 대시보드에서 실시간 확인
```

### 출차 프로세스

```
1. LPR 노드에서 번호판 인식
   ↓
2. Supabase Bridge: parking_events 생성 (exit)
   ↓
3. Supabase Bridge: 활성 세션 조회
   ↓
4. 세션 종료 (exit_time 업데이트)
   ↓
5. 요금 계산 (calculate_parking_fee)
   ↓
6. parking_fees 생성
   ↓
7. 웹 대시보드에서 결제 처리
```

---

## 🚨 오류 처리

```python
try:
    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()
except requests.exceptions.HTTPError as e:
    if response.status_code == 409:
        print("데이터 충돌 (이미 존재)")
    elif response.status_code == 401:
        print("인증 실패")
    else:
        print(f"HTTP 오류: {e}")
except requests.exceptions.RequestException as e:
    print(f"네트워크 오류: {e}")
```

---

## 📝 참고 사항

1. **Prefer 헤더**: UPSERT 동작을 위해 `Prefer: resolution=merge-duplicates` 사용
2. **시간 형식**: ISO 8601 형식 사용 (`2024-11-29T10:30:00Z`)
3. **필터링**: `eq`, `gt`, `lt` 등의 연산자 사용
4. **Join**: `select=*,customers(*)` 형식으로 관계 데이터 조회
5. **Realtime**: 웹 대시보드는 자동으로 실시간 업데이트됨

---

## 🔗 추가 자료

- [Supabase REST API 문서](https://supabase.com/docs/guides/api)
- [PostgREST 문서](https://postgrest.org/)
- [ROS2 rclpy 문서](https://docs.ros2.org/latest/api/rclpy/)
