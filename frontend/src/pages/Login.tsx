import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // 하드코딩된 관리자 계정
    if (username === 'admin' && password === 'admin') {
      // 로그인 성공 - localStorage에 저장
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/');
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box textAlign="center" mb={3}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  mb: 2,
                }}
              >
                <LockIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                스마트 주차장 관리
              </Typography>
              <Typography color="textSecondary">
                관리자 로그인
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="아이디"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                margin="normal"
                autoFocus
                required
              />
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                로그인
              </Button>
            </form>

            <Box textAlign="center" mt={2}>
              <Typography variant="caption" color="textSecondary">
                기본 계정: admin / admin
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
