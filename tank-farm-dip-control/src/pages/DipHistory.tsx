import { useState, useEffect, useRef } from 'react';
import type { DipRecordWithRelations } from '../types';
import * as api from '../services/api';

export default function DipHistory() {
  const [records, setRecords] = useState<DipRecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const initialLoaded = useRef(false);

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.listDipRecords({ limit: 500 });
        setRecords(data);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFilter = async () => {
    setLoading(true);
    try {
      const data = await api.listDipRecords({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: 500,
      });
      setRecords(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <h2 className="text-xl font-bold text-dragon-text">Dip History</h2>

      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-dragon-text-secondary mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-dragon-text-secondary mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field"
          />
        </div>
        <button
          onClick={handleFilter}
          className="btn btn-primary"
        >
          Filter
        </button>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Record #</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Date</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Time</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Tank</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Product</th>
              <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Gross</th>
              <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Auto</th>
              <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Radar</th>
              <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Water</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Status</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Approval</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No records found</span></div></td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-mono text-dragon-text">{r.record_number}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{r.date}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{r.time}</td>
                  <td className="px-2 py-1 font-medium text-dragon-text">{r.tank_no}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{r.product_name}</td>
                  <td className="px-2 py-1 text-right font-mono text-dragon-text">{r.gross_dip_mm.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-2 py-1 text-right font-mono text-dragon-text-secondary">{r.water_dip_mm.toFixed(1)}</td>
                  <td className="px-2 py-1">
                    <span className={`badge ${
                      r.review_status === 'approved' ? 'badge-success' :
                      r.review_status === 'rejected' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {r.review_status}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <span className={`badge ${
                      r.approval_status === 'approved' ? 'badge-success' :
                      r.approval_status === 'rejected' ? 'badge-danger' :
                      ''
                    }`}>
                      {r.approval_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
