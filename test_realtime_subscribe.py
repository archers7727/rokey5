#!/usr/bin/env python3
"""
Supabase Realtime Subscribe 테스트 스크립트

ros2_commands 테이블에 INSERT가 발생하면 콜백이 호출되는지 확인
"""

import os
import time
from supabase import create_client, Client

# 환경 변수
SUPABASE_URL = os.getenv("SUPABASE_URL", "your-supabase-url")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")

print("=" * 60)
print("🧪 Supabase Realtime Subscribe 테스트")
print("=" * 60)
print(f"Supabase URL: {SUPABASE_URL}")
print()

if SUPABASE_URL == "your-supabase-url":
    print("❌ 환경 변수를 설정해주세요:")
    print("export SUPABASE_URL='https://your-project.supabase.co'")
    print("export SUPABASE_ANON_KEY='your-anon-key'")
    exit(1)

# Supabase 클라이언트 생성
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 콜백 호출 횟수
callback_count = 0


def test_callback(payload):
    """테스트 콜백 함수"""
    global callback_count
    callback_count += 1

    print(f"\n🎉 콜백 호출됨! (#{callback_count})")
    print("=" * 60)

    event_type = payload.get('eventType')
    print(f"이벤트 타입: {event_type}")

    if event_type == 'INSERT':
        new_record = payload.get('new', {})
        print(f"새 레코드:")
        print(f"  - command_id: {new_record.get('command_id')}")
        print(f"  - command_type: {new_record.get('command_type')}")
        print(f"  - license_plate: {new_record.get('license_plate')}")
        print(f"  - status: {new_record.get('status')}")
        print(f"  - created_at: {new_record.get('created_at')}")

    print("=" * 60)


def main():
    print("📡 Realtime Subscribe 설정 중...")

    # Channel 생성 및 Subscribe
    channel = supabase.channel('test-ros2-commands')

    channel.on_postgres_changes(
        event='INSERT',
        schema='public',
        table='ros2_commands',
        callback=test_callback
    ).subscribe()

    print("✅ Subscribe 완료!")
    print()
    print("💡 이제 다른 터미널에서 테스트 데이터를 INSERT 해보세요:")
    print()
    print("방법 1: 웹에서 출차 버튼 클릭")
    print("방법 2: test_insert_command.py 실행")
    print("방법 3: Supabase Dashboard에서 직접 INSERT")
    print()
    print("⏳ 대기 중... (Ctrl+C로 종료)")
    print()

    # 무한 대기
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n👋 프로그램 종료")
        print(f"총 콜백 호출 횟수: {callback_count}")
        channel.unsubscribe()


if __name__ == "__main__":
    main()
