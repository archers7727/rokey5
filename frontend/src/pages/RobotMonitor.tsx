import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  SmartToy,
  CheckCircle,
  Error,
  Schedule,
  PlayArrow,
  Speed,
} from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { Task } from '../types/database.types';

export default function RobotMonitor() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [robot1Task, setRobot1Task] = useState<Task | null>(null);
  const [robot2Task, setRobot2Task] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();

    // Realtime Subscribe로 Task 실시간 업데이트
    const channel = supabase
      .channel('robot-monitor-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task 변경:', payload);

          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((task) =>
                task.task_id === (payload.new as Task).task_id
                  ? (payload.new as Task)
                  : task
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) =>
              prev.filter((task) => task.task_id !== (payload.old as Task).task_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // 로봇별 현재 작업 필터링
    const robot1CurrentTask = tasks.find(
      (task) =>
        task.assigned_robot === 'robot1' &&
        (task.status === 'in_progress' || task.status === 'pending')
    );
    const robot2CurrentTask = tasks.find(
      (task) =>
        task.assigned_robot === 'robot2' &&
        (task.status === 'in_progress' || task.status === 'pending')
    );

    setRobot1Task(robot1CurrentTask || null);
    setRobot2Task(robot2CurrentTask || null);
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Tasks 조회 오류:', error);
        return;
      }

      setTasks(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'in_progress':
        return <PlayArrow color="info" />;
      case 'failed':
        return <Error color="error" />;
      case 'pending':
        return <Schedule color="warning" />;
      default:
        return <Schedule />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'info';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료';
      case 'in_progress':
        return '진행중';
      case 'failed':
        return '실패';
      case 'pending':
        return '대기중';
      default:
        return status || '알 수 없음';
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return '데이터를 찾는중...';
    }
    return value;
  };

  const RobotCard = ({ robotName, task }: { robotName: string; task: Task | null }) => (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <SmartToy sx={{ fontSize: 40, mr: 2, color: task ? 'primary.main' : 'text.secondary' }} />
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {robotName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {task ? '작업 중' : '대기 중'}
            </Typography>
          </Box>
        </Box>

        {task ? (
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {getStatusIcon(task.status)}
              <Chip
                label={getStatusText(task.status)}
                color={getStatusColor(task.status)}
                size="small"
              />
            </Box>

            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  작업 유형
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatValue(task.task_type)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  차량 번호
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatValue(task.vehicle_plate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  시작 위치
                </Typography>
                <Typography variant="body2">
                  {formatValue(task.start_location)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="textSecondary">
                  목표 위치
                </Typography>
                <Typography variant="body2">
                  {formatValue(task.target_location)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="caption" color="textSecondary">
                  우선순위
                </Typography>
                <Typography variant="body2">
                  {task.priority}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            현재 할당된 작업이 없습니다
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* 헤더 */}
      <Box mb={4}>
        <Box display="flex" alignItems="center" mb={1}>
          <Speed sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" fontWeight="bold">
            로봇 모니터
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary">
          로봇의 실시간 작업 상태를 확인하세요
        </Typography>
      </Box>

      {/* 로봇 상태 카드 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <RobotCard robotName="Robot 1" task={robot1Task} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RobotCard robotName="Robot 2" task={robot2Task} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      {/* Task 테이블 */}
      <Box>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          작업 내역
        </Typography>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>상태</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>로봇</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>작업 유형</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>차량 번호</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>차량 타입</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>시작 위치</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>목표 위치</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>우선순위</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>생성 시간</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="textSecondary" py={4}>
                      작업 내역이 없습니다
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow
                    key={task.task_id}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: task.done ? 'action.selected' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getStatusIcon(task.status)}
                        <Chip
                          label={getStatusText(task.status)}
                          color={getStatusColor(task.status)}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>{formatValue(task.assigned_robot)}</TableCell>
                    <TableCell>
                      <Chip label={formatValue(task.task_type)} variant="outlined" size="small" />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{formatValue(task.vehicle_plate)}</TableCell>
                    <TableCell>{formatValue(task.vehicle_type)}</TableCell>
                    <TableCell>{formatValue(task.start_location)}</TableCell>
                    <TableCell>{formatValue(task.target_location)}</TableCell>
                    <TableCell>
                      <Chip label={task.priority} color="default" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(task.created_at).toLocaleString('ko-KR')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
