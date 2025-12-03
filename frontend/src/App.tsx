import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ParkingStatus from './pages/ParkingStatus';
import RobotMonitor from './pages/RobotMonitor';
import Customers from './pages/Customers';
import Vehicles from './pages/Vehicles';
import Events from './pages/Events';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import CustomerView from './pages/CustomerView';
import TestSimulator from './pages/TestSimulator';

function App() {
  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route path="/login" element={<Login />} />

      {/* 고객 페이지 */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute requiredRole="customer">
            <CustomerView />
          </ProtectedRoute>
        }
      />

      {/* 관리자 페이지 */}
      <Route
        path="/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/parking-status" element={<ParkingStatus />} />
                <Route path="/robot-monitor" element={<RobotMonitor />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/vehicles" element={<Vehicles />} />
                <Route path="/events" element={<Events />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/test" element={<TestSimulator />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
