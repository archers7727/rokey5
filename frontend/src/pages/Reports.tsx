import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { TodayStatistics } from '../types/database.types';

export default function Reports() {
  const [statistics, setStatistics] = useState<TodayStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_today_statistics');

      if (error) throw error;
      if (data && data.length > 0) {
        setStatistics(data[0]);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // 샘플 데이터 (실제로는 DB에서 가져와야 함)
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}시`,
    entries: Math.floor(Math.random() * 20),
    exits: Math.floor(Math.random() * 20),
  }));

  const weeklyRevenue = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      revenue: Math.floor(Math.random() * 500000) + 200000,
    };
  });

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">통계 및 리포트</Typography>
        <Button variant="outlined" startIcon={<DownloadIcon />}>
          CSV 다운로드
        </Button>
      </Box>

      {/* 오늘의 통계 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 총 입차
              </Typography>
              <Typography variant="h4">
                {statistics?.total_entries || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 총 출차
              </Typography>
              <Typography variant="h4">{statistics?.total_exits || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                현재 주차 중
              </Typography>
              <Typography variant="h4">
                {statistics?.currently_parked || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                오늘 총 매출
              </Typography>
              <Typography variant="h4">
                ₩{(statistics?.total_revenue || 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 시간대별 입출차 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          시간대별 입출차 현황
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="entries" fill="#1976d2" name="입차" />
            <Bar dataKey="exits" fill="#dc004e" name="출차" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* 주간 매출 */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          주간 매출 추이
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => `₩${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#1976d2"
              name="매출"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}
