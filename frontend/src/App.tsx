import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ParkingStatus from './pages/ParkingStatus';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import Events from './pages/Events';
import Payments from './pages/Payments';
import Reports from './pages/Reports';

function App() {
  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route path="/login" element={<Login />} />

      {/* 보호된 라우트 */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/parking-status" element={<ParkingStatus />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/events" element={<Events />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
