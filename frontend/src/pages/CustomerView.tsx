import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import {
  DirectionsCar,
  AccessTime,
  Payment,
  ExitToApp,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import type { ParkingSession, Vehicle } from '../types/database.types';

interface CustomerSession extends ParkingSession {
  vehicles?: Vehicle;
}

export default function CustomerView() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [parkingTime, setParkingTime] = useState(0);
  const [processing, setProcessing] = useState(false);

  const customerName = localStorage.getItem('customerName') || '고객';
  const customerId = localStorage.getItem('customerId');

  useEffect(() => {
    if (!customerId) {
      navigate('/login');
      return;
    }

    fetchParkingSession();
  }, [customerId]);

  useEffect(() => {
    // 1초마다 주차 시간 및 요금 업데이트
    if (!session) return;

    const interval = setInterval(() => {
      updateParkingTimeAndFee();
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const fetchParkingSession = async () => {
    if (!customerId) return;

    try {
      const response = await api.getCustomerSession(customerId);

      if (response.success && response.data) {
        setSession(response.data);
        updateParkingTimeAndFee(response.data);
      } else {
        setSession(null);
        if (response.error) {
          console.error('세션 조회 오류:', response.error);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const updateParkingTimeAndFee = (sessionData = session) => {
    if (!sessionData) return;

    const entryTime = new Date(sessionData.entry_time);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - entryTime.getTime()) / (1000 * 60));

    setParkingTime(minutes);
    setEstimatedFee(calculateFee(minutes));
  };

  const calculateFee = (minutes: number): number => {
    const FREE_MINUTES = 10;
    const BASE_TIME = 30;
    const BASE_FEE = 2000;
    const ADDITIONAL_UNIT = 10;
    const ADDITIONAL_FEE = 1000;
    const DAILY_MAX = 20000;

    if (minutes <= FREE_MINUTES) {
      return 0;
    }

    const billableMinutes = minutes - FREE_MINUTES;

    if (billableMinutes <= BASE_TIME) {
      return BASE_FEE;
    }

    const extraMinutes = billableMinutes - BASE_TIME;
    const additionalUnits = Math.ceil(extraMinutes / ADDITIONAL_UNIT);
    const totalFee = BASE_FEE + (additionalUnits * ADDITIONAL_FEE);

    return Math.min(totalFee, DAILY_MAX);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}시간 ${mins}분`;
    }
    return `${mins}분`;
  };

  const handleExit = async () => {
    if (!session) return;

    if (!window.confirm('출차하시겠습니까?')) {
      return;
    }

    setProcessing(true);

    try {
      console.log('=== 출차 프로세스 시작 ===');
      console.log('세션 정보:', {
        session_id: session.session_id,
        license_plate: session.license_plate,
        parking_spot_id: session.parking_spot_id,
        entry_time: session.entry_time,
      });

      // Backend API로 출차 처리
      const response = await api.processExit(session.session_id, 'CUSTOMER-APP');

      if (!response.success) {
        console.error('❌ 출차 처리 실패:', response.error);
        alert(response.error || '출차 처리 중 오류가 발생했습니다.');
        return;
      }

      console.log('✅ 출차 처리 완료:', response.data);

      const fee = response.data?.fee?.total_fee || estimatedFee;
      alert(`출차가 완료되었습니다.\n주차 요금: ₩${fee.toLocaleString()}`);
      setSession(null);
    } catch (error) {
      console.error('출차 오류:', error);
      alert('출차 처리 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* 상단 바 */}
      <AppBar position="static">
        <Toolbar>
          <DirectionsCar sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            스마트 주차장
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {customerName}님
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {!session ? (
          // 주차 중이 아닐 때
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <DirectionsCar sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              현재 주차 중인 차량이 없습니다
            </Typography>
            <Typography color="textSecondary">
              주차장 입구에서 입차하시면 여기에서 정보를 확인할 수 있습니다.
            </Typography>
          </Paper>
        ) : (
          // 주차 중일 때
          <Box>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              내 주차 정보
            </Typography>

            {/* 차량 정보 카드 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <DirectionsCar sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">차량 정보</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      차량번호
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {session.license_plate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      주차 위치
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {session.parking_spot_id || '-'}
                    </Typography>
                  </Grid>
                  {session.vehicles && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          차량 종류
                        </Typography>
                        <Typography variant="body1">
                          {session.vehicles.vehicle_type || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          색상
                        </Typography>
                        <Typography variant="body1">
                          {session.vehicles.vehicle_color || '-'}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>

            {/* 주차 시간 카드 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AccessTime sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">주차 시간</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      입차 시간
                    </Typography>
                    <Typography variant="body1">
                      {new Date(session.entry_time).toLocaleString('ko-KR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      주차 시간
                    </Typography>
                    <Typography variant="h5" color="primary" fontWeight="bold">
                      {formatTime(parkingTime)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* 예상 요금 카드 */}
            <Card sx={{ mb: 4, bgcolor: 'success.light' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Payment sx={{ mr: 1, color: 'white' }} />
                  <Typography variant="h6" color="white">
                    예상 주차 요금
                  </Typography>
                </Box>
                <Typography variant="h3" color="white" fontWeight="bold" textAlign="center">
                  ₩{estimatedFee.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="white" textAlign="center" display="block" mt={1}>
                  * 출차 시 최종 요금이 결정됩니다
                </Typography>
              </CardContent>
            </Card>

            {/* 출차 버튼 */}
            <Button
              fullWidth
              variant="contained"
              color="error"
              size="large"
              startIcon={<ExitToApp />}
              onClick={handleExit}
              disabled={processing}
              sx={{ py: 2, fontSize: '1.2rem' }}
            >
              {processing ? '처리 중...' : '출차하기'}
            </Button>

            {/* 안내 메시지 */}
            <Alert severity="info" sx={{ mt: 2 }}>
              출차 버튼을 누르면 자동으로 출차 처리되며, 주차 요금이 확정됩니다.
            </Alert>
          </Box>
        )}
      </Container>
    </Box>
  );
}
