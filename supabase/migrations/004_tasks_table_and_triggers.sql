-- =====================================================
-- Task 관리 및 주차 위치 자동 업데이트
-- =====================================================

-- =====================================================
-- 1. Tasks 테이블 생성 (존재하지 않는 경우)
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('ENTER', 'EXIT', 'MOVE', 'PARK')),
  vehicle_plate VARCHAR(20),
  vehicle_type VARCHAR(50),
  blocking_vehicle VARCHAR(20),

  -- 로봇 할당
  assigned_robot VARCHAR(50),
  helper_robot VARCHAR(50),

  -- 위치 정보
  start_location VARCHAR(20),
  target_location VARCHAR(20),
  blocking_location VARCHAR(20),
  temp_location VARCHAR(20),

  -- 상태 관리
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  done BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle ON tasks(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_robot ON tasks(assigned_robot);

COMMENT ON TABLE tasks IS 'ROS2 로봇 작업 관리';

-- =====================================================
-- 2. 로봇 상태 테이블 생성 (배터리 모니터링용)
-- =====================================================

CREATE TABLE IF NOT EXISTS robots (
  robot_id VARCHAR(50) PRIMARY KEY,
  robot_name VARCHAR(100),
  robot_type VARCHAR(50),

  -- 상태 정보
  status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'charging', 'error', 'offline')),
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),

  -- 위치 정보
  current_location VARCHAR(20),
  current_x FLOAT8,
  current_y FLOAT8,
  current_orientation FLOAT8,

  -- 타임스탬프
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_robots_status ON robots(status);
CREATE INDEX IF NOT EXISTS idx_robots_battery ON robots(battery_level);

COMMENT ON TABLE robots IS '로봇 상태 및 배터리 모니터링';

-- =====================================================
-- 3. 알림 테이블 생성
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('battery_low', 'task_failed', 'robot_error', 'parking_full', 'system')),
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),

  -- 내용
  title VARCHAR(200) NOT NULL,
  message TEXT,

  -- 관련 엔티티
  related_task_id UUID REFERENCES tasks(task_id) ON DELETE SET NULL,
  related_robot_id VARCHAR(50) REFERENCES robots(robot_id) ON DELETE SET NULL,

  -- 상태
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS '시스템 알림 관리';

-- =====================================================
-- 4. Task 완료 시 parking_locations 자동 업데이트 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION update_parking_on_task_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Task가 completed 상태로 변경되었을 때만 실행
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- ENTER 또는 PARK: target_location을 점유 상태로 변경
    IF NEW.task_type IN ('ENTER', 'PARK') AND NEW.target_location IS NOT NULL THEN
      UPDATE parking_locations
      SET
        is_occupied = true,
        last_updated = NOW()
      WHERE location_id = NEW.target_location
        AND location_type = 'parking';

      RAISE NOTICE 'Task % completed: Set % to occupied', NEW.task_id, NEW.target_location;
    END IF;

    -- EXIT: start_location을 비어있는 상태로 변경
    IF NEW.task_type = 'EXIT' AND NEW.start_location IS NOT NULL THEN
      UPDATE parking_locations
      SET
        is_occupied = false,
        last_updated = NOW()
      WHERE location_id = NEW.start_location
        AND location_type = 'parking';

      RAISE NOTICE 'Task % completed: Set % to available', NEW.task_id, NEW.start_location;
    END IF;

    -- MOVE: start는 비우고, target은 점유
    IF NEW.task_type = 'MOVE' THEN
      IF NEW.start_location IS NOT NULL THEN
        UPDATE parking_locations
        SET is_occupied = false, last_updated = NOW()
        WHERE location_id = NEW.start_location AND location_type = 'parking';
      END IF;

      IF NEW.target_location IS NOT NULL THEN
        UPDATE parking_locations
        SET is_occupied = true, last_updated = NOW()
        WHERE location_id = NEW.target_location AND location_type = 'parking';
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_parking_on_task_complete
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_parking_on_task_complete();

COMMENT ON FUNCTION update_parking_on_task_complete IS 'Task 완료 시 parking_locations 자동 업데이트';

-- =====================================================
-- 5. Task 실패 시 알림 생성 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION create_notification_on_task_failed()
RETURNS TRIGGER AS $$
BEGIN
  -- Task가 failed 상태로 변경되었을 때 알림 생성
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    INSERT INTO notifications (
      notification_type,
      severity,
      title,
      message,
      related_task_id,
      related_robot_id
    ) VALUES (
      'task_failed',
      'error',
      '주차 작업 실패',
      format('차량 %s의 %s 작업이 실패했습니다. (Task ID: %s)',
             COALESCE(NEW.vehicle_plate, '익명'),
             NEW.task_type,
             NEW.task_id),
      NEW.task_id,
      NEW.assigned_robot
    );

    RAISE NOTICE 'Created notification for failed task %', NEW.task_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notification_on_task_failed
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_task_failed();

COMMENT ON FUNCTION create_notification_on_task_failed IS 'Task 실패 시 알림 자동 생성';

-- =====================================================
-- 6. 로봇 배터리 부족 알림 트리거
-- =====================================================

CREATE OR REPLACE FUNCTION create_notification_on_low_battery()
RETURNS TRIGGER AS $$
BEGIN
  -- 배터리가 30% 미만으로 떨어졌을 때 알림 생성 (중복 방지)
  IF NEW.battery_level < 30 AND (OLD.battery_level IS NULL OR OLD.battery_level >= 30) THEN
    INSERT INTO notifications (
      notification_type,
      severity,
      title,
      message,
      related_robot_id
    ) VALUES (
      'battery_low',
      'warning',
      '로봇 배터리 부족',
      format('로봇 %s의 배터리가 %s%%로 낮습니다. 충전이 필요합니다.',
             NEW.robot_name,
             NEW.battery_level),
      NEW.robot_id
    );

    RAISE NOTICE 'Created low battery notification for robot %', NEW.robot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_notification_on_low_battery
  AFTER INSERT OR UPDATE ON robots
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_low_battery();

COMMENT ON FUNCTION create_notification_on_low_battery IS '로봇 배터리 30% 미만 시 알림 생성';

-- =====================================================
-- 7. 로봇 샘플 데이터 삽입 (테스트용)
-- =====================================================

INSERT INTO robots (robot_id, robot_name, robot_type, status, battery_level, current_x, current_y, current_orientation)
VALUES
  ('robot_01', '파커봇-01', 'parking_robot', 'idle', 85, 0.0, 0.0, 0.0),
  ('robot_02', '파커봇-02', 'parking_robot', 'idle', 72, 0.0, 0.0, 0.0)
ON CONFLICT (robot_id) DO UPDATE
  SET
    robot_name = EXCLUDED.robot_name,
    robot_type = EXCLUDED.robot_type,
    status = EXCLUDED.status,
    battery_level = EXCLUDED.battery_level;

-- =====================================================
-- 완료
-- =====================================================

COMMENT ON SCHEMA public IS 'ROS2 기반 스마트 주차장 시스템 - Task 및 알림 시스템 추가';
