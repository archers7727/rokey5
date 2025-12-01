import { supabase } from './supabase';
import type {
  ParkingSession,
  ParkingEvent,
  ParkingFee,
  ParkingCurrentStatus,
  EntryRequest,
  ExitRequest,
} from './types';

/**
 * 주차 서비스 - 비즈니스 로직 처리
 */
export class ParkingService {
  /**
   * 입차 처리
   */
  static async processEntry(request: EntryRequest) {
    const { license_plate, gate_id, is_registered = false, vehicle_id, customer_id } = request;

    try {
      // 1. 빈 주차 공간 찾기
      const { data: availableSpot, error: spotError } = await supabase
        .from('parking_current_status')
        .select('*')
        .eq('is_occupied', false)
        .limit(1)
        .single();

      if (spotError || !availableSpot) {
        return {
          success: false,
          error: 'No available parking spots',
        };
      }

      // 2. 입차 이벤트 생성
      const eventData: ParkingEvent = {
        vehicle_id: vehicle_id || null,
        license_plate,
        event_type: 'entry',
        gate_id,
        is_registered,
        confidence: 0.95,
      };

      const { error: eventError } = await supabase
        .from('parking_events')
        .insert(eventData);

      if (eventError) {
        console.error('Event creation error:', eventError);
        return {
          success: false,
          error: 'Failed to create parking event',
        };
      }

      // 3. 주차 세션 생성
      const sessionData: Partial<ParkingSession> = {
        vehicle_id: vehicle_id || null,
        customer_id: customer_id || null,
        license_plate,
        parking_spot_id: availableSpot.spot_id,
        entry_time: new Date().toISOString(),
        status: 'parked',
      };

      const { data: session, error: sessionError } = await supabase
        .from('parking_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (sessionError || !session) {
        console.error('Session creation error:', sessionError);
        return {
          success: false,
          error: 'Failed to create parking session',
        };
      }

      // 4. 주차 공간 점유 상태 업데이트
      const { error: statusError } = await supabase
        .from('parking_current_status')
        .update({ is_occupied: true })
        .eq('spot_id', availableSpot.spot_id);

      if (statusError) {
        console.error('Status update error:', statusError);
        // 롤백은 하지 않고 계속 진행 (수동으로 나중에 수정 가능)
      }

      return {
        success: true,
        data: {
          session,
          parking_spot: availableSpot.spot_id,
        },
        message: 'Vehicle entry processed successfully',
      };
    } catch (error) {
      console.error('Entry processing error:', error);
      return {
        success: false,
        error: 'Internal server error during entry processing',
      };
    }
  }

  /**
   * 출차 처리
   */
  static async processExit(request: ExitRequest) {
    const { session_id, gate_id = 'CUSTOMER-APP' } = request;

    try {
      // 1. 세션 조회
      const { data: session, error: sessionError } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('session_id', session_id)
        .single();

      if (sessionError || !session) {
        return {
          success: false,
          error: 'Parking session not found',
        };
      }

      if (session.status === 'exited') {
        return {
          success: false,
          error: 'Vehicle already exited',
        };
      }

      const exitTime = new Date().toISOString();

      // 2. 출차 이벤트 생성
      const exitEvent: ParkingEvent = {
        license_plate: session.license_plate,
        event_type: 'exit',
        gate_id,
        is_registered: true,
      };

      const { error: eventError } = await supabase
        .from('parking_events')
        .insert(exitEvent);

      if (eventError) {
        console.error('Exit event error:', eventError);
      }

      // 3. 세션 종료
      const { error: updateError } = await supabase
        .from('parking_sessions')
        .update({
          exit_time: exitTime,
          status: 'exited',
        })
        .eq('session_id', session_id);

      if (updateError) {
        console.error('Session update error:', updateError);
        return {
          success: false,
          error: 'Failed to update parking session',
        };
      }

      // 4. 요금 계산
      const { data: feeData, error: feeError } = await supabase.rpc('calculate_parking_fee', {
        p_entry_time: session.entry_time,
        p_exit_time: exitTime,
      });

      let fee = { base_fee: 0, additional_fee: 0, total_fee: 0 };
      if (!feeError && feeData && feeData[0]) {
        fee = feeData[0];

        // 5. 요금 기록
        const feeRecord: Partial<ParkingFee> = {
          session_id,
          base_fee: fee.base_fee,
          additional_fee: fee.additional_fee,
          total_fee: fee.total_fee,
          payment_status: 'unpaid',
        };

        const { error: feeRecordError } = await supabase
          .from('parking_fees')
          .insert(feeRecord);

        if (feeRecordError) {
          console.error('Fee record error:', feeRecordError);
        }
      }

      // 6. 주차 공간 비우기
      if (session.parking_spot_id) {
        const { error: spotError } = await supabase
          .from('parking_current_status')
          .update({ is_occupied: false })
          .eq('spot_id', session.parking_spot_id);

        if (spotError) {
          console.error('Parking spot update error:', spotError);
        }
      }

      // 7. ROS2 명령 전송 (출구 게이트 열기)
      const { error: commandError } = await supabase
        .from('ros2_commands')
        .insert({
          command_type: 'EXIT_GATE_OPEN',
          session_id,
          license_plate: session.license_plate,
          parking_spot_id: session.parking_spot_id,
          payload: {
            gate_id: 'EXIT-01',
            action: 'open_gate',
            duration_seconds: 10,
            total_fee: fee.total_fee,
          },
          status: 'pending',
        });

      if (commandError) {
        console.error('ROS2 command error:', commandError);
        // 명령 전송 실패해도 출차는 성공으로 처리
      }

      return {
        success: true,
        data: {
          session_id,
          exit_time: exitTime,
          fee,
        },
        message: 'Vehicle exit processed successfully',
      };
    } catch (error) {
      console.error('Exit processing error:', error);
      return {
        success: false,
        error: 'Internal server error during exit processing',
      };
    }
  }

  /**
   * 고객 세션 조회
   */
  static async getCustomerSession(customer_id: string) {
    try {
      const { data, error } = await supabase
        .from('parking_sessions')
        .select(`
          *,
          vehicles (*)
        `)
        .eq('customer_id', customer_id)
        .eq('status', 'parked')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return {
            success: true,
            data: null,
            message: 'No active parking session',
          };
        }
        return {
          success: false,
          error: 'Failed to fetch customer session',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get customer session error:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * 주차 현황 조회
   */
  static async getParkingStatus() {
    try {
      const { data, error } = await supabase
        .from('parking_current_status')
        .select('*')
        .order('spot_id');

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch parking status',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Get parking status error:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }
}
