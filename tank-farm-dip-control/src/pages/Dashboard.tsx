import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { useCountUp } from '../hooks/useCountUp';
import {
  Cylinder,
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  PenLine,
  ClipboardCheck,
  CalendarCheck,
  CalendarClock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { AttentionItem } from '../types';

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Dashboard() {
  const dashboardStats = useAppStore((s) => s.dashboardStats);
  const isLoadingStats = useAppStore((s) => s.isLoadingStats);
  const statsError = useAppStore((s) => s.statsError);
  const loadDashboardStats = useAppStore((s) => s.loadDashboardStats);
  const attentionList = useAppStore((s) => s.attentionList);
  const isLoadingAttention = useAppStore((s) => s.isLoadingAttention);
  const attentionError = useAppStore((s) => s.attentionError);
  const loadAttentionList = useAppStore((s) => s.loadAttentionList);
  const setPage = useAppStore((s) => s.setPage);
  const navigateToTankTrends = useAppStore((s) => s.navigateToTankTrends);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadDashboardStats();
    loadAttentionList();
  }, [loadDashboardStats, loadAttentionList]);

  const canReview = user?.role === 'Shift In-Charge' || user?.role === 'Administrator';

  const quickActions = [
    { label: 'Record New Dip', page: 'new-dip' as const, icon: PenLine, color: 'text-dragon-primary', bg: 'bg-dragon-primary/10' },
    ...(canReview ? [
      { label: 'Review Pending Dips', page: 'dip-verification' as const, icon: ClipboardCheck, color: 'text-dragon-teal', bg: 'bg-dragon-teal/10' },
      { label: 'Open Shift Closing', page: 'shift-closing' as const, icon: CalendarCheck, color: 'text-dragon-success', bg: 'bg-dragon-success/10' },
      { label: 'View Exceptions', page: 'exceptions' as const, icon: AlertTriangle, color: 'text-dragon-warning', bg: 'bg-dragon-warning/10' },
    ] : []),
  ];

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

  const stats = dashboardStats;
  const missingTanks = Math.max(0, stats.tanks_expected - stats.tanks_gauged_today);
  const shift = stats.current_shift;

  const cards = [
    {
      label: 'Active Tanks',
      value: stats.active_tanks,
      sub: 'Total active',
      icon: Cylinder,
      color: 'text-dragon-primary',
      bg: 'bg-dragon-primary/10',
    },
    {
      label: 'Tanks Expected for Gauging',
      value: stats.tanks_expected,
      sub: `${stats.tanks_gauged_today} gauged · ${missingTanks} missing`,
      icon: Gauge,
      color: 'text-dragon-teal',
      bg: 'bg-dragon-teal/10',
      warn: missingTanks > 0,
    },
    {
      label: 'Dips Completed',
      value: stats.dips_completed,
      sub: `${stats.dips_pending} pending`,
      icon: ClipboardList,
      color: 'text-dragon-success',
      bg: 'bg-dragon-success/10',
    },
    {
      label: 'Dips Pending',
      value: stats.dips_pending,
      sub: 'Saved drafts',
      icon: Clock,
      color: 'text-dragon-warning',
      bg: 'bg-dragon-warning/10',
      warn: stats.dips_pending > 0,
    },
    {
      label: 'Awaiting Review',
      value: stats.awaiting_review,
      sub: 'Needs verification',
      icon: ClipboardCheck,
      color: 'text-dragon-warning',
      bg: 'bg-dragon-warning/10',
    },
    {
      label: 'Recheck Required',
      value: stats.recheck_required,
      sub: 'Needs re-dip',
      icon: AlertTriangle,
      color: 'text-dragon-warning',
      bg: 'bg-dragon-warning/10',
    },
    {
      label: 'Abnormal Diff',
      value: stats.abnormal_diff,
      sub: 'Outside tolerance',
      icon: XCircle,
      color: 'text-dragon-danger',
      bg: 'bg-dragon-danger/10',
    },
    {
      label: 'Approved',
      value: stats.approved,
      sub: 'Finalized records',
      icon: CheckCircle,
      color: 'text-dragon-teal',
      bg: 'bg-dragon-teal/10',
    },
  ];

  const statusBadge =
    stats.shift_closing_status === 'closed' ? 'badge badge-success' : 'badge badge-warning';

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
          <span className="text-dragon-text-secondary">Shift Closing:</span>
          <span className={statusBadge}>{stats.shift_closing_status}</span>
        </div>
      </div>

      {statsError && (
        <div className="notice-banner error mb-3">{statsError}</div>
      )}

      {/* Current Shift */}
      <div className="glass-panel p-5 rise-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-dragon-primary/10 flex items-center justify-center">
            <CalendarClock size={16} className="text-dragon-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dragon-text">Current Shift</h3>
            <p className="text-xs text-dragon-text-muted mt-0.5">{todayLabel()}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <ShiftMetric label="Shift" value={shift?.shift_name ?? '--'} />
          <ShiftMetric label="Shift Start" value={shift?.start_time ?? '--'} mono />
          <ShiftMetric label="Shift End" value={shift?.end_time ?? '--'} mono />
          <ShiftMetric label="Shift Supervisor" value={shift?.supervisor ?? '--'} />
          <ShiftMetric label="Shift In-Charge" value={shift?.in_charge ?? '--'} />
          <ShiftMetric label="Date" value={new Date().toLocaleDateString()} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 rise-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => setPage(action.page)}
            className="glass-card px-4 py-3 flex items-center gap-2.5 hover:border-dragon-primary/50 transition-colors group"
          >
            <span className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center`}>
              <action.icon size={15} className={action.color} />
            </span>
            <span className="text-xs font-medium text-dragon-text">{action.label}</span>
            <ArrowRight size={13} className="text-dragon-text-muted group-hover:text-dragon-primary transition-colors" />
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 rise-3 stat-stagger">
        {cards.map((card) => (
          <div key={card.label} className="glass-stat stat-3d">
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
              <span className="text-[11px] font-medium text-dragon-text-muted uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${card.warn ? 'text-dragon-warning' : 'text-dragon-text'}`}>
              <CountUpValue value={card.value} />
            </div>
            <div className="text-[11px] text-dragon-text-muted mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Attention Required table */}
      <div className="glass-panel rounded-xl overflow-auto rise-4">
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <div className="w-8 h-8 rounded-lg bg-dragon-warning/10 flex items-center justify-center">
            <AlertTriangle size={16} className="text-dragon-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dragon-text">Attention Required</h3>
            <p className="text-xs text-dragon-text-muted mt-0.5">
              Records pending review, recheck or with open exceptions
            </p>
          </div>
          {attentionList.length > 0 && (
            <span className="ml-auto badge badge-warning">{attentionList.length}</span>
          )}
        </div>

        {attentionError && <div className="notice-banner error mx-5 mb-2">{attentionError}</div>}

        {isLoadingAttention ? (
          <div className="loading-state py-8">
            <div className="loading-spinner" />
          </div>
        ) : (
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank No.</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Product</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Gross Dip</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Auto Dip</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Radar Dip</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G vs A</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G vs R</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank Status</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Verification</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Last Gauged</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {attentionList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-dragon-text-muted">
                    No records currently require attention
                  </td>
                </tr>
              ) : (
                attentionList.map((item: AttentionItem) => (
                  <tr key={item.dip_id}>
                    <td className="px-3 py-2 font-medium text-dragon-text">{item.tank_no}</td>
                    <td className="px-3 py-2 text-dragon-text-secondary">{item.product_name}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text">{fmt(item.gross_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(item.auto_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(item.radar_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(item.gross_auto_difference)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(item.gross_radar_difference)}</td>
                    <td className="px-3 py-2 text-dragon-text-secondary">{item.tank_status_name || '--'}</td>
                    <td className="px-3 py-2">
                      <span className={reviewBadge(item.review_status)}>{item.review_status}</span>
                    </td>
                    <td className="px-3 py-2 text-dragon-text-secondary">{item.last_gauged || '--'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigateToTankTrends(item.tank_id)}
                          className="btn btn-secondary btn-sm"
                          title="View tank trends"
                        >
                          <TrendingUp size={12} />
                        </button>
                        {canReview && (
                          <button
                            onClick={() => setPage('dip-verification')}
                            className="btn btn-secondary btn-sm"
                            title="Open Dip Verification"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function fmt(value: number | null | undefined): string {
  return value == null ? '--' : value.toFixed(1);
}

function reviewBadge(status: string): string {
  switch (status) {
    case 'approved':
      return 'badge badge-success';
    case 'rejected':
      return 'badge badge-danger';
    case 'recheck':
    case 'recheck_pending':
      return 'badge badge-warning';
    default:
      return 'badge badge-info';
  }
}

function ShiftMetric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-dragon-border px-3 py-2">
      <div className="text-[10px] text-dragon-text-muted uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-semibold text-dragon-text mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function CountUpValue({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated}</>;
}
