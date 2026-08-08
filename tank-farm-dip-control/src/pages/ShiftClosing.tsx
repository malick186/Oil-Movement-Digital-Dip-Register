import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { ShiftClosing, ShiftStatus } from '../types';
import { CalendarCheck } from 'lucide-react';

export default function ShiftClosing() {
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [history, setHistory] = useState<ShiftClosing[]>([]);
  const [closing, setClosing] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, hist] = await Promise.all([
        api.getShiftStatus(),
        api.getShiftClosingHistory(),
      ]);
      setShiftStatus(status);
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

  const handleCloseShift = async () => {
    setClosing(true);
    setMsg(null);
    try {
      await api.closeShift(remarks);
      setMsg('Shift closed successfully');
      setRemarks('');
      loadData();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to close shift');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Shift Closing</h2>

      {msg && (
        <div className={`text-xs px-3 py-2 rounded mb-3 ${
          msg.includes('successfully') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {msg}
        </div>
      )}

      {shiftStatus && (
        <div className="bg-white rounded border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <CalendarCheck size={24} className={shiftStatus.is_open ? 'text-green-500' : 'text-slate-400'} />
            <div>
              <div className="text-sm font-medium text-slate-700">{shiftStatus.shift_name}</div>
              <div className="text-xs text-slate-500">
                Status: {shiftStatus.is_open ? 'Open' : 'Closed'}
                {shiftStatus.open_time && ` | Since: ${shiftStatus.open_time}`}
              </div>
            </div>
          </div>

          {shiftStatus.is_open && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                placeholder="Closing remarks..."
              />
              <button
                onClick={handleCloseShift}
                disabled={closing}
                className="mt-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
              >
                {closing ? 'Closing...' : 'Close Shift'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Shift</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">Total Dips</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">Exceptions</th>
              <th className="text-right px-3 py-2 font-medium text-slate-600">Pending</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Closed At</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-slate-400">
                  No shift closing history
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{h.date}</td>
                  <td className="px-3 py-2 text-slate-500">{h.shift_id}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{h.total_dips}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{h.total_exceptions}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{h.pending_items}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      h.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{h.closed_at}</td>
                  <td className="px-3 py-2 text-slate-500">{h.closing_remarks || '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
