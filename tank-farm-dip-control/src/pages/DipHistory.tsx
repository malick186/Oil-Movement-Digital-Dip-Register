import { useEffect, useMemo, useRef, useState } from 'react';
import type { DipCorrection, DipRecordWithRelations, Operator, Product, TankStatus } from '../types';
import * as api from '../services/api';
import DragTable, { type ColumnDef } from '../components/DragTable';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import { CheckCircle2, FilePenLine } from 'lucide-react';

const correctionFields = [
  ['gross_dip_mm', 'Gross Dip (mm)'],
  ['auto_dip_mm', 'Auto Dip (mm)'],
  ['radar_dip_mm', 'Radar Dip (mm)'],
  ['water_dip_mm', 'Water Dip (mm)'],
  ['sludge_dip_mm', 'Sludge Dip (mm)'],
  ['temperature', 'Temperature'],
  ['temperature_unit', 'Temperature Unit'],
  ['density', 'Density'],
  ['operator_id', 'Dip Performed By'],
  ['product_id', 'Product'],
  ['tank_status_id', 'Tank Status'],
  ['remarks', 'Remarks'],
  ['custom_tank_status', 'Custom Tank Status'],
] as const;

export default function DipHistory() {
  const user = useAuthStore((s) => s.user);
  const [records, setRecords] = useState<DipRecordWithRelations[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<TankStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<DipRecordWithRelations | null>(null);
  const [corrections, setCorrections] = useState<DipCorrection[]>([]);
  const [correctionField, setCorrectionField] = useState<string>('gross_dip_mm');
  const [correctionValue, setCorrectionValue] = useState('');
  const [reason, setReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const initialLoaded = useRef(false);

  const loadRecords = async (withFilters = false) => {
    setLoading(true);
    try {
      const data = await api.listDipRecords({
        date_from: withFilters && dateFrom ? dateFrom : undefined,
        date_to: withFilters && dateTo ? dateTo : undefined,
        limit: 500,
      });
      setRecords(data);
    } catch (err) {
      useToastStore.getState().addToast(err instanceof Error ? err.message : 'Failed to load Dip History', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialLoaded.current) return;
    initialLoaded.current = true;
    (async () => {
      await Promise.all([
        loadRecords(false),
        api.listActiveOperators().then(setOperators).catch(() => undefined),
        api.listActiveProducts().then(setProducts).catch(() => undefined),
        api.listTankStatuses().then((rows) => setStatuses(rows.filter((r) => Boolean(r.active)))).catch(() => undefined),
      ]);
    })();
  }, []);

  const openRecord = async (record: DipRecordWithRelations) => {
    setSelected(record);
    setCorrectionField('gross_dip_mm');
    setCorrectionValue('');
    setReason('');
    setMessage(null);
    try {
      setCorrections(await api.listDipCorrections(record.id));
    } catch {
      setCorrections([]);
    }
  };

  const currentValue = (record: DipRecordWithRelations, field: string): string => {
    const value = (record as unknown as Record<string, unknown>)[field];
    return value == null ? '' : String(value);
  };

  const requestCorrection = async () => {
    if (!selected) return;
    if (!correctionValue.trim() && correctionField !== 'remarks' && correctionField !== 'custom_tank_status') {
      setMessage('Enter the corrected value.');
      return;
    }
    if (!reason.trim()) {
      setMessage('Correction reason is mandatory.');
      return;
    }
    setActionBusy(true);
    try {
      await api.requestCorrection(
        selected.id,
        [{ field_name: correctionField, old_value: currentValue(selected, correctionField), new_value: correctionValue }],
        reason.trim(),
      );
      setMessage('Correction request submitted for Shift In-Charge approval.');
      setCorrections(await api.listDipCorrections(selected.id));
      await loadRecords(Boolean(dateFrom || dateTo));
      useToastStore.getState().addToast('Correction request submitted', 'success');
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Correction request failed');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const approveCorrection = async (correctionId: number) => {
    if (!selected) return;
    if (!window.confirm('Approve this correction and apply the revised value to the controlled Dip Record?')) return;
    setActionBusy(true);
    try {
      await api.approveCorrection(correctionId);
      setCorrections(await api.listDipCorrections(selected.id));
      await loadRecords(Boolean(dateFrom || dateTo));
      setMessage('Correction approved. When all pending corrections are cleared, the Dip Record is re-approved automatically.');
      useToastStore.getState().addToast('Correction approved', 'success');
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Correction approval failed');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const columns = useMemo<ColumnDef<DipRecordWithRelations>[]>(() => [
    { key: 'record_number', label: 'Record #' },
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'tank_no', label: 'Tank' },
    { key: 'product_name', label: 'Product' },
    { key: 'gross_dip_mm', label: 'Gross', render: (r) => <span className="font-mono">{r.gross_dip_mm?.toFixed(1) ?? '--'}</span> },
    { key: 'auto_dip_mm', label: 'Auto', render: (r) => <span className="font-mono">{r.auto_dip_mm?.toFixed(1) ?? '--'}</span> },
    { key: 'radar_dip_mm', label: 'Radar', render: (r) => <span className="font-mono">{r.radar_dip_mm?.toFixed(1) ?? '--'}</span> },
    { key: 'water_dip_mm', label: 'Water', render: (r) => <span className="font-mono">{r.water_dip_mm?.toFixed(1) ?? '--'}</span> },
    {
      key: 'review_status', label: 'Review', render: (r) => (
        <span className={`badge ${r.review_status === 'approved' ? 'badge-success' : r.review_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.review_status}</span>
      ),
    },
    {
      key: 'approval_status', label: 'Approval', render: (r) => (
        <span className={`badge ${r.approval_status === 'approved' ? 'badge-success' : r.approval_status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>{r.approval_status}</span>
      ),
    },
    {
      key: 'actions', label: 'Action', render: (r) => <button onClick={() => openRecord(r)} className="btn btn-secondary btn-sm">Details</button>,
    },
  ], []);

  const mayRequest = user?.role === 'Shift Supervisor' || user?.role === 'Administrator';
  const mayApprove = user?.role === 'Shift In-Charge' || user?.role === 'Administrator';

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div>
        <h2 className="text-xl font-bold text-dragon-text">Dip History</h2>
        <p className="text-xs text-dragon-text-muted mt-1">Approved records are immutable; changes use the controlled correction and re-approval workflow.</p>
      </div>

      <div className="flex gap-2 items-end flex-wrap">
        <div><label className="block text-xs font-medium text-dragon-text-secondary mb-1">From</label><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" /></div>
        <div><label className="block text-xs font-medium text-dragon-text-secondary mb-1">To</label><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" /></div>
        <button onClick={() => loadRecords(true)} className="btn btn-primary">Filter</button>
      </div>

      {loading ? (
        <div className="loading-state flex-1"><div className="loading-spinner" /><span>Loading...</span></div>
      ) : (
        <DragTable columns={columns} data={records} storageKey="dip-history" rowKey={(r) => r.id} />
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-auto p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-dragon-text">{selected.record_number}</h3>
                <p className="text-xs text-dragon-text-muted">{selected.tank_no} · {selected.product_name} · {selected.date} {selected.time}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Summary label="Reference Point" value={selected.reference_point_snapshot || '--'} />
              <Summary label="Gross / Auto / Radar" value={`${selected.gross_dip_mm ?? '--'} / ${selected.auto_dip_mm ?? '--'} / ${selected.radar_dip_mm ?? '--'} mm`} />
              <Summary label="Status" value={`${selected.record_status} / ${selected.approval_status}`} />
            </div>

            <div className="glass-card p-4 mb-4">
              <h4 className="text-sm font-semibold text-dragon-text mb-3">Correction History</h4>
              {corrections.length === 0 ? (
                <p className="text-xs text-dragon-text-muted">No correction requests for this record.</p>
              ) : (
                <div className="overflow-auto">
                  <table className="data-table w-full text-xs">
                    <thead><tr><th>Field</th><th>Old</th><th>New</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {corrections.map((c) => (
                        <tr key={c.id}>
                          <td className="px-2 py-1 font-mono">{c.field_name}</td>
                          <td className="px-2 py-1 font-mono">{c.old_value ?? '--'}</td>
                          <td className="px-2 py-1 font-mono">{c.new_value}</td>
                          <td className="px-2 py-1">{c.reason || '--'}</td>
                          <td className="px-2 py-1"><span className={c.status === 'approved' ? 'badge badge-success' : 'badge badge-warning'}>{c.status}</span></td>
                          <td className="px-2 py-1">
                            {mayApprove && c.status === 'pending' ? (
                              <button disabled={actionBusy} onClick={() => approveCorrection(c.id)} className="btn btn-primary btn-sm flex items-center gap-1"><CheckCircle2 size={12} /> Approve</button>
                            ) : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {mayRequest && selected.record_status === 'approved' && selected.approval_status === 'approved' && (
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3"><FilePenLine size={15} className="text-dragon-primary" /><h4 className="text-sm font-semibold text-dragon-text">Request Correction</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-dragon-text-secondary mb-1">Field</label>
                    <select value={correctionField} onChange={(e) => { setCorrectionField(e.target.value); setCorrectionValue(''); }} className="input-field">
                      {correctionFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-dragon-text-secondary mb-1">Current Value</label>
                    <div className="input-field font-mono">{currentValue(selected, correctionField) || '--'}</div>
                  </div>
                  <div>
                    <label className="block text-xs text-dragon-text-secondary mb-1">Corrected Value</label>
                    <CorrectionInput field={correctionField} value={correctionValue} setValue={setCorrectionValue} operators={operators} products={products} statuses={statuses} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-dragon-text-secondary mb-1">Reason for Correction *</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input-field resize-none" rows={2} placeholder="Explain why the approved record requires correction..." />
                </div>
                <button onClick={requestCorrection} disabled={actionBusy} className="btn btn-primary mt-3">Submit Correction Request</button>
              </div>
            )}

            {message && <div className="notice-banner info mt-4">{message}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CorrectionInput({ field, value, setValue, operators, products, statuses }: { field: string; value: string; setValue: (value: string) => void; operators: Operator[]; products: Product[]; statuses: TankStatus[] }) {
  if (field === 'temperature_unit') {
    return <select value={value} onChange={(e) => setValue(e.target.value)} className="input-field"><option value="">Select...</option><option value="C">°C</option><option value="F">°F</option></select>;
  }
  if (field === 'operator_id') {
    return <select value={value} onChange={(e) => setValue(e.target.value)} className="input-field"><option value="">Select...</option>{operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>;
  }
  if (field === 'product_id') {
    return <select value={value} onChange={(e) => setValue(e.target.value)} className="input-field"><option value="">Select...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>;
  }
  if (field === 'tank_status_id') {
    return <select value={value} onChange={(e) => setValue(e.target.value)} className="input-field"><option value="">Select...</option>{statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>;
  }
  const textField = field === 'remarks' || field === 'custom_tank_status';
  return <input type={textField ? 'text' : 'number'} step={field === 'density' ? '0.0001' : '0.1'} value={value} onChange={(e) => setValue(e.target.value)} className="input-field" />;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-dragon-border p-3"><div className="text-[10px] text-dragon-text-muted mb-1">{label}</div><div className="text-xs text-dragon-text font-medium">{value}</div></div>;
}
