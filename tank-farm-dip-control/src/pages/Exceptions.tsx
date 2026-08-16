import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { Exception } from '../types';
import { useToastStore } from '../store/toastStore';
import { AlertTriangle } from 'lucide-react';

/** Suggested reviewer action per exception type (spec §33). Mirrors the backend
 *  action_required helper in src-tauri/src/commands/exceptions.rs. */
function actionRequired(e: Exception): string {
  switch (e.exception_type) {
    case 'Gross vs Auto':
    case 'Gross vs Radar':
    case 'Auto vs Radar':
      return e.severity === 'critical'
        ? 'Re-measure and re-dip the Tank'
        : e.severity === 'warning'
          ? 'Review readings and confirm tolerance'
          : 'Monitor and confirm readings';
    case 'Missing Radar Dip': return 'Record Radar reading if gauge is available';
    case 'Missing Auto Dip': return 'Record Auto Dip reading if available';
    case 'Missing Gross Dip': return 'Record the physical Gross Dip';
    case 'Missing Temperature': return 'Record the observed temperature';
    case 'Missing Density': return 'Record the observed density';
    case 'Missing Operator': return 'Assign the Dip Performed By operator';
    case 'Missing Tank Status': return 'Select the Tank Status';
    case 'Unusual Water Dip': return 'Verify Water Dip against previous readings';
    case 'Unusual Sludge Dip': return 'Verify Sludge Dip against previous readings';
    case 'Gross Dip above Safe Fill Height': return 'Confirm Tank level; do not exceed Safe Fill Height';
    case 'Gross Dip below Minimum Operating Level': return 'Confirm Tank level against operating limit';
    case 'Water Dip above Reference Gauge Height': return 'Verify Water Dip reading';
    case 'Tank overdue for gauging': return 'Perform Tank gauging';
    case 'Dip not reviewed': return 'Review the Dip Record';
    case 'Recheck pending': return 'Complete the recheck';
    case 'Correction pending': return 'Approve or reject the correction';
    case 'Shift Closing pending': return 'Complete Shift Closing';
    default: return 'Review and resolve';
  }
}

export default function Exceptions() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const data = await api.listExceptions({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setExceptions(data);
    } catch {
      useToastStore.getState().addToast('Failed to load exceptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-dragon-warning" />
          <h2 className="text-xl font-bold text-dragon-text">Exception Control Center</h2>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-dragon-border p-0.5 text-xs">
          {(['open', 'resolved', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-dragon-primary/15 text-dragon-primary font-medium'
                  : 'text-dragon-text-muted hover:text-dragon-text'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Severity</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Product</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Date / Time</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Exception Type</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Actual Value</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Expected / Tolerance</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Action Required</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Status</th>
              <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Resolution</th>
              <th className="text-center px-3 py-2 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-dragon-text-muted">
                  No exceptions found
                </td>
              </tr>
            ) : (
              exceptions.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.severity === 'critical' ? 'bg-dragon-danger/20 text-dragon-danger' :
                      e.severity === 'warning' ? 'bg-dragon-warning/20 text-dragon-warning' :
                      'bg-dragon-primary/20 text-dragon-primary'
                    }`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-dragon-text">{e.tank_no || '--'}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.product_name || '--'}</td>
                  <td className="px-3 py-2 text-dragon-text-muted">
                    {e.date ? `${e.date}${e.time ? ` ${e.time}` : ''}` : '--'}
                  </td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.exception_type}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.actual_value || '--'}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{e.expected_tolerance || '--'}</td>
                  <td className="px-3 py-2 text-dragon-text-muted max-w-[200px]">{actionRequired(e)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      e.status === 'resolved' ? 'bg-dragon-success/20 text-dragon-success' :
                      e.status === 'acknowledged' ? 'bg-dragon-primary/20 text-dragon-primary' :
                      'bg-dragon-danger/20 text-dragon-danger'
                    }`}>
                      {e.status}
                    </span>
                  </td>
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
