import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { MonthlyShiftSummary, ShiftClosing, ShiftStatus, TankGaugingStatus } from '../types';
import { AlertTriangle, CalendarCheck, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Lock, ListChecks } from 'lucide-react';

function monthLabel(): string {
  return new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function ShiftClosingPage() {
  const [shiftStatuses, setShiftStatuses] = useState<ShiftStatus[]>([]);
  const [history, setHistory] = useState<ShiftClosing[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlyShiftSummary[]>([]);
  const [closingShiftId, setClosingShiftId] = useState<number | null>(null);
  const [shiftRemarks, setShiftRemarks] = useState<Record<number, string>>({});
  const [gauging, setGauging] = useState<Record<number, TankGaugingStatus[]>>({});
  const [expandedShift, setExpandedShift] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statuses, closings, summary] = await Promise.all([
        api.getShiftStatus(),
        api.getShiftClosingHistory(),
        api.getMonthlyShiftSummary(),
      ]);
      setShiftStatuses(statuses);
      setHistory(closings);
      setMonthlySummary(summary);

      // Preload the per-tank gauging review for every open shift.
      const open = statuses.filter((s) => !s.is_closed);
      const results = await Promise.all(
        open.map(async (s) => {
          try {
            return { shiftId: s.shift_id, items: await api.getShiftGaugingStatus(s.shift_id) };
          } catch {
            return { shiftId: s.shift_id, items: [] as TankGaugingStatus[] };
          }
        }),
      );
      const map: Record<number, TankGaugingStatus[]> = {};
      for (const r of results) map[r.shiftId] = r.items;
      setGauging(map);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Failed to load Shift data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const missingCount = (shiftId: number) =>
    (gauging[shiftId] ?? []).filter((g) => g.status === 'missing').length;

  const draftCount = (shiftId: number) =>
    (gauging[shiftId] ?? []).filter((g) => g.status === 'draft').length;

  const blockers = (status: ShiftStatus) => {
    const reasons: string[] = [];
    if (status.total_dips === 0) reasons.push('No Dip Records');
    if (status.pending_review > 0) reasons.push(`${status.pending_review} unresolved / pending review`);
    if (status.pending_approval > 0) reasons.push(`${status.pending_approval} correction approval pending`);
    if (status.exceptions > 0) reasons.push(`${status.exceptions} open exception(s)`);
    const missing = missingCount(status.shift_id);
    if (missing > 0) reasons.push(`${missing} expected Tank(s) not gauged`);
    return reasons;
  };

  const handleCloseShift = async (status: ShiftStatus) => {
    const reasons = blockers(status);
    if (reasons.length > 0) {
      setMessage(`Shift cannot be closed: ${reasons.join(', ')}.`);
      return;
    }
    if (!window.confirm(`Close ${status.shift_name} Shift? This will create the final Shift Closing record.`)) return;

    setClosingShiftId(status.shift_id);
    setMessage(null);
    try {
      await api.closeShift(status.shift_id, shiftRemarks[status.shift_id]?.trim() || undefined);
      setMessage(`${status.shift_name} Shift closed successfully.`);
      setShiftRemarks((prev) => ({ ...prev, [status.shift_id]: '' }));
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Failed to close Shift'));
    } finally {
      setClosingShiftId(null);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Shift Closing Control Center</h2>
        <p className="text-xs text-dragon-text-muted mt-1">
          A Shift can close only after all expected Tanks are gauged and every record is finalized with all exceptions resolved.
        </p>
      </div>

      {message && <div className="notice-banner info">{message}</div>}

      <div className="grid grid-cols-1 gap-3">
        {shiftStatuses.map((status) => {
          const reasons = blockers(status);
          const blocked = reasons.length > 0;
          const items = gauging[status.shift_id] ?? [];
          const missing = missingCount(status.shift_id);
          const drafts = draftCount(status.shift_id);
          const completed = items.filter((g) => g.status === 'gauged').length;
          const expanded = expandedShift === status.shift_id;
          return (
            <div key={status.shift_id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={22} className={status.is_closed ? 'text-dragon-text-muted' : blocked ? 'text-dragon-warning' : 'text-dragon-success'} />
                  <div>
                    <div className="text-sm font-semibold text-dragon-text">{status.shift_name}</div>
                    <div className="text-[10px] text-dragon-text-muted">{status.is_closed ? 'Closed' : blocked ? 'Controls pending' : 'Ready to close'}</div>
                  </div>
                </div>
                {status.is_closed ? <CheckCircle2 size={17} className="text-dragon-success" /> : blocked ? <Lock size={16} className="text-dragon-warning" /> : null}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs mb-3">
                <Metric label="Total Dips" value={status.total_dips} />
                <Metric label="Tanks Expected" value={items.length} warn={items.length > 0 && missing > 0} />
                <Metric label="Gauged" value={completed} />
                <Metric label="Missing" value={missing} warn={missing > 0} />
                <Metric label="Drafts" value={drafts} warn={drafts > 0} />
                <Metric label="Pending Review" value={status.pending_review} warn={status.pending_review > 0} />
              </div>

              {!status.is_closed && blocked && (
                <div className="notice-banner warning text-[10px] mb-3 items-start">
                  <AlertTriangle size={13} className="mt-0.5 flex-none" />
                  <div>{reasons.map((reason) => <div key={reason}>• {reason}</div>)}</div>
                </div>
              )}

              {!status.is_closed && items.length > 0 && (
                <button
                  onClick={() => setExpandedShift(expanded ? null : status.shift_id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-dragon-primary hover:text-dragon-primary/80 mb-3"
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  <ListChecks size={13} />
                  {expanded ? 'Hide Tank Gauging Review' : 'Show Tank Gauging Review'}
                </button>
              )}

              {expanded && items.length > 0 && (
                <div className="rounded-xl border border-dragon-border overflow-auto mb-3">
                  <table className="data-table w-full text-[11px]">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank</th>
                        <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Product</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Gross Dip</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Auto Dip</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Radar Dip</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G vs A</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">G vs R</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Water</th>
                        <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Sludge</th>
                        <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Performed By</th>
                        <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Review Status</th>
                        <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((g) => (
                        <tr key={g.tank_id}>
                          <td className="px-3 py-2 font-medium text-dragon-text">{g.tank_no}</td>
                          <td className="px-3 py-2 text-dragon-text-secondary">{g.product_name || '--'}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text">{fmt(g.gross_dip_mm)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.auto_dip_mm)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.radar_dip_mm)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.gross_auto_difference)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.gross_radar_difference)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.water_dip_mm)}</td>
                          <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmt(g.sludge_dip_mm)}</td>
                          <td className="px-3 py-2 text-dragon-text-secondary">{g.operator_name || '--'}</td>
                          <td className="px-3 py-2 text-dragon-text-secondary">{g.review_status || '--'}</td>
                          <td className="px-3 py-2">
                            <span className={g.status === 'gauged' ? 'badge badge-success' : g.status === 'draft' ? 'badge badge-warning' : 'badge badge-danger'}>
                              {g.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!status.is_closed && (
                <>
                  <textarea
                    value={shiftRemarks[status.shift_id] || ''}
                    onChange={(e) => setShiftRemarks((prev) => ({ ...prev, [status.shift_id]: e.target.value }))}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Shift closing remarks..."
                  />
                  <button
                    onClick={() => handleCloseShift(status)}
                    disabled={blocked || closingShiftId !== null}
                    className="mt-2 btn btn-primary w-full"
                    title={blocked ? reasons.join('; ') : 'Close Shift'}
                  >
                    {closingShiftId === status.shift_id ? 'Closing...' : blocked ? 'Resolve Pending Controls' : 'Close Shift'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Date-wise summary of the current month */}
      <div className="glass-panel rounded-xl overflow-auto">
        <div className="flex items-center gap-3 px-5 pt-4 pb-2">
          <div className="w-8 h-8 rounded-lg bg-dragon-teal/10 flex items-center justify-center">
            <CalendarDays size={16} className="text-dragon-teal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dragon-text">Monthly Summary — {monthLabel()}</h3>
            <p className="text-xs text-dragon-text-muted mt-0.5">Date-wise Shift Closing status for the current month</p>
          </div>
        </div>
        {monthlySummary.length === 0 ? (
          <p className="px-5 pb-4 text-xs text-dragon-text-muted">No Dip Records recorded this month yet.</p>
        ) : (
          <table className="data-table w-full text-xs">
            <thead className="sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Date</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Shift</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Total Dips</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Approved</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Pending Review</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Open Exceptions</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Closing Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map((row) => (
                <tr key={`${row.date}-${row.shift_id}`}>
                  <td className="px-3 py-2 text-dragon-text">{row.date}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{row.shift_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.total_dips}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-success">{row.approved}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.pending_review}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.exceptions}</td>
                  <td className="px-3 py-2">
                    <span className={row.is_closed ? 'badge badge-success' : 'badge badge-warning'}>
                      {row.is_closed ? 'Closed' : 'Open'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass-panel rounded-xl overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Shift</th>
              <th className="text-right px-3 py-2">Total Dips</th>
              <th className="text-right px-3 py-2">Exceptions</th>
              <th className="text-right px-3 py-2">Pending</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Closed At</th>
              <th className="text-left px-3 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-dragon-text-muted">No Shift Closing history</td></tr>
            ) : history.map((h) => (
              <tr key={h.id}>
                <td className="px-3 py-2 text-dragon-text">{h.date}</td>
                <td className="px-3 py-2 text-dragon-text-secondary">
                  {shiftStatuses.find((s) => s.shift_id === h.shift_id)?.shift_name ?? h.shift_id}
                </td>
                <td className="px-3 py-2 text-right font-mono">{h.total_dips}</td>
                <td className="px-3 py-2 text-right font-mono">{h.total_exceptions}</td>
                <td className="px-3 py-2 text-right font-mono">{h.pending_items}</td>
                <td className="px-3 py-2"><span className={h.status === 'closed' ? 'badge badge-success' : 'badge badge-warning'}>{h.status}</span></td>
                <td className="px-3 py-2 text-dragon-text-secondary">{h.closed_at}</td>
                <td className="px-3 py-2 text-dragon-text-secondary">{h.closing_remarks || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(value: number | null | undefined): string {
  return value == null ? '--' : value.toFixed(1);
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-dragon-border px-2 py-1.5">
      <div className="text-[10px] text-dragon-text-muted">{label}</div>
      <div className={`font-mono text-sm ${warn ? 'text-dragon-warning' : 'text-dragon-text'}`}>{value}</div>
    </div>
  );
}
