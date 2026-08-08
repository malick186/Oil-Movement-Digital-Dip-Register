import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Exception } from '../types';

export default function Exceptions() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const data = await api.listExceptions();
      setExceptions(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, []);

  const handleResolve = async () => {
    if (!selectedId || !resolution) return;
    setResolving(true);
    try {
      await api.resolveException(selectedId, resolution);
      setResolution('');
      setSelectedId(null);
      loadExceptions();
    } catch {
      // fail silently
    } finally {
      setResolving(false);
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
      <h2 className="text-base font-semibold text-slate-700 mb-4">Exceptions</h2>

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-slate-600">ID</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Type</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Severity</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Actual</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Expected Tolerance</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Status</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Created</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Resolution</th>
              <th className="text-center px-3 py-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-400">
                  No exceptions found
                </td>
              </tr>
            ) : (
              exceptions.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-700">{e.id}</td>
                  <td className="px-3 py-2 text-slate-600">{e.exception_type}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      e.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{e.actual_value}</td>
                  <td className="px-3 py-2 text-slate-600">{e.expected_tolerance}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      e.status === 'acknowledged' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{e.created_at}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{e.resolution || '--'}</td>
                  <td className="px-3 py-2 text-center">
                    {e.status !== 'resolved' && (
                      <button
                        onClick={() => setSelectedId(e.id)}
                        className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId != null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-xl p-6 w-full max-w-md">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Resolve Exception #{selectedId}</h3>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Enter resolution details..."
            />
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => { setSelectedId(null); setResolution(''); }}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving || !resolution}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-3 py-1 rounded"
              >
                {resolving ? 'Saving...' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
