import { useState, useEffect, useRef } from 'react';
import type { DipRecordWithRelations } from '../types';
import * as api from '../services/api';
import DragTable, { type ColumnDef } from '../components/DragTable';
import { useToastStore } from '../store/toastStore';

const columns: ColumnDef<DipRecordWithRelations>[] = [
  { key: 'record_number', label: 'Record #' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'tank_no', label: 'Tank' },
  { key: 'product_name', label: 'Product' },
  {
    key: 'gross_dip_mm',
    label: 'Gross',
    render: (r) => <span className="font-mono text-dragon-text">{r.gross_dip_mm.toFixed(1)}</span>,
  },
  {
    key: 'auto_dip_mm',
    label: 'Auto',
    render: (r) => <span className="font-mono text-dragon-text-secondary">{r.auto_dip_mm?.toFixed(1) ?? '--'}</span>,
  },
  {
    key: 'radar_dip_mm',
    label: 'Radar',
    render: (r) => <span className="font-mono text-dragon-text-secondary">{r.radar_dip_mm?.toFixed(1) ?? '--'}</span>,
  },
  {
    key: 'water_dip_mm',
    label: 'Water',
    render: (r) => <span className="font-mono text-dragon-text-secondary">{r.water_dip_mm.toFixed(1)}</span>,
  },
  {
    key: 'review_status',
    label: 'Status',
    render: (r) => (
      <span className={`badge ${
        r.review_status === 'approved' ? 'badge-success' :
        r.review_status === 'rejected' ? 'badge-danger' :
        'badge-warning'
      }`}>
        {r.review_status}
      </span>
    ),
  },
  {
    key: 'approval_status',
    label: 'Approval',
    render: (r) => (
      <span className={`badge ${
        r.approval_status === 'approved' ? 'badge-success' :
        r.approval_status === 'rejected' ? 'badge-danger' :
        ''
      }`}>
        {r.approval_status}
      </span>
    ),
  },
];

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
        useToastStore.getState().addToast('Failed to load dip history', 'error');
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
      useToastStore.getState().addToast('Failed to filter dip records', 'error');
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
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium text-dragon-text-secondary mb-1">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
        </div>
        <button onClick={handleFilter} className="btn btn-primary">Filter</button>
      </div>

      {loading ? (
        <div className="loading-state flex-1">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      ) : (
        <DragTable
          columns={columns}
          data={records}
          storageKey="dip-history"
          rowKey={(r) => r.id}
        />
      )}
    </div>
  );
}
