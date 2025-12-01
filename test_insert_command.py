#!/usr/bin/env python3
"""
ros2_commands 테이블에 테스트 데이터 INSERT

Realtime Subscribe가 작동하는지 확인하기 위한 스크립트
"""

import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "your-supabase-url")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "your-anon-key")

if SUPABASE_URL == "your-supabase-url":
    print("❌ 환경 변수를 설정해주세요:")
    print("export SUPABASE_URL='https://your-project.supabase.co'")
    print("export SUPABASE_ANON_KEY='your-anon-key'")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🧪 테스트 명령 INSERT 중...")

# 테스트 데이터
test_data = {
    'command_type': 'EXIT_GATE_SINGLE',
    'license_plate': '99테9999',
    'parking_spot_id': 'TEST-01',
    'payload': {
        'gate_id': 'EXIT-01',
        'action': 'test',
        'test': True,
    },
    'status': 'pending',
}

try:
    result = supabase.table('ros2_commands').insert(test_data).execute()

    print("✅ INSERT 성공!")
    print(f"Command ID: {result.data[0]['command_id']}")
    print(f"Command Type: {result.data[0]['command_type']}")
    print(f"Status: {result.data[0]['status']}")
    print()
    print("💡 test_realtime_subscribe.py를 실행 중이라면")
    print("   콜백이 호출되어야 합니다!")

except Exception as e:
    print(f"❌ 오류 발생: {e}")
