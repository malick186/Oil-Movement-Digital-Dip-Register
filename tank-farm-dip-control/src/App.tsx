import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewDip from './pages/NewDip';
import DipVerification from './pages/DipVerification';
import ShiftClosing from './pages/ShiftClosing';
import TankStatus from './pages/TankStatus';
import Exceptions from './pages/Exceptions';
import DipHistory from './pages/DipHistory';
import TankTrends from './pages/TankTrends';
import Reports from './pages/Reports';
import TankMaster from './pages/TankMaster';
import ProductMaster from './pages/ProductMaster';
import OperatorMaster from './pages/OperatorMaster';
import TankStatusMaster from './pages/TankStatusMaster';
import Users from './pages/Users';
import Settings from './pages/Settings';
import BackupRestore from './pages/BackupRestore';
import AuditLog from './pages/AuditLog';

const pageComponents: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  'new-dip': NewDip,
  'dip-verification': DipVerification,
  'shift-closing': ShiftClosing,
  'tank-status': TankStatus,
  exceptions: Exceptions,
  'dip-history': DipHistory,
  'tank-trends': TankTrends,
  reports: Reports,
  'tank-master': TankMaster,
  'product-master': ProductMaster,
  'operator-master': OperatorMaster,
  'tank-status-master': TankStatusMaster,
  users: Users,
  settings: Settings,
  'backup-restore': BackupRestore,
  'audit-log': AuditLog,
};

function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const currentPage = useAppStore((s) => s.currentPage);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const PageComponent = pageComponents[currentPage] || Dashboard;

  return (
    <ProtectedRoute>
      <MainLayout>
        <PageComponent />
      </MainLayout>
    </ProtectedRoute>
  );
}

export default App;
