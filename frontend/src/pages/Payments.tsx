import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { supabase } from '../services/supabase';
import type { ParkingFee, ParkingSession } from '../types/database.types';

interface ParkingFeeWithSession extends ParkingFee {
  parking_sessions?: ParkingSession;
}

export default function Payments() {
  const [fees, setFees] = useState<ParkingFeeWithSession[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_fees')
        .select(`
          *,
          parking_sessions (
            license_plate,
            entry_time,
            exit_time,
            duration_minutes
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFees(data || []);
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFees = fees.filter(
    (fee) => statusFilter === 'all' || fee.payment_status === statusFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'warning';
      case 'failed':
        return 'error';
      case 'refunded':
        return 'info';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return '결제완료';
      case 'unpaid':
        return '미결제';
      case 'failed':
        return '결제실패';
      case 'refunded':
        return '환불';
      case 'cancelled':
        return '취소';
      default:
        return status;
    }
  };

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        결제 관리
      </Typography>

      {/* 필터 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, value) => value && setStatusFilter(value)}
          size="small"
        >
          <ToggleButton value="all">전체</ToggleButton>
          <ToggleButton value="unpaid">미결제</ToggleButton>
          <ToggleButton value="paid">결제완료</ToggleButton>
          <ToggleButton value="failed">결제실패</ToggleButton>
          <ToggleButton value="refunded">환불</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* 요금 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>차량번호</TableCell>
              <TableCell>입차시간</TableCell>
              <TableCell>출차시간</TableCell>
              <TableCell>주차시간</TableCell>
              <TableCell>기본요금</TableCell>
              <TableCell>추가요금</TableCell>
              <TableCell>총요금</TableCell>
              <TableCell>결제상태</TableCell>
              <TableCell>결제방법</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFees.map((fee) => (
              <TableRow key={fee.fee_id}>
                <TableCell>
                  <Typography fontWeight="bold">
                    {fee.parking_sessions?.license_plate || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {fee.parking_sessions?.entry_time
                    ? new Date(fee.parking_sessions.entry_time).toLocaleString(
                        'ko-KR'
                      )
                    : '-'}
                </TableCell>
                <TableCell>
                  {fee.parking_sessions?.exit_time
                    ? new Date(fee.parking_sessions.exit_time).toLocaleString(
                        'ko-KR'
                      )
                    : '-'}
                </TableCell>
                <TableCell>
                  {fee.parking_sessions?.duration_minutes
                    ? `${fee.parking_sessions.duration_minutes}분`
                    : '-'}
                </TableCell>
                <TableCell>₩{fee.base_fee.toLocaleString()}</TableCell>
                <TableCell>₩{fee.additional_fee.toLocaleString()}</TableCell>
                <TableCell>
                  <Typography fontWeight="bold">
                    ₩{fee.total_fee.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(fee.payment_status)}
                    color={getStatusColor(fee.payment_status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{fee.payment_method || '-'}</TableCell>
                <TableCell>
                  {fee.payment_status === 'unpaid' && (
                    <Button size="small" variant="outlined" color="primary">
                      결제 처리
                    </Button>
                  )}
                  {fee.payment_status === 'paid' && (
                    <Button size="small" variant="outlined" color="error">
                      환불
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredFees.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            {statusFilter !== 'all'
              ? '해당하는 결제 내역이 없습니다.'
              : '결제 내역이 없습니다.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
