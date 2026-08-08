import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Cylinder,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react';

export default function Dashboard() {
  const dashboardStats = useAppStore((s) => s.dashboardStats);
  const isLoadingStats = useAppStore((s) => s.isLoadingStats);
  const loadDashboardStats = useAppStore((s) => s.loadDashboardStats);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  if (isLoadingStats) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="empty-state">
        <span className="empty-state-text">No data available</span>
      </div>
    );
  }

  const cards = [
    {
      label: 'Active Tanks',
      value: dashboardStats.active_tanks,
      sub: 'Total active',
      icon: Cylinder,
      color: 'text-dragon-primary',
      bg: 'bg-dragon-primary/10',
    },
    {
      label: 'Dips Completed',
      value: dashboardStats.dips_completed,
      sub: `${dashboardStats.dips_pending} pending`,
      icon: ClipboardList,
      color: 'text-dragon-success',
      bg: 'bg-dragon-success/10',
    },
    {
      label: 'Awaiting Review',
      value: dashboardStats.awaiting_review,
      sub: 'Needs verification',
      icon: Clock,
      color: 'text-dragon-warning',
      bg: 'bg-dragon-warning/10',
    },
    {
      label: 'Recheck Required',
      value: dashboardStats.recheck_required,
      sub: 'Needs re-dip',
      icon: AlertTriangle,
      color: 'text-dragon-warning',
      bg: 'bg-dragon-warning/10',
    },
    {
      label: 'Abnormal Diff',
      value: dashboardStats.abnormal_diff,
      sub: 'Outside tolerance',
      icon: XCircle,
      color: 'text-dragon-danger',
      bg: 'bg-dragon-danger/10',
    },
    {
      label: 'Approved',
      value: dashboardStats.approved,
      sub: 'Finalized records',
      icon: CheckCircle,
      color: 'text-dragon-teal',
      bg: 'bg-dragon-teal/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-dragon-text">Dashboard</h2>
          <p className="text-xs text-dragon-text-secondary mt-0.5">
            Tank farm dip status overview
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="status-dot active" />
          <span className="text-dragon-text-secondary">
            Shift Status: {dashboardStats.shift_closing_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="glass-stat">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
              <span className="text-[11px] font-medium text-dragon-text-muted uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-dragon-text">{card.value}</div>
            <div className="text-[11px] text-dragon-text-muted mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-dragon-primary/10 flex items-center justify-center">
            <Zap size={16} className="text-dragon-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dragon-text">Recent Activity</h3>
            <p className="text-xs text-dragon-text-muted mt-0.5">
              Dashboard data loaded. Navigate to individual sections for details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
