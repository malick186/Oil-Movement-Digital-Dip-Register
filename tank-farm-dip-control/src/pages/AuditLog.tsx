import { useState, useEffect, useRef } from 'react';
import * as api from '../services/api';
import type { AuditLog } from '../types';
import { useToastStore } from '../store/toastStore';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const initialLoaded = useRef(false);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getAuditLogs({ limit: 500 });
        setLogs(data);
      } catch {
        useToastStore.getState().addToast('Failed to load audit logs', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        action: actionFilter || undefined,
        limit: 500,
      });
      setLogs(data);
    } catch {
      useToastStore.getState().addToast('Failed to filter audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text">Audit Log</h2>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Action Filter</label>
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-field"
            placeholder="Filter by action..."
          />
        </div>
        <button onClick={handleFilter} className="btn btn-primary">
          Filter
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Timestamp</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">User</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Role</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Action</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Tank</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Old Value</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">New Value</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No audit logs found</span></div></td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-mono text-dragon-text-secondary">{l.timestamp}</td>
                  <td className="px-2 py-1 text-dragon-text">{l.user_id ?? 'System'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{l.role}</td>
                  <td className="px-2 py-1 text-dragon-text">{l.action}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{l.tank_no || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary max-w-[100px] truncate">{l.old_value || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary max-w-[100px] truncate">{l.new_value || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary max-w-[120px] truncate">{l.reason || '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
