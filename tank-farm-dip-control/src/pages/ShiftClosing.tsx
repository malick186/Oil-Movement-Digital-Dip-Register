import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ShiftClosing, ShiftStatus } from '../types';
import { CalendarCheck } from 'lucide-react';

export default function ShiftClosing() {
  const [shiftStatuses, setShiftStatuses] = useState<ShiftStatus[]>([]);
  const [history, setHistory] = useState<ShiftClosing[]>([]);
  const [closing, setClosing] = useState(false);
  const [shiftRemarks, setShiftRemarks] = useState<Record<number, string>>({});
  const [closingShiftId, setClosingShiftId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statuses, hist] = await Promise.all([
        api.getShiftStatus(),
        api.getShiftClosingHistory(),
      ]);
      setShiftStatuses(statuses);
      setHistory(hist);
    } catch {
      setMsg('Failed to load shift data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCloseShift = async (shiftId: number) => {
    setClosing(true);
    setMsg(null);
    setClosingShiftId(shiftId);
    try {
      await api.closeShift(shiftId, shiftRemarks[shiftId] || '');
      setMsg('Shift closed successfully');
      setShiftRemarks((prev) => {
        const next = { ...prev };
        delete next[shiftId];
        return next;
      });
      loadData();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to close shift');
    } finally {
      setClosing(false);
      setClosingShiftId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text mb-4">Shift Closing</h2>

      {msg && (
        <div className={`notice-banner mb-3 ${msg.includes('successfully') ? 'success' : 'error'}`}>
          {msg}
        </div>
      )}

      {shiftStatuses.length === 0 ? (
        <div className="text-xs text-dragon-text-muted">No active shifts configured</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {shiftStatuses.map((status) => (
            <div key={status.shift_id} className="glass-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <CalendarCheck size={24} className={status.is_closed ? 'text-dragon-text-muted' : 'text-dragon-success'} />
                <div>
                  <div className="text-sm font-medium text-dragon-text">{status.shift_name}</div>
                  <div className="text-xs text-dragon-text-secondary">
                    Status: {status.is_closed ? 'Closed' : 'Open'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="text-dragon-text-secondary">Total Dips: <span className="font-mono text-dragon-text">{status.total_dips}</span></div>
                <div className="text-dragon-text-secondary">Pending Review: <span className="font-mono text-dragon-text">{status.pending_review}</span></div>
                <div className="text-dragon-text-secondary">Pending Approval: <span className="font-mono text-dragon-text">{status.pending_approval}</span></div>
                <div className="text-dragon-text-secondary">Exceptions: <span className="font-mono text-dragon-text">{status.exceptions}</span></div>
              </div>

              {!status.is_closed && (
                <div className="border-t border-dragon-border pt-3">
                  <textarea
                    value={shiftRemarks[status.shift_id] || ''}
                    onChange={(e) => setShiftRemarks((prev) => ({ ...prev, [status.shift_id]: e.target.value }))}
                    className="input-field resize-none"
                    rows={2}
                    placeholder="Closing remarks..."
                  />
                  <button
                    onClick={() => handleCloseShift(status.shift_id)}
                    disabled={closing}
                    className="mt-2 btn btn-primary"
                  >
                    {closing && closingShiftId === status.shift_id ? 'Closing...' : 'Close Shift'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Date</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Shift</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Total Dips</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Exceptions</th>
              <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Pending</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Status</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Closed At</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-dragon-text-muted">
                  No shift closing history
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id}>
                  <td className="px-3 py-2 text-dragon-text">{h.date}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{h.shift_id}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text">{h.total_dips}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text">{h.total_exceptions}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text">{h.pending_items}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      h.status === 'completed' ? 'bg-dragon-success/20 text-dragon-success' : 'bg-dragon-warning/20 text-dragon-warning'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{h.closed_at}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{h.closing_remarks || '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
