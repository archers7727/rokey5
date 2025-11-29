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
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { supabase, subscribeToParkingEvents } from '../services/supabase';
import type { ParkingEvent } from '../types/database.types';

export default function Events() {
  const [events, setEvents] = useState<ParkingEvent[]>([]);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();

    // 실시간 업데이트 구독
    const channel = subscribeToParkingEvents(() => {
      fetchEvents();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('parking_events')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesType =
      eventTypeFilter === 'all' || event.event_type === eventTypeFilter;
    const matchesSearch = event.license_plate
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  if (loading) {
    return <Typography>로딩 중...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        입출차 이벤트
      </Typography>

      {/* 필터 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <ToggleButtonGroup
            value={eventTypeFilter}
            exclusive
            onChange={(_, value) => value && setEventTypeFilter(value)}
            size="small"
          >
            <ToggleButton value="all">전체</ToggleButton>
            <ToggleButton value="entry">입차</ToggleButton>
            <ToggleButton value="exit">출차</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            size="small"
            placeholder="차량번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      {/* 이벤트 목록 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>시간</TableCell>
              <TableCell>차량번호</TableCell>
              <TableCell>이벤트</TableCell>
              <TableCell>게이트</TableCell>
              <TableCell>등록여부</TableCell>
              <TableCell>신뢰도</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents.map((event) => (
              <TableRow key={event.event_id}>
                <TableCell>
                  {new Date(event.event_time).toLocaleString('ko-KR')}
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">{event.license_plate}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={event.event_type === 'entry' ? '입차' : '출차'}
                    color={event.event_type === 'entry' ? 'primary' : 'secondary'}
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
                <TableCell>
                  {event.confidence
                    ? `${Math.round(event.confidence * 100)}%`
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredEvents.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            {searchQuery || eventTypeFilter !== 'all'
              ? '검색 결과가 없습니다.'
              : '이벤트가 없습니다.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
