import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  DirectionsCar,
  TrendingUp,
  LocalParking,
  AttachMoney,
} from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { TodayStatistics, ParkingEvent } from '../types/database.types';

export default function Dashboard() {
  const [statistics, setStatistics] = useState<TodayStatistics | null>(null);
  const [recentEvents, setRecentEvents] = useState<ParkingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // 실시간 업데이트 구독
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_events' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 통계 조회
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_today_statistics');

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStatistics(statsData[0]);
      }

      // 최근 이벤트 조회
      const { data: eventsData, error: eventsError } = await supabase
        .from('parking_events')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;
      setRecentEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        대시보드
      </Typography>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="전체 주차칸"
            value={statistics?.total_spaces || 0}
            icon={<LocalParking />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="현재 주차 중"
            value={statistics?.currently_parked || 0}
            icon={<DirectionsCar />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="오늘 입차"
            value={statistics?.total_entries || 0}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="오늘 매출"
            value={`₩${(statistics?.total_revenue || 0).toLocaleString()}`}
            icon={<AttachMoney />}
            color="error"
          />
        </Grid>
      </Grid>

      {/* 주차 현황 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              주차 현황
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>점유율</Typography>
                <Typography>
                  {statistics?.total_spaces
                    ? Math.round(
                        ((statistics.occupied_spaces || 0) /
                          statistics.total_spaces) *
                          100
                      )
                    : 0}
                  %
                </Typography>
              </Box>
              <Box
                sx={{
                  width: '100%',
                  height: 20,
                  backgroundColor: '#e0e0e0',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${
                      statistics?.total_spaces
                        ? ((statistics.occupied_spaces || 0) /
                            statistics.total_spaces) *
                          100
                        : 0
                    }%`,
                    height: '100%',
                    backgroundColor: 'primary.main',
                  }}
                />
              </Box>
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    점유
                  </Typography>
                  <Typography variant="h6">
                    {statistics?.occupied_spaces || 0}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    이용 가능
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {statistics?.available_spaces || 0}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* 최근 입출차 이벤트 */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              최근 입출차 이벤트
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>차량번호</TableCell>
                    <TableCell>이벤트</TableCell>
                    <TableCell>게이트</TableCell>
                    <TableCell>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentEvents.map((event) => (
                    <TableRow key={event.event_id}>
                      <TableCell>
                        {new Date(event.event_time).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>{event.license_plate}</TableCell>
                      <TableCell>
                        <Chip
                          label={event.event_type === 'entry' ? '입차' : '출차'}
                          color={
                            event.event_type === 'entry' ? 'primary' : 'secondary'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{event.gate_id || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={event.is_registered ? '등록차량' : '미등록'}
                          color={event.is_registered ? 'success' : 'warning'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
