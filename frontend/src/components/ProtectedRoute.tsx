import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'customer';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const userRole = localStorage.getItem('userRole');

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 역할이 지정된 경우 역할 체크
  if (requiredRole && userRole !== requiredRole) {
    // 잘못된 역할로 접근 시 올바른 페이지로 리다이렉트
    if (userRole === 'admin') {
      return <Navigate to="/" replace />;
    } else if (userRole === 'customer') {
      return <Navigate to="/customer" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
