import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import {
  Cylinder,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
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
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">No data available</span>
      </div>
    );
  }

  const cards = [
    {
      label: 'Active Tanks',
      value: dashboardStats.active_tanks,
      sub: 'Total active',
      icon: <Cylinder size={20} />,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Dips Completed',
      value: dashboardStats.dips_completed,
      sub: `${dashboardStats.dips_pending} pending`,
      icon: <ClipboardList size={20} />,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Awaiting Review',
      value: dashboardStats.awaiting_review,
      sub: 'Needs verification',
      icon: <Clock size={20} />,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Recheck Required',
      value: dashboardStats.recheck_required,
      sub: 'Needs re-dip',
      icon: <AlertTriangle size={20} />,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Abnormal Diff',
      value: dashboardStats.abnormal_diff,
      sub: 'Outside tolerance',
      icon: <XCircle size={20} />,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      label: 'Approved',
      value: dashboardStats.approved,
      sub: 'Finalized records',
      icon: <CheckCircle size={20} />,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">Dashboard</h2>
        <div className="flex items-center gap-2 text-xs">
          <Activity size={14} className="text-slate-400" />
          <span className="text-slate-500">
            Shift Status: {dashboardStats.shift_closing_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded border border-slate-200 p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <span className="text-xs text-slate-500">{card.label}</span>
            </div>
            <div className="text-xl font-bold text-slate-800">{card.value}</div>
            <div className="text-[11px] text-slate-400">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded border border-slate-200 p-4 flex-1">
        <h3 className="text-sm font-medium text-slate-600 mb-3">Recent Activity</h3>
        <div className="text-xs text-slate-400">
          Dashboard data loaded. Navigate to individual sections for details.
        </div>
      </div>
    </div>
  );
}
