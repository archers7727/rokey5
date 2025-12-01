#!/usr/bin/env python3
"""
ROS2 패키지로 만들 때 사용할 예시 코드

실제 ROS2 환경에서 토픽을 발행하는 노드 예시
"""

import os
import time
from datetime import datetime
from typing import Dict, Any

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
# from your_msgs.msg import ExitCommand  # 커스텀 메시지 타입

from supabase import create_client, Client


class ParkingExitController(Node):
    """
    주차장 출차 컨트롤러 ROS2 노드

    기능:
    1. Supabase Realtime Subscribe로 출차 명령 수신
    2. ROS2 토픽으로 출차 명령 발행
    3. Single/Double 출차 타입 구분
    """

    def __init__(self):
        super().__init__('parking_exit_controller')

        # Supabase 클라이언트 설정
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key)

        # ROS2 Publisher 생성
        self.exit_publisher = self.create_publisher(
            String,  # 실제로는 ExitCommand 같은 커스텀 메시지 사용
            '/parking/exit_command',
            10
        )

        # Supabase Realtime Subscribe 설정
        self.setup_realtime_subscription()

        self.get_logger().info('🚀 Parking Exit Controller 시작')

    def setup_realtime_subscription(self):
        """Supabase Realtime Subscribe 설정"""
        channel = self.supabase.channel('ros2-exit-commands')

        channel.on_postgres_changes(
            event='INSERT',
            schema='public',
            table='ros2_commands',
            callback=self.handle_command
        ).subscribe()

        self.get_logger().info('✅ Realtime Subscribe 연결 완료')

    def handle_command(self, payload: Dict[str, Any]):
        """명령 처리 콜백"""
        try:
            if payload.get('eventType') != 'INSERT':
                return

            command = payload.get('new', {})
            if command.get('status') != 'pending':
                return

            command_type = command.get('command_type')
            command_id = command.get('command_id')

            self.get_logger().info(f'📨 새 명령: {command_type}')

            # 명령 타입에 따라 처리
            if command_type == 'EXIT_GATE_SINGLE':
                self.execute_exit(command, vehicle_count=1)
            elif command_type == 'EXIT_GATE_DOUBLE':
                self.execute_exit(command, vehicle_count=2)
            else:
                self.get_logger().warn(f'알 수 없는 명령: {command_type}')
                self.update_command_status(command_id, 'failed', 'Unknown command')

        except Exception as e:
            self.get_logger().error(f'명령 처리 오류: {e}')

    def execute_exit(self, command: Dict[str, Any], vehicle_count: int):
        """출차 명령 실행"""
        command_id = command['command_id']
        payload_data = command.get('payload', {})
        gate_id = payload_data.get('gate_id', 'EXIT-01')
        duration = payload_data.get('duration_seconds', 10)
        parking_spot = command.get('parking_spot_id', 'Unknown')

        try:
            # 1. 상태 업데이트
            self.update_command_status(command_id, 'processing')

            # 2. ROS2 토픽 발행
            self.publish_exit_command(gate_id, vehicle_count, duration, parking_spot)

            # 3. 완료 대기 (실제로는 피드백 구독)
            time.sleep(duration)

            # 4. 완료 처리
            self.update_command_status(command_id, 'completed')

            self.get_logger().info(f'✅ 출차 완료: {vehicle_count}대')

        except Exception as e:
            self.get_logger().error(f'출차 실패: {e}')
            self.update_command_status(command_id, 'failed', str(e))

    def publish_exit_command(self, gate_id: str, vehicle_count: int,
                            duration: int, parking_spot: str):
        """
        ROS2 토픽으로 출차 명령 발행

        실제 사용 시:
        - String 대신 커스텀 메시지 타입 사용
        - ExitCommand.msg 정의 필요
        """
        # 임시: String 메시지로 발행
        msg = String()
        msg.data = f"EXIT|{gate_id}|{vehicle_count}|{duration}|{parking_spot}"

        # 실제 커스텀 메시지 사용 예시:
        # msg = ExitCommand()
        # msg.gate_id = gate_id
        # msg.vehicle_count = vehicle_count
        # msg.duration_seconds = duration
        # msg.parking_spot_id = parking_spot
        # msg.timestamp = self.get_clock().now().to_msg()

        self.exit_publisher.publish(msg)

        self.get_logger().info(
            f'📡 토픽 발행: /parking/exit_command\n'
            f'   Gate: {gate_id}\n'
            f'   차량: {vehicle_count}대\n'
            f'   위치: {parking_spot}'
        )

    def update_command_status(self, command_id: str, status: str,
                             error_message: str = None):
        """명령 상태 업데이트"""
        update_data = {'status': status}

        if status == 'processing':
            update_data['executed_at'] = datetime.utcnow().isoformat()
        elif status in ['completed', 'failed']:
            update_data['completed_at'] = datetime.utcnow().isoformat()

        if error_message:
            update_data['error_message'] = error_message

        try:
            self.supabase.table('ros2_commands') \
                .update(update_data) \
                .eq('command_id', command_id) \
                .execute()
        except Exception as e:
            self.get_logger().error(f'상태 업데이트 실패: {e}')


def main(args=None):
    rclpy.init(args=args)
    node = ParkingExitController()

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
