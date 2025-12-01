-- =====================================================
-- ROS2 명령 테이블
-- =====================================================

CREATE TABLE ros2_commands (
    command_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_type VARCHAR(50) NOT NULL,  -- 'EXIT_GATE_OPEN', 'PARKING_GUIDE' 등
    session_id UUID REFERENCES parking_sessions(session_id) ON DELETE SET NULL,
    license_plate VARCHAR(20),
    parking_spot_id VARCHAR(20),
    payload JSONB,  -- 추가 데이터
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ros2_commands_status ON ros2_commands(status);
CREATE INDEX idx_ros2_commands_created ON ros2_commands(created_at DESC);
CREATE INDEX idx_ros2_commands_type ON ros2_commands(command_type);

COMMENT ON TABLE ros2_commands IS 'ROS2로 전송할 명령 큐';
COMMENT ON COLUMN ros2_commands.status IS 'pending: 대기, processing: 처리중, completed: 완료, failed: 실패';
