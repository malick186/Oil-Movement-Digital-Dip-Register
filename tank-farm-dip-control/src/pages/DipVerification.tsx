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
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">
        Dip Verification ({records.length} pending)
      </h2>

      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">
          {actionMsg}
        </div>
      )}

      {records.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <span className="text-sm text-slate-400">No records pending verification</span>
        </div>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Record #</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Date/Time</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Tank</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Product</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Gross</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Auto</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Radar</th>
                <th className="text-left px-3 py-2 font-medium text-slate-600">Operator</th>
                <th className="text-center px-3 py-2 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-slate-700">{r.record_number}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {r.date} {r.time}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-700">{r.tank_no}</td>
                  <td className="px-3 py-2 text-slate-500">{r.product_name}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-700">{r.gross_dip_mm.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-500">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-3 py-2 text-slate-500">{r.operator_name || '--'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'approve')}
                        className="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'reject')}
                        className="px-2 py-0.5 text-[10px] bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReview(r.id, 'recheck')}
                        className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors"
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
          <div className="bg-white rounded shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
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
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded"
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
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </>
  );
}
