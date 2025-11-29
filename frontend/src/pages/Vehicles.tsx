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
  Button,
  TextField,
  Chip,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { Vehicle } from '../types/database.types';

interface VehicleWithCustomer extends Vehicle {
  customers?: {
    name: string;
    phone: string;
  };
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<VehicleWithCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          customers (
            name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.license_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.customers?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.vehicle_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">차량 관리</Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          차량 등록
        </Button>
      </Box>

      {/* 검색 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="차량번호, 고객명, 차량종류로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* 차량 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>차량번호</TableCell>
              <TableCell>소유자</TableCell>
              <TableCell>전화번호</TableCell>
              <TableCell>차량종류</TableCell>
              <TableCell>색상</TableCell>
              <TableCell>등록일</TableCell>
              <TableCell>대표차량</TableCell>
              <TableCell>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVehicles.map((vehicle) => (
              <TableRow key={vehicle.vehicle_id}>
                <TableCell>
                  <Typography fontWeight="bold">{vehicle.license_plate}</Typography>
                </TableCell>
                <TableCell>{vehicle.customers?.name || '-'}</TableCell>
                <TableCell>{vehicle.customers?.phone || '-'}</TableCell>
                <TableCell>{vehicle.vehicle_type || '-'}</TableCell>
                <TableCell>{vehicle.vehicle_color || '-'}</TableCell>
                <TableCell>
                  {new Date(vehicle.registered_date).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell>
                  {vehicle.is_primary && (
                    <Chip label="대표" color="primary" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <Button size="small">상세</Button>
                  <Button size="small">수정</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredVehicles.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 차량이 없습니다.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
