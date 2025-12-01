#!/usr/bin/env python3
"""
ROS2 명령 테스트 스크립트
출차 명령을 DB에 직접 삽입해서 테스트
"""

import os
from supabase import create_client
from datetime import datetime

SUPABASE_URL = os.getenv("SUPABASE_URL", "your-supabase-url")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def test_exit_command():
    """출차 명령 테스트"""
    print("🧪 출차 명령 테스트")
    print("=" * 50)

    # 명령 데이터
    command_data = {
        'command_type': 'EXIT_GATE_OPEN',
        'license_plate': '12가3456',
        'parking_spot_id': 'A-01',
        'payload': {
            'gate_id': 'EXIT-01',
            'action': 'open_gate',
            'duration_seconds': 5,  # 테스트용 5초
            'total_fee': 4000,
        },
        'status': 'pending',
    }

    try:
        # 명령 삽입
        result = supabase.table('ros2_commands').insert(command_data).execute()

        print("✅ 명령 삽입 성공!")
        print(f"Command ID: {result.data[0]['command_id']}")
        print(f"Status: {result.data[0]['status']}")
        print("\n💡 ros2_exit_controller.py가 실행 중이라면")
        print("   5초 후에 게이트가 열리고 닫힙니다.")
        print("=" * 50)

        return result.data[0]['command_id']

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None


def check_command_status(command_id: str):
    """명령 상태 확인"""
    try:
        result = supabase.table('ros2_commands') \
            .select('*') \
            .eq('command_id', command_id) \
            .single() \
            .execute()

        command = result.data
        print(f"\n📊 명령 상태 확인")
        print(f"   Command ID: {command_id}")
        print(f"   Status: {command['status']}")
        print(f"   Created: {command['created_at']}")
        if command.get('executed_at'):
            print(f"   Executed: {command['executed_at']}")
        if command.get('completed_at'):
            print(f"   Completed: {command['completed_at']}")
        if command.get('error_message'):
            print(f"   Error: {command['error_message']}")

    except Exception as e:
        print(f"❌ 상태 확인 실패: {e}")


def main():
    if SUPABASE_URL == "your-supabase-url":
        print("⚠️  환경 변수를 설정해주세요:")
        print("export SUPABASE_URL='https://your-project.supabase.co'")
        print("export SUPABASE_ANON_KEY='your-anon-key'")
        return

    # 1. 명령 전송
    command_id = test_exit_command()

    if command_id:
        import time
        print("\n⏳ 7초 후 상태 확인...")
        time.sleep(7)

        # 2. 상태 확인
        check_command_status(command_id)


if __name__ == "__main__":
    main()
