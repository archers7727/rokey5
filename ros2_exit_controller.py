#!/usr/bin/env python3
"""
ROS2 출차 컨트롤러 - Supabase Realtime Subscribe 방식
출차 명령을 실시간으로 받아서 처리하는 예시 코드
"""

import os
import time
from datetime import datetime
from supabase import create_client, Client
from typing import Dict, Any

# Supabase 클라이언트 설정
SUPABASE_URL = os.getenv("SUPABASE_URL", "your-supabase-url")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-supabase-key")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class ExitController:
    """출차 게이트 컨트롤러"""

    def __init__(self):
        self.gate_status = False  # False: 닫힘, True: 열림
        print("🚀 Exit Controller 초기화 완료")

    def handle_command(self, payload: Dict[str, Any]):
        """
        Realtime Subscribe로부터 받은 명령 처리

        ⚠️ 중요: Polling이 아닌 Subscribe 방식!
        - DB를 계속 조회하지 않음
        - 명령이 INSERT될 때만 이 함수가 호출됨
        """
        try:
            # payload 구조: {'eventType': 'INSERT', 'new': {...}, 'old': {}, ...}
            if payload.get('eventType') != 'INSERT':
                return

            command = payload.get('new', {})

            # pending 상태인 명령만 처리
            if command.get('status') != 'pending':
                return

            command_id = command.get('command_id')
            command_type = command.get('command_type')

            print(f"\n📨 새 명령 수신: {command_type} (ID: {command_id})")
            print(f"   차량번호: {command.get('license_plate')}")
            print(f"   주차위치: {command.get('parking_spot_id')}")

            # 명령 타입에 따라 처리
            if command_type == 'EXIT_GATE_OPEN':
                self.execute_exit_gate_open(command)
            elif command_type == 'PARKING_GUIDE':
                self.execute_parking_guide(command)
            else:
                print(f"⚠️  알 수 없는 명령 타입: {command_type}")
                self.update_command_status(command_id, 'failed', f"Unknown command type: {command_type}")

        except Exception as e:
            print(f"❌ 명령 처리 중 오류: {e}")
            if command_id:
                self.update_command_status(command_id, 'failed', str(e))

    def execute_exit_gate_open(self, command: Dict[str, Any]):
        """출구 게이트 열기 실행"""
        command_id = command['command_id']
        payload_data = command.get('payload', {})
        gate_id = payload_data.get('gate_id', 'EXIT-01')
        duration = payload_data.get('duration_seconds', 10)

        try:
            # 1. 상태 업데이트: processing
            print(f"⏳ 처리 시작...")
            self.update_command_status(command_id, 'processing')

            # 2. 실제 게이트 제어 로직 (여기서는 시뮬레이션)
            print(f"🔓 {gate_id} 게이트 열기")
            self.gate_status = True

            # ROS2 토픽 발행 예시 (실제 사용 시 주석 해제)
            # self.publish_gate_command(gate_id, 'open', duration)

            # 시뮬레이션: duration만큼 대기
            print(f"⏱️  {duration}초 동안 게이트 열림...")
            time.sleep(duration)

            # 게이트 닫기
            print(f"🔒 {gate_id} 게이트 닫기")
            self.gate_status = False

            # 3. 상태 업데이트: completed
            print(f"✅ 명령 완료!")
            self.update_command_status(command_id, 'completed')

            # 출차 완료 메시지 출력
            self.display_exit_complete_message(command)

        except Exception as e:
            print(f"❌ 게이트 제어 실패: {e}")
            self.update_command_status(command_id, 'failed', str(e))

    def execute_parking_guide(self, command: Dict[str, Any]):
        """주차 안내 로봇 제어 (예시)"""
        command_id = command['command_id']
        payload_data = command.get('payload', {})
        target_spot = payload_data.get('target_spot')

        try:
            print(f"🚗 {target_spot}로 주차 안내 시작")
            self.update_command_status(command_id, 'processing')

            # 주차 안내 로직...
            time.sleep(3)  # 시뮬레이션

            print(f"✅ 주차 안내 완료")
            self.update_command_status(command_id, 'completed')

        except Exception as e:
            print(f"❌ 주차 안내 실패: {e}")
            self.update_command_status(command_id, 'failed', str(e))

    def update_command_status(self, command_id: str, status: str, error_message: str = None):
        """명령 상태 업데이트 (DB에 기록)"""
        update_data = {
            'status': status,
        }

        if status == 'processing':
            update_data['executed_at'] = datetime.utcnow().isoformat()
        elif status in ['completed', 'failed']:
            update_data['completed_at'] = datetime.utcnow().isoformat()

        if error_message:
            update_data['error_message'] = error_message

        try:
            supabase.table('ros2_commands') \
                .update(update_data) \
                .eq('command_id', command_id) \
                .execute()

            print(f"   상태 업데이트: {status}")

        except Exception as e:
            print(f"⚠️  상태 업데이트 실패: {e}")

    def display_exit_complete_message(self, command: Dict[str, Any]):
        """출차 완료 메시지 출력"""
        license_plate = command.get('license_plate', 'Unknown')
        payload_data = command.get('payload', {})
        total_fee = payload_data.get('total_fee', 0)

        print("\n" + "="*50)
        print("🎉 출차 완료!")
        print("="*50)
        print(f"차량번호: {license_plate}")
        print(f"주차 요금: ₩{total_fee:,}")
        print(f"안녕히 가세요!")
        print("="*50 + "\n")


def main():
    """메인 함수"""
    print("="*50)
    print("🤖 ROS2 출차 컨트롤러 시작")
    print("="*50)
    print(f"Supabase URL: {SUPABASE_URL}")
    print("Realtime Subscribe 방식으로 명령 대기 중...")
    print("⚠️  DB를 계속 조회하지 않습니다! (WebSocket으로 푸시 받음)")
    print("="*50 + "\n")

    controller = ExitController()

    # Realtime Subscribe 설정
    # ✅ 이 방식은 Polling이 아님! WebSocket으로 실시간 푸시받음
    channel = supabase.channel('ros2-commands-channel')

    # INSERT 이벤트만 구독
    channel.on_postgres_changes(
        event='INSERT',
        schema='public',
        table='ros2_commands',
        callback=controller.handle_command
    ).subscribe()

    print("✅ Realtime Subscribe 연결 완료!")
    print("💡 출차 버튼을 누르면 즉시 반응합니다...\n")

    # 프로그램 계속 실행
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 프로그램 종료")
        channel.unsubscribe()


if __name__ == "__main__":
    # 환경 변수 체크
    if SUPABASE_URL == "your-supabase-url":
        print("⚠️  환경 변수를 설정해주세요:")
        print("export SUPABASE_URL='https://your-project.supabase.co'")
        print("export SUPABASE_ANON_KEY='your-anon-key'")
        exit(1)

    main()
