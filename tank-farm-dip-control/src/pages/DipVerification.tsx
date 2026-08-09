import { useEffect, useState } from 'react';
import type { DipRecordWithRelations } from '../types';
import * as api from '../services/api';
import { useToastStore } from '../store/toastStore';
import { AlertTriangle, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

export default function DipVerification() {
  const [records, setRecords] = useState<DipRecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DipRecordWithRelations | null>(null);
  const [remarks, setRemarks] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      setRecords(await api.getPendingReviews());
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Failed to load pending reviews');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const openRecord = (record: DipRecordWithRelations) => {
    setSelectedRecord(record);
    setRemarks('');
    setMessage(null);
  };

  const handleReview = async (record: DipRecordWithRelations, action: 'approve' | 'reject' | 'recheck') => {
    if (action !== 'approve' && !remarks.trim()) {
      setMessage(`Review remarks are required when a record is ${action === 'reject' ? 'rejected' : 'sent for recheck'}.`);
      return;
    }
    setReviewingId(record.id);
    setMessage(null);
    try {
      await api.reviewDip(record.id, action, remarks.trim() || undefined);
      const actionText = action === 'approve'
        ? (record.review_status === 'recheck_pending' ? 'Recheck approved and original record superseded' : 'Dip Record finally approved')
        : action === 'reject'
          ? 'Dip Record rejected'
          : 'Physical recheck requested';
      useToastStore.getState().addToast(actionText, action === 'approve' ? 'success' : 'info');
      setSelectedRecord(null);
      setRemarks('');
      await loadRecords();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Review action failed');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Dip Verification</h2>
        <p className="text-xs text-dragon-text-muted mt-1">Shift In-Charge review of Manual Gross Dip against Auto Dip and Radar Dip.</p>
      </div>

      {message && <div className="notice-banner info">{message}</div>}

      {records.length === 0 ? (
        <div className="empty-state flex-1">
          <CheckCircle2 size={28} className="text-dragon-success mb-2" />
          <span className="empty-state-text">No Dip Records pending verification</span>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-auto flex-1">
          <table className="data-table w-full text-xs">
            <thead className="sticky top-0">
              <tr>
                <th className="text-left px-3 py-2">Record #</th>
                <th className="text-left px-3 py-2">Date / Time</th>
                <th className="text-left px-3 py-2">Tank</th>
                <th className="text-left px-3 py-2">Product</th>
                <th className="text-right px-3 py-2">Gross</th>
                <th className="text-right px-3 py-2">Auto</th>
                <th className="text-right px-3 py-2">Radar</th>
                <th className="text-right px-3 py-2">G-A</th>
                <th className="text-right px-3 py-2">G-R</th>
                <th className="text-left px-3 py-2">Operator</th>
                <th className="text-center px-3 py-2">Type</th>
                <th className="text-center px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-dragon-text">{r.record_number}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{r.date} {r.time}</td>
                  <td className="px-3 py-2 font-medium text-dragon-text">{r.tank_no}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{r.product_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(r.gross_dip_mm)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(r.auto_dip_mm)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(r.radar_dip_mm)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtDiff(r.gross_auto_difference)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtDiff(r.gross_radar_difference)}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{r.operator_name || '--'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`badge ${r.review_status === 'recheck_pending' ? 'badge-warning' : ''}`}>
                      {r.review_status === 'recheck_pending' ? 'Recheck' : 'Normal'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => openRecord(r)} className="btn btn-primary btn-sm">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Verify ${selectedRecord.record_number}`}
          onKeyDown={(e) => { if (e.key === 'Escape' && reviewingId == null) setSelectedRecord(null); }}
        >
          <div className="glass-panel p-6 w-full max-w-3xl max-h-[90vh] overflow-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-dragon-text">{selectedRecord.record_number}</h3>
                <p className="text-xs text-dragon-text-muted">{selectedRecord.tank_no} · {selectedRecord.product_name} · {selectedRecord.date} {selectedRecord.time}</p>
              </div>
              {selectedRecord.review_status === 'recheck_pending' && (
                <span className="badge badge-warning">Physical Recheck</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-dragon-text mb-3">Recorded Observation</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <InfoRow label="Reference Point" value={selectedRecord.reference_point_snapshot || '--'} />
                  <InfoRow label="Location" value={selectedRecord.location || '--'} />
                  <InfoRow label="Gross Dip" value={`${fmt(selectedRecord.gross_dip_mm)} mm`} />
                  <InfoRow label="Auto Dip" value={selectedRecord.auto_dip_mm == null ? 'N/A' : `${fmt(selectedRecord.auto_dip_mm)} mm`} />
                  <InfoRow label="Radar Dip" value={selectedRecord.radar_dip_mm == null ? 'N/A' : `${fmt(selectedRecord.radar_dip_mm)} mm`} />
                  <InfoRow label="Water Dip" value={`${fmt(selectedRecord.water_dip_mm)} mm`} />
                  <InfoRow label="Sludge Dip" value={`${fmt(selectedRecord.sludge_dip_mm)} mm`} />
                  <InfoRow label="Temperature" value={selectedRecord.temperature == null ? 'N/A' : `${selectedRecord.temperature} °${selectedRecord.temperature_unit}`} />
                  <InfoRow label="Density" value={selectedRecord.density?.toFixed(4) ?? 'N/A'} />
                  <InfoRow label="Tank Status" value={selectedRecord.custom_tank_status || selectedRecord.tank_status_name || '--'} />
                  <InfoRow label="Dip Performed By" value={selectedRecord.operator_name || '--'} />
                  <InfoRow label="Entered By" value={selectedRecord.entered_by_name || '--'} />
                </div>
                <div className="mt-3 pt-3 border-t border-dragon-border text-xs">
                  <span className="text-dragon-text-secondary">Remarks: </span>
                  <span className="text-dragon-text">{selectedRecord.remarks || '--'}</span>
                </div>
              </div>

              <div className="glass-card p-4">
                <h4 className="text-sm font-semibold text-dragon-text mb-3">Reconciliation</h4>
                <div className="space-y-3">
                  <Comparison label="Gross vs Auto" value={selectedRecord.gross_auto_difference} />
                  <Comparison label="Gross vs Radar" value={selectedRecord.gross_radar_difference} />
                  <Comparison label="Auto vs Radar" value={selectedRecord.auto_radar_difference} />
                </div>
                <div className="notice-banner warning mt-4 text-xs">
                  <AlertTriangle size={14} />
                  If a submitted reading has an open tolerance exception, approval requires a clear Shift In-Charge remark. The remark also becomes the exception resolution.
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Shift In-Charge Review Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Required for Recheck / Reject and for approval of tolerance exceptions..."
              />
            </div>

            {message && <div className="notice-banner error mt-3">{message}</div>}

            <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-dragon-border">
              <button onClick={() => setSelectedRecord(null)} disabled={reviewingId !== null} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleReview(selectedRecord, 'recheck')} disabled={reviewingId !== null} className="btn btn-secondary flex items-center gap-1.5">
                <RotateCcw size={14} /> Recheck Required
              </button>
              <button onClick={() => handleReview(selectedRecord, 'reject')} disabled={reviewingId !== null} className="btn btn-danger flex items-center gap-1.5">
                <XCircle size={14} /> Reject
              </button>
              <button onClick={() => handleReview(selectedRecord, 'approve')} disabled={reviewingId !== null} className="btn btn-primary flex items-center gap-1.5">
                <CheckCircle2 size={14} /> {selectedRecord.review_status === 'recheck_pending' ? 'Approve Recheck' : 'Final Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(value: number | null) {
  return value == null ? '--' : value.toFixed(1);
}

function fmtDiff(value: number | null) {
  if (value == null) return '--';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <><span className="text-dragon-text-secondary">{label}</span><span className="text-dragon-text font-medium text-right">{value}</span></>;
}

function Comparison({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-dragon-border p-3">
      <span className="text-xs text-dragon-text-secondary">{label}</span>
      <span className="font-mono text-sm font-semibold text-dragon-text">{fmtDiff(value)}{value == null ? '' : ' mm'}</span>
    </div>
  );
}
