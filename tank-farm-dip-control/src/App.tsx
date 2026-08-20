import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
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
import Changelog from './pages/Changelog';

const pageConfig: Record<string, { component: React.ComponentType; roles: string[] }> = {
  welcome: { component: Welcome, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
  dashboard: { component: Dashboard, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
  'new-dip': { component: NewDip, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
  'dip-verification': { component: DipVerification, roles: ['Shift In-Charge', 'Administrator'] },
  'shift-closing': { component: ShiftClosing, roles: ['Shift In-Charge', 'Administrator'] },
  'tank-status': { component: TankStatus, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
  exceptions: { component: Exceptions, roles: ['Shift In-Charge', 'Administrator'] },
  'dip-history': { component: DipHistory, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
  'tank-trends': { component: TankTrends, roles: ['Shift In-Charge', 'Administrator'] },
  reports: { component: Reports, roles: ['Shift In-Charge', 'Administrator'] },
  'tank-master': { component: TankMaster, roles: ['Administrator'] },
  'product-master': { component: ProductMaster, roles: ['Administrator'] },
  'operator-master': { component: OperatorMaster, roles: ['Administrator'] },
  'tank-status-master': { component: TankStatusMaster, roles: ['Administrator'] },
  users: { component: Users, roles: ['Administrator'] },
  settings: { component: Settings, roles: ['Administrator'] },
  'backup-restore': { component: BackupRestore, roles: ['Administrator'] },
  'audit-log': { component: AuditLog, roles: ['Administrator'] },
  changelog: { component: Changelog, roles: ['Shift Supervisor', 'Shift In-Charge', 'Administrator'] },
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
      <div className="flex items-center justify-center h-screen bg-dragon-bg">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const config = pageConfig[currentPage] || pageConfig.dashboard;
  const PageComponent = config.component;

  return (
    <ProtectedRoute allowedRoles={config.roles}>
      <MainLayout>
        <PageTransition page={currentPage}>
          <PageComponent />
        </PageTransition>
      </MainLayout>
    </ProtectedRoute>
  );
}

export default App;
