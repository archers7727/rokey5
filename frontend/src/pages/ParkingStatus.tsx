import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { supabase, subscribeToParkingStatus } from '../services/supabase';
import type { ParkingCurrentStatus } from '../types/database.types';

export default function ParkingStatus() {
  const [parkingSpots, setParkingSpots] = useState<ParkingCurrentStatus[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParkingStatus();

    // 실시간 업데이트 구독
    const channel = subscribeToParkingStatus(() => {
      fetchParkingStatus();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchParkingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_current_status')
        .select('*')
        .order('spot_id');

      if (error) throw error;
      setParkingSpots(data || []);
    } catch (error) {
      console.error('Error fetching parking status:', error);
    } finally {
      setLoading(false);
    }
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
            <Grid item key={spot.spot_id} xs={6} sm={4} md={3} lg={2}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: 'center',
                  backgroundColor: spot.is_occupied
                    ? 'error.light'
                    : 'success.light',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Typography variant="h6" color="white">
                  {spot.spot_id}
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
                {spot.confidence && (
                  <Typography variant="caption" display="block" sx={{ mt: 1, color: 'white' }}>
                    신뢰도: {Math.round(spot.confidence * 100)}%
                  </Typography>
                )}
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
          <Typography variant="body2">점유 중</Typography>
        </Box>
      </Box>
    </Box>
  );
}
