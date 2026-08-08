import { useState, useEffect, useRef } from 'react';
import * as api from '../services/api';
import type { AuditLog } from '../types';

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
      } catch {} finally {
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
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Audit Log</h2>

      <div className="flex gap-2 items-end mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">Action Filter</label>
          <input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
            placeholder="Filter by action..."
          />
        </div>
        <button onClick={handleFilter} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors">
          Filter
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Timestamp</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">User</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Role</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Action</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Tank</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Old Value</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">New Value</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">No audit logs found</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono text-slate-500">{l.timestamp}</td>
                  <td className="px-2 py-1 text-slate-600">{l.user_id ?? 'System'}</td>
                  <td className="px-2 py-1 text-slate-500">{l.role}</td>
                  <td className="px-2 py-1 text-slate-600">{l.action}</td>
                  <td className="px-2 py-1 text-slate-500">{l.tank_no || '--'}</td>
                  <td className="px-2 py-1 text-slate-500 max-w-[100px] truncate">{l.old_value || '--'}</td>
                  <td className="px-2 py-1 text-slate-500 max-w-[100px] truncate">{l.new_value || '--'}</td>
                  <td className="px-2 py-1 text-slate-500 max-w-[120px] truncate">{l.reason || '--'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
