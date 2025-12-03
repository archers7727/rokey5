import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import {
  SmartToy,
  CheckCircle,
  Error,
  Schedule,
  LocalShipping,
} from '@mui/icons-material';
import { supabase } from '../services/supabase';
import type { Task } from '../types/database.types';

interface ExitMonitoringProps {
  licensePlate: string;
  onComplete?: () => void;
}

export default function ExitMonitoring({ licensePlate, onComplete }: ExitMonitoringProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTask();

    // Realtime Subscribe로 Task 상태 실시간 업데이트
    const channel = supabase
      .channel('exit-task-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `vehicle_plate=eq.${licensePlate}`,
        },
        (payload) => {
          console.log('Task 업데이트:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setTask(payload.new as Task);

            // 완료되면 콜백 실행
            if (payload.new.status === 'completed' && payload.new.done) {
              setTimeout(() => {
                onComplete?.();
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [licensePlate]);

  const fetchTask = async () => {
    try {
      setLoading(true);

      // 최근 EXIT 타입 Task 조회
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('vehicle_plate', licensePlate)
        .eq('task_type', 'EXIT')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Task 조회 오류:', fetchError);
        setError('작업 정보를 불러오는데 실패했습니다.');
        return;
      }

      setTask(data);
    } catch (err) {
      console.error('Error:', err);
      setError('예상치 못한 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'in_progress':
        return <CircularProgress size={24} />;
      case 'failed':
        return <Error color="error" />;
      case 'pending':
        return <Schedule color="warning" />;
      default:
        return <SmartToy />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '완료됨';
      case 'in_progress':
        return '진행 중';
      case 'failed':
        return '실패';
      case 'pending':
        return '대기 중';
      default:
        return status;
    }
  };

  const getActiveStep = (status: string, done: boolean) => {
    if (done) return 3;
    switch (status) {
      case 'pending':
        return 0;
      case 'in_progress':
        return 1;
      case 'completed':
        return 2;
      default:
        return 0;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!task) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        출차 작업이 아직 시작되지 않았습니다.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Paper elevation={3} sx={{ p: 3, bgcolor: '#f8f9fa' }}>
        <Box display="flex" alignItems="center" mb={3}>
          <LocalShipping sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              출차 작업 모니터링
            </Typography>
            <Typography variant="body2" color="textSecondary">
              실시간으로 로봇의 작업 상태를 확인하세요
            </Typography>
          </Box>
        </Box>

        {/* 진행 단계 */}
        <Stepper activeStep={getActiveStep(task.status, task.done)} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>작업 대기</StepLabel>
          </Step>
          <Step>
            <StepLabel>로봇 작업 중</StepLabel>
          </Step>
          <Step>
            <StepLabel>작업 완료</StepLabel>
          </Step>
        </Stepper>

        {/* 작업 상태 카드 */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  <SmartToy sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="subtitle2" color="textSecondary">
                    할당된 로봇
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight="bold">
                  {task.assigned_robot || '미할당'}
                </Typography>
                {task.helper_robot && (
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    보조 로봇: {task.helper_robot}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={1}>
                  {getStatusIcon(task.status)}
                  <Typography variant="subtitle2" color="textSecondary" ml={1}>
                    작업 상태
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6" fontWeight="bold">
                    {getStatusText(task.status)}
                  </Typography>
                  <Chip
                    label={task.done ? '완료' : '진행중'}
                    color={task.done ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 위치 정보 */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" color="textSecondary" mb={2}>
              작업 위치
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  시작 위치
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {task.start_location || '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  목표 위치
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {task.target_location || '출구'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 작업 진행률 */}
        {task.status === 'in_progress' && !task.done && (
          <Box>
            <Typography variant="body2" color="textSecondary" mb={1}>
              작업 진행 중...
            </Typography>
            <LinearProgress />
          </Box>
        )}

        {/* 완료 메시지 */}
        {task.status === 'completed' && task.done && (
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              ✅ 출차 작업이 완료되었습니다!
            </Typography>
            <Typography variant="body2" mt={1}>
              안전하게 출차해주세요. 감사합니다!
            </Typography>
          </Alert>
        )}

        {/* 실패 메시지 */}
        {task.status === 'failed' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              ❌ 작업 중 문제가 발생했습니다
            </Typography>
            <Typography variant="body2" mt={1}>
              관리자에게 문의해주세요.
            </Typography>
          </Alert>
        )}

        {/* 작업 세부 정보 */}
        <Box mt={3} p={2} bgcolor="white" borderRadius={1}>
          <Typography variant="caption" color="textSecondary" display="block">
            작업 ID: {task.task_id}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            생성 시간: {new Date(task.created_at).toLocaleString('ko-KR')}
          </Typography>
          {task.started_at && (
            <Typography variant="caption" color="textSecondary" display="block">
              시작 시간: {new Date(task.started_at).toLocaleString('ko-KR')}
            </Typography>
          )}
          {task.completed_at && (
            <Typography variant="caption" color="textSecondary" display="block">
              완료 시간: {new Date(task.completed_at).toLocaleString('ko-KR')}
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
