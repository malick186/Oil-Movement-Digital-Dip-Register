import { useState, useEffect } from 'react';
import type { DipRecordWithRelations } from '../types';
import * as api from '../services/api';

export default function DipVerification() {
  const [records, setRecords] = useState<DipRecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DipRecordWithRelations | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingReviews();
      setRecords(data);
    } catch {
      setActionMsg('Failed to load pending reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleReview = async (id: number, action: string) => {
    try {
      await api.reviewDip(id, action);
      setActionMsg(`Record ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'marked for recheck'} successfully`);
      loadRecords();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Action failed');
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
      <h2 className="text-xl font-bold text-dragon-text mb-4">
        Dip Verification ({records.length} pending)
      </h2>

      {actionMsg && (
        <div className="notice-banner info mb-3">
          {actionMsg}
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-text">No records pending verification</span>
        </div>
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
          <table className="data-table w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Record #</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Date/Time</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Tank</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Product</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Gross</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Auto</th>
                <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Radar</th>
                <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Operator</th>
                <th className="text-center px-3 py-2 font-medium text-dragon-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-mono text-dragon-text">{r.record_number}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">
                    {r.date} {r.time}
                  </td>
                  <td className="px-3 py-2 font-medium text-dragon-text">{r.tank_no}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{r.product_name}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text">{r.gross_dip_mm.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-dragon-text-secondary">{r.operator_name || '--'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="btn btn-secondary btn-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'approve')}
                        className="btn btn-primary btn-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'reject')}
                        className="btn btn-danger btn-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'recheck')}
                        className="btn btn-secondary btn-sm"
                      >
                        Recheck
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label={`Record Details - ${selectedRecord.record_number}`}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedRecord(null); }}
        >
          <div className="glass-panel p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <h3 className="text-xl font-bold text-dragon-text mb-4">
              Record Details - {selectedRecord.record_number}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <InfoRow label="Tank" value={selectedRecord.tank_no} />
              <InfoRow label="Location" value={selectedRecord.location} />
              <InfoRow label="Product" value={selectedRecord.product_name} />
              <InfoRow label="Date" value={selectedRecord.date} />
              <InfoRow label="Time" value={selectedRecord.time} />
              <InfoRow label="Gross Dip" value={`${selectedRecord.gross_dip_mm.toFixed(1)} mm`} />
              <InfoRow label="Auto Dip" value={selectedRecord.auto_dip_mm != null ? `${selectedRecord.auto_dip_mm.toFixed(1)} mm` : 'N/A'} />
              <InfoRow label="Radar Dip" value={selectedRecord.radar_dip_mm != null ? `${selectedRecord.radar_dip_mm.toFixed(1)} mm` : 'N/A'} />
              <InfoRow label="Water Dip" value={`${selectedRecord.water_dip_mm.toFixed(1)} mm`} />
              <InfoRow label="Sludge Dip" value={`${selectedRecord.sludge_dip_mm.toFixed(1)} mm`} />
              <InfoRow label="Temperature" value={selectedRecord.temperature != null ? `${selectedRecord.temperature} ${selectedRecord.temperature_unit}` : 'N/A'} />
              <InfoRow label="Density" value={selectedRecord.density?.toFixed(4) ?? 'N/A'} />
              <InfoRow label="Status" value={selectedRecord.tank_status_name} />
              <InfoRow label="Operator" value={selectedRecord.operator_name || 'N/A'} />
              <InfoRow label="Remarks" value={selectedRecord.remarks || '--'} />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-dragon-text-secondary">{label}</span>
      <span className="text-dragon-text font-medium">{value}</span>
    </>
  );
}
