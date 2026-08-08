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
    <div className="h-full flex flex-col">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Dip History</h2>

      <div className="flex gap-2 items-end mb-4">
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleFilter}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
        >
          Filter
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Record #</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Date</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Time</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Tank</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Product</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600">Gross</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600">Auto</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600">Radar</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600">Water</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Status</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Approval</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-400">Loading...</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-slate-400">No records found</td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono text-slate-700">{r.record_number}</td>
                  <td className="px-2 py-1 text-slate-500">{r.date}</td>
                  <td className="px-2 py-1 text-slate-500">{r.time}</td>
                  <td className="px-2 py-1 font-medium text-slate-700">{r.tank_no}</td>
                  <td className="px-2 py-1 text-slate-500">{r.product_name}</td>
                  <td className="px-2 py-1 text-right font-mono text-slate-700">{r.gross_dip_mm.toFixed(1)}</td>
                  <td className="px-2 py-1 text-right font-mono text-slate-500">{r.auto_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-2 py-1 text-right font-mono text-slate-500">{r.radar_dip_mm?.toFixed(1) ?? '--'}</td>
                  <td className="px-2 py-1 text-right font-mono text-slate-500">{r.water_dip_mm.toFixed(1)}</td>
                  <td className="px-2 py-1">
                    <span className={`px-1 py-0.5 rounded text-[10px] ${
                      r.review_status === 'approved' ? 'bg-green-100 text-green-700' :
                      r.review_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {r.review_status}
                    </span>
                  </td>
                  <td className="px-2 py-1">
                    <span className={`px-1 py-0.5 rounded text-[10px] ${
                      r.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                      r.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'
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
