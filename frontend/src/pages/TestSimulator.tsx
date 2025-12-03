import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  DirectionsCar,
  LocalParking,
  RestartAlt,
} from '@mui/icons-material';
import { supabase } from '../services/supabase';

interface Customer {
  customer_id: string;
  name: string;
  phone: string;
}

interface Vehicle {
  vehicle_id: string;
  customer_id: string;
  license_plate: string;
}

interface ParkingLocation {
  location_id: string;
  location_type: string;
  zone: string;
  floor: string;
  is_occupied: boolean;
}

interface ParkingSession {
  session_id: string;
  customer_id: string;
  license_plate: string;
  parking_spot_id: string;
  entry_time: string;
  status: string;
  customers?: Customer;
}

interface ROS2Command {
  command_id: string;
  command_type: string;
  license_plate: string;
  parking_spot_id: string;
  status: string;
  created_at: string;
}

export default function TestSimulator() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);
  const [ros2Commands, setRos2Commands] = useState<ROS2Command[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 고객 조회
    const { data: customersData } = await supabase
      .from('customers')
      .select('*')
      .order('name');

    // 차량 조회
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*');

    // 주차 위치 조회 (parking 타입만)
    const { data: locationsData } = await supabase
      .from('parking_locations')
      .select('*')
      .eq('location_type', 'parking')
      .order('location_id');

    // 현재 주차 세션 조회
    const { data: sessionsData } = await supabase
      .from('parking_sessions')
      .select('*, customers(name)')
      .eq('status', 'parked')
      .order('entry_time', { ascending: false });

    // ROS2 명령 조회
    const { data: commandsData } = await supabase
      .from('ros2_commands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    setCustomers(customersData || []);
    setVehicles(vehiclesData || []);
    setParkingLocations(locationsData || []);
    setParkingSessions(sessionsData || []);
    setRos2Commands(commandsData || []);
  };

  const handleParking = async () => {
    if (!selectedCustomer || !selectedLocation) {
      setMessage({ type: 'error', text: '고객과 주차 위치를 선택하세요' });
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      // 선택한 고객의 차량 찾기
      const vehicle = vehicles.find(v => v.customer_id === selectedCustomer);
      if (!vehicle) {
        throw new Error('차량 정보를 찾을 수 없습니다');
      }

      // 1. 입차 이벤트 생성
      const { error: eventError } = await supabase.from('parking_events').insert({
        vehicle_id: vehicle.vehicle_id,
        license_plate: vehicle.license_plate,
        event_type: 'entry',
        gate_id: 'TEST-SIMULATOR',
        is_registered: true,
      });

      if (eventError) {
        console.error('Event insert error:', eventError);
        throw new Error(`입차 이벤트 생성 실패: ${eventError.message}`);
      }

      // 2. 주차 세션 생성
      const { error: sessionError } = await supabase.from('parking_sessions').insert({
        vehicle_id: vehicle.vehicle_id,
        customer_id: selectedCustomer,
        license_plate: vehicle.license_plate,
        parking_spot_id: selectedLocation,
        entry_time: new Date().toISOString(),
        status: 'parked',
      });

      if (sessionError) {
        console.error('Session insert error:', sessionError);
        throw new Error(`주차 세션 생성 실패: ${sessionError.message}`);
      }

      // 3. 주차 위치 점유 상태 업데이트
      const { error: updateError } = await supabase
        .from('parking_locations')
        .update({
          is_occupied: true,
          last_updated: new Date().toISOString(),
        })
        .eq('location_id', selectedLocation);

      if (updateError) {
        console.error('Location update error:', updateError);
        throw new Error(`주차 위치 업데이트 실패: ${updateError.message}`);
      }

      setMessage({ type: 'success', text: '✅ 입차 완료!' });
      setSelectedCustomer('');
      setSelectedLocation('');

      // 데이터 새로고침
      setTimeout(() => fetchData(), 500);
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ 오류: ${error.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleExit = async (session: ParkingSession) => {
    setProcessing(true);
    setMessage(null);

    try {
      const exitTime = new Date().toISOString();

      // 1. 출차 이벤트 생성
      await supabase.from('parking_events').insert({
        license_plate: session.license_plate,
        event_type: 'exit',
        gate_id: 'TEST-SIMULATOR',
        is_registered: true,
      });

      // 2. 세션 종료
      await supabase
        .from('parking_sessions')
        .update({
          exit_time: exitTime,
          status: 'exited',
        })
        .eq('session_id', session.session_id);

      // 3. 요금 계산
      const { data: feeData } = await supabase.rpc('calculate_parking_fee', {
        p_entry_time: session.entry_time,
        p_exit_time: exitTime,
      });

      if (feeData && feeData[0]) {
        await supabase.from('parking_fees').insert({
          session_id: session.session_id,
          base_fee: feeData[0].base_fee,
          additional_fee: feeData[0].additional_fee,
          total_fee: feeData[0].total_fee,
          payment_status: 'unpaid',
        });
      }

      // 4. 주차 위치 비우기
      await supabase
        .from('parking_locations')
        .update({
          is_occupied: false,
          last_updated: new Date().toISOString(),
        })
        .eq('location_id', session.parking_spot_id);

      // 5. 출차 타입 결정
      const isFirstSpot = /^[A-Z]_\d+_1$/.test(session.parking_spot_id);
      let exitCommandType = 'EXIT_GATE_SINGLE';

      if (isFirstSpot) {
        const preparationSpotId = session.parking_spot_id.replace(/_1$/, '');
        const { data: prepSpot } = await supabase
          .from('parking_locations')
          .select('is_occupied')
          .eq('location_id', preparationSpotId)
          .eq('location_type', 'preparation')
          .single();

        if (prepSpot && prepSpot.is_occupied) {
          exitCommandType = 'EXIT_GATE_DOUBLE';
        }
      }

      // 6. ROS2 명령 전송
      await supabase.from('ros2_commands').insert({
        command_type: exitCommandType,
        session_id: session.session_id,
        license_plate: session.license_plate,
        parking_spot_id: session.parking_spot_id,
        payload: {
          gate_id: 'EXIT-01',
          action: 'open_gate',
          exit_type: exitCommandType === 'EXIT_GATE_DOUBLE' ? 'double' : 'single',
          duration_seconds: exitCommandType === 'EXIT_GATE_DOUBLE' ? 20 : 10,
        },
        status: 'pending',
      });

      setMessage({ type: 'success', text: `✅ 출차 완료! (${exitCommandType})` });

      // 데이터 새로고침
      setTimeout(() => fetchData(), 500);
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ 오류: ${error.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = async (session: ParkingSession) => {
    if (!window.confirm('정말 초기화하시겠습니까?\n(출차 → 다시 입차 상태로)')) {
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      // 1. 해당 세션의 ros2_commands 삭제
      await supabase
        .from('ros2_commands')
        .delete()
        .eq('session_id', session.session_id);

      // 2. 세션 상태를 다시 'parked'로
      await supabase
        .from('parking_sessions')
        .update({
          exit_time: null,
          status: 'parked',
        })
        .eq('session_id', session.session_id);

      // 3. parking_fees 삭제
      await supabase
        .from('parking_fees')
        .delete()
        .eq('session_id', session.session_id);

      // 4. 주차 위치 다시 점유로
      await supabase
        .from('parking_locations')
        .update({
          is_occupied: true,
          last_updated: new Date().toISOString(),
        })
        .eq('location_id', session.parking_spot_id);

      // 5. 출차 이벤트 삭제 (가장 최근 것)
      const { data: exitEvents } = await supabase
        .from('parking_events')
        .select('event_id')
        .eq('license_plate', session.license_plate)
        .eq('event_type', 'exit')
        .order('event_time', { ascending: false })
        .limit(1);

      if (exitEvents && exitEvents.length > 0) {
        await supabase
          .from('parking_events')
          .delete()
          .eq('event_id', exitEvents[0].event_id);
      }

      setMessage({ type: 'success', text: '🔄 초기화 완료! 다시 입차 상태로 되돌렸습니다.' });

      // 데이터 새로고침
      setTimeout(() => fetchData(), 500);
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ 오류: ${error.message}` });
    } finally {
      setProcessing(false);
    }
  };

  const handleFullReset = async () => {
    if (!window.confirm('전체 리셋하시겠습니까?\n모든 주차 데이터를 초기화하고 A_1_1, A_1_2, C_1_1에 20시간 주차된 테스트 데이터를 생성합니다.')) {
      return;
    }

    setProcessing(true);
    setMessage(null);

    try {
      // 1. 모든 주차 세션 삭제 (exited 포함)
      await supabase.from('parking_sessions').delete().neq('session_id', '00000000-0000-0000-0000-000000000000');

      // 2. 모든 주차 위치 비우기
      await supabase
        .from('parking_locations')
        .update({ is_occupied: false, last_updated: new Date().toISOString() })
        .eq('location_type', 'parking');

      // 3. 모든 ROS2 명령 삭제
      await supabase.from('ros2_commands').delete().neq('command_id', '00000000-0000-0000-0000-000000000000');

      // 4. 모든 주차 요금 삭제
      await supabase.from('parking_fees').delete().neq('fee_id', '00000000-0000-0000-0000-000000000000');

      // 5. 테스트 데이터 생성 - 20시간 전 입차
      const twentyHoursAgo = new Date();
      twentyHoursAgo.setHours(twentyHoursAgo.getHours() - 20);
      const entryTime = twentyHoursAgo.toISOString();

      // 고객 1, 2, 3의 차량 정보 가져오기
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('*')
        .in('customer_id', ['customer1', 'customer2', 'customer3'])
        .order('customer_id');

      if (!vehiclesData || vehiclesData.length < 3) {
        throw new Error('고객 1, 2, 3의 차량 정보를 찾을 수 없습니다');
      }

      const testLocations = ['A_1_1', 'A_1_2', 'C_1_1'];

      // 6. 3개 테스트 세션 생성
      for (let i = 0; i < 3; i++) {
        const vehicle = vehiclesData[i];
        const location = testLocations[i];

        // 입차 이벤트
        await supabase.from('parking_events').insert({
          vehicle_id: vehicle.vehicle_id,
          license_plate: vehicle.license_plate,
          event_type: 'entry',
          gate_id: 'TEST-RESET',
          is_registered: true,
        });

        // 주차 세션
        await supabase.from('parking_sessions').insert({
          vehicle_id: vehicle.vehicle_id,
          customer_id: vehicle.customer_id,
          license_plate: vehicle.license_plate,
          parking_spot_id: location,
          entry_time: entryTime,
          status: 'parked',
        });

        // 주차 위치 점유
        await supabase
          .from('parking_locations')
          .update({ is_occupied: true, last_updated: new Date().toISOString() })
          .eq('location_id', location);
      }

      setMessage({
        type: 'success',
        text: '🔄 전체 리셋 완료! A_1_1, A_1_2, C_1_1에 20시간 주차 상태로 초기화되었습니다.'
      });

      // 데이터 새로고침
      setTimeout(() => fetchData(), 500);
    } catch (error: any) {
      setMessage({ type: 'error', text: `❌ 오류: ${error.message}` });
      console.error('Full reset error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const availableLocations = parkingLocations.filter(loc => !loc.is_occupied);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">
          🧪 테스트 시뮬레이터
        </Typography>
        <Button
          variant="outlined"
          color="warning"
          startIcon={<RestartAlt />}
          onClick={handleFullReset}
          disabled={processing}
        >
          전체 리셋
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 입차 시뮬레이션 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <PlayArrow /> 입차 시뮬레이션
            </Typography>
            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>고객 선택</InputLabel>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                label="고객 선택"
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.customer_id} value={customer.customer_id}>
                    {customer.name} ({customer.phone})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>주차 위치</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                label="주차 위치"
              >
                {availableLocations.map((loc) => (
                  <MenuItem key={loc.location_id} value={loc.location_id}>
                    {loc.location_id} ({loc.zone} 구역, {loc.floor})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={handleParking}
              disabled={processing || !selectedCustomer || !selectedLocation}
              startIcon={<DirectionsCar />}
            >
              입차 시키기
            </Button>

            <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
              💡 비어있는 주차 칸: {availableLocations.length}개
            </Typography>
          </Paper>
        </Grid>

        {/* 현재 주차 중인 차량 */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <LocalParking /> 현재 주차 중 ({parkingSessions.length})
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {parkingSessions.map((session) => (
                <Card key={session.session_id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {session.customers?.name || '고객 정보 없음'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      차량번호: {session.license_plate}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      위치: {session.parking_spot_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      입차: {new Date(session.entry_time).toLocaleString('ko-KR')}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleExit(session)}
                      disabled={processing}
                      startIcon={<Stop />}
                    >
                      출차
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => handleReset(session)}
                      disabled={processing}
                      startIcon={<Refresh />}
                    >
                      초기화
                    </Button>
                  </CardActions>
                </Card>
              ))}

              {parkingSessions.length === 0 && (
                <Alert severity="info">현재 주차 중인 차량이 없습니다</Alert>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* ROS2 명령 로그 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              📡 ROS2 명령 로그 (최근 10개)
            </Typography>
            <Divider sx={{ my: 2 }} />

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>명령 타입</TableCell>
                    <TableCell>차량번호</TableCell>
                    <TableCell>위치</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell>생성 시각</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ros2Commands.map((cmd) => (
                    <TableRow key={cmd.command_id}>
                      <TableCell>
                        <Chip
                          label={cmd.command_type}
                          color={cmd.command_type.includes('DOUBLE') ? 'warning' : 'primary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{cmd.license_plate}</TableCell>
                      <TableCell>{cmd.parking_spot_id}</TableCell>
                      <TableCell>
                        <Chip
                          label={cmd.status}
                          color={
                            cmd.status === 'completed' ? 'success' :
                            cmd.status === 'processing' ? 'info' :
                            cmd.status === 'failed' ? 'error' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(cmd.created_at).toLocaleString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {ros2Commands.length === 0 && (
              <Alert severity="info">ROS2 명령이 없습니다</Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
