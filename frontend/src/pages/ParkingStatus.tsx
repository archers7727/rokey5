import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { DirectionsCar, AccessTime, Payment } from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { ParkingSession, Vehicle, Customer } from '../types/database.types';

interface ParkingLocation {
  location_id: string;
  location_type: string;
  zone: string;
  floor: string;
  is_occupied: boolean;
  last_updated: string;
}

interface ParkingSpotDetail {
  spot: ParkingLocation;
  session?: ParkingSession & {
    vehicles?: Vehicle & { customers?: Customer };
  };
  parkingTime?: number; // 분 단위
  estimatedFee?: number;
}

export default function ParkingStatus() {
  const [parkingSpots, setParkingSpots] = useState<ParkingLocation[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpotDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchParkingStatus();

    // 실시간 업데이트 구독 (선택사항)
    // const channel = subscribeToParkingStatus(() => {
    //   fetchParkingStatus();
    // });
    // return () => {
    //   supabase.removeChannel(channel);
    // };
  }, []);

  const fetchParkingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_locations')
        .select('*')
        .eq('location_type', 'parking')  // parking 타입만 (preparation 제외)
        .order('location_id');

      if (error) throw error;
      setParkingSpots(data || []);
    } catch (error) {
      console.error('Error fetching parking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = async (spot: ParkingLocation) => {
    if (!spot.is_occupied) {
      return; // 비어있는 공간은 클릭 불가
    }

    try {
      // 해당 주차 공간의 세션 조회
      const { data: sessionData, error: sessionError } = await supabase
        .from('parking_sessions')
        .select(`
          *,
          vehicles (
            *,
            customers (*)
          )
        `)
        .eq('parking_spot_id', spot.location_id)
        .eq('status', 'parked')
        .single();

      if (sessionError) {
        console.error('세션 조회 오류:', sessionError);
        return;
      }

      // 주차 시간 계산 (분 단위)
      const entryTime = new Date(sessionData.entry_time);
      const now = new Date();
      const parkingTime = Math.floor((now.getTime() - entryTime.getTime()) / (1000 * 60));

      // 요금 계산 (간단한 로직)
      const estimatedFee = calculateFee(parkingTime);

      setSelectedSpot({
        spot,
        session: sessionData,
        parkingTime,
        estimatedFee,
      });
      setDialogOpen(true);
    } catch (error) {
      console.error('Error fetching spot details:', error);
    }
  };

  const calculateFee = (minutes: number): number => {
    // 기본 요금 정책
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

  const filteredSpots =
    selectedZone === 'all'
      ? parkingSpots
      : parkingSpots.filter((spot) => spot.zone === selectedZone);

  const zones = Array.from(new Set(parkingSpots.map((spot) => spot.zone))).filter(
    Boolean
  ) as string[];

  const occupiedCount = filteredSpots.filter((spot) => spot.is_occupied).length;
  const availableCount = filteredSpots.length - occupiedCount;
  const occupancyRate =
    filteredSpots.length > 0
      ? Math.round((occupiedCount / filteredSpots.length) * 100)
      : 0;

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        실시간 주차 현황
      </Typography>

      {/* 일러스트 이미지 영역 */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            color: 'white',
          }}
        >
          <Box textAlign="center">
            <DirectionsCar sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h5" fontWeight="bold">
              스마트 주차장 관리 시스템
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              여기에 일러스트 이미지를 배치하세요
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.7 }}>
              frontend/public/parking-illustration.png 파일을 추가하고
              <br />
              &lt;img src="/parking-illustration.png" alt="주차장" /&gt; 로 사용
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* 요약 정보 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="textSecondary">
              전체 주차칸
            </Typography>
            <Typography variant="h4">{filteredSpots.length}</Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="textSecondary">
              점유
            </Typography>
            <Typography variant="h4" color="error.main">
              {occupiedCount}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="textSecondary">
              이용 가능
            </Typography>
            <Typography variant="h4" color="success.main">
              {availableCount}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Typography variant="body2" color="textSecondary">
              점유율
            </Typography>
            <Typography variant="h4">{occupancyRate}%</Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* 구역 필터 */}
      {zones.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={selectedZone}
            exclusive
            onChange={(_, value) => value && setSelectedZone(value)}
            aria-label="zone filter"
          >
            <ToggleButton value="all">전체</ToggleButton>
            {zones.map((zone) => (
              <ToggleButton key={zone} value={zone}>
                {zone}구역
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* 주차 공간 맵 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          주차 공간 맵
        </Typography>
        <Grid container spacing={2}>
          {filteredSpots.map((spot) => (
            <Grid item key={spot.location_id} xs={6} sm={4} md={3} lg={2}>
              <Paper
                onClick={() => handleSpotClick(spot)}
                sx={{
                  p: 2,
                  textAlign: 'center',
                  backgroundColor: spot.is_occupied
                    ? 'error.light'
                    : 'success.light',
                  cursor: spot.is_occupied ? 'pointer' : 'default',
                  transition: 'all 0.3s',
                  '&:hover': spot.is_occupied ? {
                    transform: 'scale(1.05)',
                    boxShadow: 3,
                  } : {},
                }}
              >
                <Typography variant="h6" color="white">
                  {spot.location_id}
                </Typography>
                <Chip
                  label={spot.is_occupied ? '점유' : '비어있음'}
                  size="small"
                  sx={{
                    mt: 1,
                    backgroundColor: 'white',
                    color: spot.is_occupied ? 'error.main' : 'success.main',
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* 범례 */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: 'success.light',
              borderRadius: 1,
            }}
          />
          <Typography variant="body2">이용 가능</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: 'error.light',
              borderRadius: 1,
            }}
          />
          <Typography variant="body2">점유 중 (클릭하여 상세 정보 확인)</Typography>
        </Box>
      </Box>

      {/* 차량 정보 팝업 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DirectionsCar />
            주차 공간 상세 정보
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSpot && (
            <Box>
              {/* 주차 공간 정보 */}
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
                <Typography variant="h5" color="white" textAlign="center">
                  {selectedSpot.spot.location_id}
                </Typography>
                <Typography variant="body2" color="white" textAlign="center" sx={{ mt: 1 }}>
                  {selectedSpot.spot.zone}구역 · {selectedSpot.spot.floor}
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* 차량 정보 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  <DirectionsCar sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  차량 정보
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>차량번호</TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">
                          {selectedSpot.session?.license_plate || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>소유자</TableCell>
                      <TableCell>
                        {selectedSpot.session?.vehicles?.customers?.name || '미등록'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>전화번호</TableCell>
                      <TableCell>
                        {selectedSpot.session?.vehicles?.customers?.phone || '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>차량 종류</TableCell>
                      <TableCell>
                        {selectedSpot.session?.vehicles?.vehicle_type || '-'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 주차 시간 정보 */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  <AccessTime sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  주차 시간
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>입차 시간</TableCell>
                      <TableCell>
                        {selectedSpot.session?.entry_time
                          ? new Date(selectedSpot.session.entry_time).toLocaleString('ko-KR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>주차 시간</TableCell>
                      <TableCell>
                        <Typography fontWeight="bold" color="primary">
                          {selectedSpot.parkingTime !== undefined
                            ? formatTime(selectedSpot.parkingTime)
                            : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 요금 정보 */}
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  <Payment sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                  예상 주차 요금
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'success.light', textAlign: 'center' }}>
                  <Typography variant="h4" color="white" fontWeight="bold">
                    ₩{selectedSpot.estimatedFee?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="caption" color="white" sx={{ mt: 1, display: 'block' }}>
                    * 출차 시 최종 요금이 계산됩니다
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
