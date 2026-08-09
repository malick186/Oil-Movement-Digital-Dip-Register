import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Exception } from '../types';
import { useToastStore } from '../store/toastStore';

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
      useToastStore.getState().addToast('Failed to load exceptions', 'error');
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
      useToastStore.getState().addToast('Failed to resolve exception', 'error');
    } finally {
      setResolving(false);
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
      <h2 className="text-xl font-bold text-dragon-text mb-4">Exceptions</h2>

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">ID</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Type</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Severity</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Actual</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Expected Tolerance</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Status</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Created</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Resolution</th>
              <th className="text-center px-3 py-2 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-dragon-text-muted">
                  No exceptions found
                </td>
              </tr>
            ) : (
              exceptions.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 font-mono text-dragon-text">{e.id}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.exception_type}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.severity === 'critical' ? 'bg-dragon-danger/20 text-dragon-danger' :
                      e.severity === 'warning' ? 'bg-dragon-warning/20 text-dragon-warning' :
                      'bg-dragon-primary/20 text-dragon-primary'
                    }`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.actual_value}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.expected_tolerance}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.status === 'resolved' ? 'bg-dragon-success/20 text-dragon-success' :
                      e.status === 'acknowledged' ? 'bg-dragon-primary/20 text-dragon-primary' :
                      'bg-dragon-danger/20 text-dragon-danger'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-dragon-text-muted">{e.created_at}</td>
                  <td className="px-3 py-2 text-dragon-text-muted max-w-[120px] truncate">{e.resolution || '--'}</td>
                  <td className="px-3 py-2 text-center">
                    {e.status !== 'resolved' && (
                      <button
                        onClick={() => setSelectedId(e.id)}
                        className="btn btn-primary btn-sm"
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
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Resolve Exception ${selectedId}`}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSelectedId(null); setResolution(''); } }}
        >
          <div className="glass-panel p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-dragon-text mb-3">Resolve Exception #{selectedId}</h3>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Enter resolution details..."
            />
            <div className="flex gap-2 justify-end mt-3">
              <button
                onClick={() => { setSelectedId(null); setResolution(''); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving || !resolution}
                className="btn btn-primary"
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
