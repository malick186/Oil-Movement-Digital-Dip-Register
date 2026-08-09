import { useEffect, useState } from 'react';
import * as api from '../services/api';
import type { ShiftClosing, ShiftStatus } from '../types';
import { AlertTriangle, CalendarCheck, CheckCircle2, Lock } from 'lucide-react';

export default function ShiftClosingPage() {
  const [shiftStatuses, setShiftStatuses] = useState<ShiftStatus[]>([]);
  const [history, setHistory] = useState<ShiftClosing[]>([]);
  const [closingShiftId, setClosingShiftId] = useState<number | null>(null);
  const [shiftRemarks, setShiftRemarks] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statuses, closings] = await Promise.all([api.getShiftStatus(), api.getShiftClosingHistory()]);
      setShiftStatuses(statuses);
      setHistory(closings);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err || 'Failed to load Shift data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const blockers = (status: ShiftStatus) => {
    const reasons: string[] = [];
    if (status.total_dips === 0) reasons.push('No Dip Records');
    if (status.pending_review > 0) reasons.push(`${status.pending_review} unresolved / pending review`);
    if (status.pending_approval > 0) reasons.push(`${status.pending_approval} correction approval pending`);
    if (status.exceptions > 0) reasons.push(`${status.exceptions} open exception(s)`);
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
        <p className="text-xs text-dragon-text-muted mt-1">A Shift can close only after all recorded Dips are finalized and all exceptions are resolved.</p>
      </div>

      {message && <div className="notice-banner info">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {shiftStatuses.map((status) => {
          const reasons = blockers(status);
          const blocked = reasons.length > 0;
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

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <Metric label="Total Dips" value={status.total_dips} />
                <Metric label="Pending Review" value={status.pending_review} warn={status.pending_review > 0} />
                <Metric label="Pending Approval" value={status.pending_approval} warn={status.pending_approval > 0} />
                <Metric label="Open Exceptions" value={status.exceptions} warn={status.exceptions > 0} />
              </div>

              {!status.is_closed && blocked && (
                <div className="notice-banner warning text-[10px] mb-3 items-start">
                  <AlertTriangle size={13} className="mt-0.5 flex-none" />
                  <div>{reasons.map((reason) => <div key={reason}>• {reason}</div>)}</div>
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

      <div className="glass-panel rounded-xl overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Shift ID</th>
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
                <td className="px-3 py-2 text-dragon-text-secondary">{h.shift_id}</td>
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

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-dragon-border px-2 py-1.5">
      <div className="text-[10px] text-dragon-text-muted">{label}</div>
      <div className={`font-mono text-sm ${warn ? 'text-dragon-warning' : 'text-dragon-text'}`}>{value}</div>
    </div>
  );
}
