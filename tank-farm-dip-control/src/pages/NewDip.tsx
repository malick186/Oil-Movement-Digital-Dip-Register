import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dipEntrySchema, type DipEntryFormData } from '../validation/schemas';
import type { DipRecordWithRelations, Operator, Product, ShiftStatus, Tank, TankStatus } from '../types';
import * as api from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useAppStore } from '../store/appStore';
import { AlertTriangle, CheckCircle2, FilePenLine, History, RotateCcw } from 'lucide-react';
import EntryLine, { type EntryColumn } from '../components/EntryLine';

function localDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function finite(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function diff(a: unknown, b: unknown): number | null {
  const left = finite(a);
  const right = finite(b);
  return left == null || right == null ? null : Math.round((left - right) * 1000) / 1000;
}

export default function NewDip() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [statuses, setStatuses] = useState<TankStatus[]>([]);
  const [activeShifts, setActiveShifts] = useState<ShiftStatus[]>([]);
  const [recheckRecords, setRecheckRecords] = useState<DipRecordWithRelations[]>([]);
  const [recheckTarget, setRecheckTarget] = useState<DipRecordWithRelations | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingRecordNumber, setEditingRecordNumber] = useState<string | null>(null);
  const [previousReadings, setPreviousReadings] = useState<DipRecordWithRelations[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const editDipRecordId = useAppStore((s) => s.editDipRecordId);
  const clearEditDip = useAppStore((s) => s.clearEditDip);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DipEntryFormData>({
    resolver: zodResolver(dipEntrySchema),
    defaultValues: {
      date: localDate(),
      time: localTime(),
      water_dip_mm: 0,
      sludge_dip_mm: 0,
      temperature_unit: 'C',
    },
  });

  const selectedTankId = watch('tank_id');
  const selectedStatusId = watch('tank_status_id');
  const gross = watch('gross_dip_mm');
  const auto = watch('auto_dip_mm');
  const radar = watch('radar_dip_mm');

  const selectedTank = tanks.find((t) => t.id === Number(selectedTankId));
  const selectedStatus = statuses.find((s) => s.id === Number(selectedStatusId));
  const grossAuto = diff(gross, auto);
  const grossRadar = diff(gross, radar);
  const autoRadar = diff(auto, radar);

  // Product Type is read from Tank Master Data (Current Service) — not typed here.
  const desiredProduct = (selectedTank?.current_product || selectedTank?.normal_product || '').trim();
  const matchedProduct = products.find(
    (p) => p.name.trim().toLowerCase() === desiredProduct.toLowerCase() ||
          (p.code?.trim().toLowerCase() ?? '') === desiredProduct.toLowerCase(),
  );

  const loadRechecks = async () => {
    try {
      setRecheckRecords(await api.listDipRecords({ review_status: 'recheck', limit: 100 }));
    } catch {
      setRecheckRecords([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [t, p, o, s, shifts] = await Promise.all([
          api.listActiveTanks(),
          api.listActiveProducts(),
          api.listActiveOperators(),
          api.listTankStatuses(),
          api.getShiftStatus(),
        ]);
        setTanks(t);
        setProducts(p);
        setOperators(o);
        setStatuses(s.filter((status) => Boolean(status.active)));
        const openShifts = shifts.filter((sh) => !sh.is_closed);
        setActiveShifts(openShifts);
        if (openShifts[0]) setValue('shift_id', openShifts[0].shift_id);

        // Draft edit mode: prefill the form from the selected draft record.
        if (editDipRecordId != null) {
          const draft = await api.getDipRecord(editDipRecordId);
          if (draft.record_status !== 'draft') {
            useToastStore.getState().addToast('Only draft Dip Records can be edited', 'error');
            clearEditDip();
          } else {
            setEditingId(draft.id);
            setEditingRecordNumber(draft.record_number);
            setValue('date', draft.date);
            setValue('time', draft.time);
            setValue('shift_id', draft.shift_id);
            setValue('tank_id', draft.tank_id);
            setValue('product_id', draft.product_id);
            setValue('gross_dip_mm', draft.gross_dip_mm ?? 0);
            setValue('auto_dip_mm', draft.auto_dip_mm ?? undefined);
            setValue('radar_dip_mm', draft.radar_dip_mm ?? undefined);
            setValue('water_dip_mm', draft.water_dip_mm ?? 0);
            setValue('sludge_dip_mm', draft.sludge_dip_mm ?? 0);
            setValue('temperature', draft.temperature ?? 0);
            setValue('temperature_unit', (draft.temperature_unit as 'C' | 'F') ?? 'C');
            setValue('density', draft.density ?? 0);
            setValue('tank_status_id', draft.tank_status_id ?? 0);
            setValue('custom_tank_status', draft.custom_tank_status ?? '');
            setValue('operator_id', draft.operator_id);
            setValue('remarks', draft.remarks ?? '');
            setMessage(`Editing draft ${draft.record_number}. Changes stay as a draft until submitted.`);
          }
        }
        await loadRechecks();
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err || 'Failed to load reference data');
        setMessage(text);
        useToastStore.getState().addToast('Failed to load Dip Entry reference data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [setValue, editDipRecordId, clearEditDip]);

  // Keep product_id in sync with the Tank Master's Current Service.
  useEffect(() => {
    if (!selectedTank || recheckTarget) return;
    const desired = (selectedTank.current_product || selectedTank.normal_product || '').trim().toLowerCase();
    const match = desired
      ? products.find((p) => p.name.trim().toLowerCase() === desired || (p.code?.trim().toLowerCase() ?? '') === desired)
      : undefined;
    setValue('product_id', match ? match.id : 0);
  }, [selectedTank, products, recheckTarget, setValue]);

  // Previous recordings for the selected Tank (shown at the bottom of the page).
  useEffect(() => {
    let cancelled = false;
    if (!selectedTankId) {
      setPreviousReadings([]);
      return;
    }
    setLoadingPrevious(true);
    api.listDipRecords({ tank_id: Number(selectedTankId), limit: 10, offset: 0 })
      .then((rows) => { if (!cancelled) setPreviousReadings(rows); })
      .catch(() => { if (!cancelled) setPreviousReadings([]); })
      .finally(() => { if (!cancelled) setLoadingPrevious(false); });
    return () => { cancelled = true; };
  }, [selectedTankId]);

  const startRecheck = (record: DipRecordWithRelations) => {
    setRecheckTarget(record);
    setValue('tank_id', record.tank_id, { shouldValidate: true });
    setValue('product_id', record.product_id, { shouldValidate: true });
    setValue('shift_id', record.shift_id, { shouldValidate: true });
    setValue('date', localDate(), { shouldValidate: true });
    setValue('time', localTime(), { shouldValidate: true });
    setMessage(`Recording physical recheck for ${record.record_number} / ${record.tank_no}`);
  };

  const clearRecheck = () => {
    setRecheckTarget(null);
    setValue('date', localDate());
    setValue('time', localTime());
    setMessage(null);
  };

  const resetEntry = () => {
    const firstShift = activeShifts[0]?.shift_id;
    reset({
      date: localDate(),
      time: localTime(),
      shift_id: firstShift,
      water_dip_mm: 0,
      sludge_dip_mm: 0,
      temperature_unit: 'C',
    });
    setRecheckTarget(null);
    setEditingId(null);
    setEditingRecordNumber(null);
    clearEditDip();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingRecordNumber(null);
    clearEditDip();
    resetEntry();
    setMessage(null);
  };

  const save = async (data: DipEntryFormData, submitForReview: boolean) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const tank = tanks.find((t) => t.id === Number(data.tank_id));
      const status = statuses.find((s) => s.id === Number(data.tank_status_id));
      if (!tank) throw new Error('Selected Tank is not available');
      if (!tank.reference_point?.trim()) throw new Error('Reference Point is missing in Tank Master');
      if (tank.auto_dip_available && finite(data.auto_dip_mm) == null) throw new Error('Auto Dip is required for this Tank');
      if (tank.radar_available && finite(data.radar_dip_mm) == null) throw new Error('Radar Dip is required for this Tank');
      if (status?.allow_custom && !data.custom_tank_status?.trim()) throw new Error('Custom Tank Status details are required');

      const duplicate = editingId == null
        ? await api.checkDuplicateDip(Number(data.tank_id), data.date, data.time, Number(data.shift_id))
        : '';
      if (duplicate && !window.confirm(`${duplicate}\n\nContinue anyway?`)) {
        setSubmitting(false);
        return;
      }

      const payload: api.CreateDipPayload = {
        date: data.date,
        time: data.time,
        shift_id: Number(data.shift_id),
        tank_id: Number(data.tank_id),
        product_id: Number(data.product_id),
        reference_point_snapshot: tank.reference_point,
        gross_dip_mm: Number(data.gross_dip_mm),
        auto_dip_mm: tank.auto_dip_available ? Number(data.auto_dip_mm) : null,
        radar_dip_mm: tank.radar_available ? Number(data.radar_dip_mm) : null,
        water_dip_mm: Number(data.water_dip_mm),
        sludge_dip_mm: Number(data.sludge_dip_mm),
        temperature: Number(data.temperature),
        temperature_unit: data.temperature_unit,
        density: Number(data.density),
        tank_status_id: Number(data.tank_status_id),
        custom_tank_status: status?.allow_custom ? data.custom_tank_status?.trim() : undefined,
        operator_id: Number(data.operator_id),
        remarks: data.remarks?.trim(),
      };

      if (recheckTarget) {
        await api.recheckDip(recheckTarget.id, payload, payload.operator_id, payload.remarks);
        setMessage(`Recheck for ${recheckTarget.record_number} recorded and submitted for final verification.`);
      } else if (editingId != null) {
        const record = await api.updateDipRecord(editingId, payload);
        if (submitForReview) {
          await api.submitDipRecord(record.id);
          setMessage(`${record.record_number} updated and submitted to Shift In-Charge.`);
        } else {
          setMessage(`${record.record_number} draft updated.`);
        }
      } else {
        const record = await api.createDipRecord(payload);
        if (submitForReview) {
          await api.submitDipRecord(record.id);
          setMessage(`${record.record_number} saved and submitted to Shift In-Charge.`);
        } else {
          setMessage(`${record.record_number} saved as Draft.`);
        }
      }

      useToastStore.getState().addToast(
        recheckTarget ? 'Recheck submitted'
          : editingId != null ? (submitForReview ? 'Dip updated and submitted' : 'Draft updated')
          : (submitForReview ? 'Dip submitted for verification' : 'Dip saved as draft'),
        'success');
      resetEntry();
      await loadRechecks();
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err || 'Failed to save Dip Record');
      setMessage(text);
      useToastStore.getState().addToast(text, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const comparisonRows = useMemo(() => [
    ['Gross vs Auto', grossAuto],
    ['Gross vs Radar', grossRadar],
    ['Auto vs Radar', autoRadar],
  ] as const, [grossAuto, grossRadar, autoRadar]);

  if (loading) {
    return <div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  return (
    <div className="h-full flex flex-col gap-4 anim-fade-up">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-dragon-text">New Dip Entry</h2>
          <p className="text-xs text-dragon-text-muted mt-1">Record the physical observation, then submit it for Shift In-Charge verification.</p>
        </div>
        {editingId != null && (
          <button type="button" onClick={cancelEdit} className="btn btn-secondary flex items-center gap-1.5">
            <RotateCcw size={14} /> Cancel Edit
          </button>
        )}
        {recheckTarget && (
          <button type="button" onClick={clearRecheck} className="btn btn-secondary flex items-center gap-1.5">
            <RotateCcw size={14} /> Cancel Recheck
          </button>
        )}
      </div>

      {recheckRecords.length > 0 && !recheckTarget && (
        <div className="glass-panel p-4 border border-dragon-warning/40">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-dragon-warning" />
            <h3 className="text-sm font-semibold text-dragon-text">Physical Recheck Required</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {recheckRecords.map((r) => (
              <button key={r.id} type="button" onClick={() => startRecheck(r)} className="btn btn-secondary btn-sm">
                {r.tank_no} · {r.record_number} · {r.date} {r.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {recheckTarget && (
        <div className="notice-banner warning">
          Recheck mode: original record <strong>{recheckTarget.record_number}</strong>, Tank <strong>{recheckTarget.tank_no}</strong>. The original reading will remain preserved.
        </div>
      )}
      {editingId != null && (
        <div className="notice-banner info flex items-start gap-2">
          <FilePenLine size={13} className="mt-0.5 flex-none" />
          <span>
            Editing draft <strong>{editingRecordNumber}</strong>. Draft corrections do not require Shift In-Charge approval — submit when the observation is complete.
          </span>
        </div>
      )}
      {message && <div className="notice-banner info">{message}</div>}

      <form className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 flex-1 min-h-0">
        <div className="glass-card p-4 overflow-auto">
          <EntryLine
            columns={[
              {
                label: 'Date', required: true, error: errors.date?.message, width: 'date',
                children: <input type="date" {...register('date')} className="input-field entry-date" />,
              },
              {
                label: 'Time', required: true, error: errors.time?.message, width: 's',
                children: <input type="time" step="60" {...register('time')} className="input-field entry-s" />,
              },
              {
                label: 'Shift', required: true, error: errors.shift_id?.message, width: 's',
                children: (
                  <select {...register('shift_id', { valueAsNumber: true })} className="input-field entry-s" disabled={Boolean(recheckTarget)}>
                    <option value="">Select shift...</option>
                    {activeShifts.map((sh) => <option key={sh.shift_id} value={sh.shift_id}>{sh.shift_name}</option>)}
                  </select>
                ),
              },
              {
                label: 'Tank No.', required: true, error: errors.tank_id?.message, width: 's',
                children: (
                  <select {...register('tank_id', { valueAsNumber: true })} className="input-field entry-s" disabled={Boolean(recheckTarget)}>
                    <option value="">Select tank...</option>
                    {tanks.map((t) => <option key={t.id} value={t.id}>{t.tank_no} - {t.location}</option>)}
                  </select>
                ),
              },
              {
                label: 'Product Type', required: true, error: errors.product_id?.message, width: 'm',
                children: (
                  <div className={`input-field entry-ro ${matchedProduct ? 'text-dragon-text' : desiredProduct ? 'text-dragon-danger' : 'text-dragon-text-muted'}`}>
                    {matchedProduct
                      ? `${matchedProduct.name}${matchedProduct.code ? ` (${matchedProduct.code})` : ''}`
                      : desiredProduct
                        ? `No matching Product in Master for "${desiredProduct}"`
                        : 'Set Current Service in Tank Master'}
                  </div>
                ),
              },
              {
                label: 'Ref Point', width: 's',
                children: (
                  <div className={`input-field entry-ro ${selectedTank?.reference_point ? 'text-dragon-text' : 'text-dragon-danger'}`}>
                    {selectedTank?.reference_point || 'Not configured in Tank Master'}
                  </div>
                ),
              },
              {
                label: 'Gross Dip (mm)', required: true, error: errors.gross_dip_mm?.message, width: 'num',
                children: <input type="number" step="0.1" {...register('gross_dip_mm', { valueAsNumber: true })} className="input-field entry-num" />,
              },
              {
                label: `Auto Dip (mm)${selectedTank?.auto_dip_available ? ' *' : ''}`, error: errors.auto_dip_mm?.message, width: 'num',
                children: <input type="number" step="0.1" {...register('auto_dip_mm', { valueAsNumber: true })} className="input-field entry-num" disabled={!selectedTank?.auto_dip_available} placeholder={selectedTank?.auto_dip_available ? '' : 'N/A'} />,
              },
              {
                label: `Radar Dip (mm)${selectedTank?.radar_available ? ' *' : ''}`, error: errors.radar_dip_mm?.message, width: 'num',
                children: <input type="number" step="0.1" {...register('radar_dip_mm', { valueAsNumber: true })} className="input-field entry-num" disabled={!selectedTank?.radar_available} placeholder={selectedTank?.radar_available ? '' : 'N/A'} />,
              },
              {
                label: 'Water Dip (mm)', required: true, error: errors.water_dip_mm?.message, width: 'num',
                children: <input type="number" step="0.1" {...register('water_dip_mm', { valueAsNumber: true })} className="input-field entry-num" />,
              },
              {
                label: 'Sludge Dip (mm)', required: true, error: errors.sludge_dip_mm?.message, width: 'num',
                children: <input type="number" step="0.1" {...register('sludge_dip_mm', { valueAsNumber: true })} className="input-field entry-num" />,
              },
              {
                label: 'Temperature', required: true, error: errors.temperature?.message, width: 's',
                children: (
                  <div className="temp-cell">
                    <input type="number" step="0.1" {...register('temperature', { valueAsNumber: true })} className="input-field" />
                    <select {...register('temperature_unit')} className="input-field">
                      <option value="C">°C</option>
                      <option value="F">°F</option>
                    </select>
                  </div>
                ),
              },
              {
                label: 'Density', required: true, error: errors.density?.message, width: 'num',
                children: <input type="number" step="0.0001" {...register('density', { valueAsNumber: true })} className="input-field entry-num" />,
              },
              {
                label: 'Tank Status', required: true, error: errors.tank_status_id?.message, width: 'm',
                children: (
                  <select {...register('tank_status_id', { valueAsNumber: true })} className="input-field entry-m">
                    <option value="">Select status...</option>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ),
              },
              ...(selectedStatus?.allow_custom ? ([{
                label: 'Custom Status', required: true, error: errors.custom_tank_status?.message, width: 'm',
                children: <input {...register('custom_tank_status')} className="input-field entry-m" placeholder="Enter custom Tank status" />,
              }] as EntryColumn[]) : []),
              {
                label: 'Dip Performed By', required: true, error: errors.operator_id?.message, width: 'm',
                children: (
                  <select {...register('operator_id', { valueAsNumber: true })} className="input-field entry-m">
                    <option value="">Select operator...</option>
                    {operators.map((o) => <option key={o.id} value={o.id}>{o.name}{o.employee_id ? ` (${o.employee_id})` : ''}</option>)}
                  </select>
                ),
              },
              {
                label: 'Remarks', width: 'm',
                children: <input {...register('remarks')} className="input-field entry-m" placeholder="Operational observation..." />,
              },
            ]}
          />

          <div className="flex flex-wrap gap-2 pt-2 border-t border-dragon-border">
            {!recheckTarget && (
              <button type="button" disabled={submitting} onClick={handleSubmit((data) => save(data, false))} className="btn btn-secondary">
                {submitting ? 'Saving...' : 'Save Draft'}
              </button>
            )}
            <button type="button" disabled={submitting || activeShifts.length === 0} onClick={handleSubmit((data) => save(data, true))} className="btn btn-primary">
              {submitting ? 'Saving...' : recheckTarget ? 'Record & Submit Recheck' : 'Save & Submit for Verification'}
            </button>
          </div>
        </div>

        <aside className="space-y-3 overflow-auto">
          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-dragon-text mb-3">Tank Reference</h3>
            {selectedTank ? (
              <div className="space-y-2 text-xs">
                <Info label="Tank" value={selectedTank.tank_no} />
                <Info label="Location" value={selectedTank.location || '--'} />
                <Info label="Reference Point" value={selectedTank.reference_point || 'MISSING'} danger={!selectedTank.reference_point} />
                <Info label="Auto Dip" value={selectedTank.auto_dip_available ? 'Available' : 'N/A'} />
                <Info label="Radar" value={selectedTank.radar_available ? 'Available' : 'N/A'} />
                <Info label="Safe Fill" value={selectedTank.safe_fill_height != null ? `${selectedTank.safe_fill_height} mm` : '--'} />
              </div>
            ) : <p className="text-xs text-dragon-text-muted">Select a Tank to view Master Data.</p>}
          </div>

          <div className="glass-panel p-4">
            <h3 className="text-sm font-semibold text-dragon-text mb-3">Dip Comparison</h3>
            <div className="space-y-2 text-xs">
              <Info label="Gross Dip" value={finite(gross) != null ? `${finite(gross)?.toFixed(1)} mm` : '--'} />
              <Info label="Auto Dip" value={finite(auto) != null ? `${finite(auto)?.toFixed(1)} mm` : '--'} />
              <Info label="Radar Dip" value={finite(radar) != null ? `${finite(radar)?.toFixed(1)} mm` : '--'} />
              <div className="border-t border-dragon-border my-2" />
              {comparisonRows.map(([label, value]) => <Info key={label} label={label} value={value == null ? '--' : `${value > 0 ? '+' : ''}${value.toFixed(1)} mm`} />)}
            </div>
            <div className="mt-3 flex items-start gap-2 text-[10px] text-dragon-text-muted">
              <CheckCircle2 size={13} className="mt-0.5 flex-none" />
              Approved Tank/Product/Location tolerances are evaluated by the backend when the record is submitted.
            </div>
          </div>
        </aside>
      </form>

      {/* Previous recordings for the selected Tank */}
      {selectedTankId ? (
        <div className="glass-panel rounded-xl overflow-auto">
          <div className="flex items-center gap-3 px-5 pt-4 pb-2">
            <div className="w-8 h-8 rounded-lg bg-dragon-primary/10 flex items-center justify-center">
              <History size={15} className="text-dragon-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-dragon-text">
                Previous Recordings — {selectedTank?.tank_no}
              </h3>
              <p className="text-xs text-dragon-text-muted mt-0.5">Latest 10 Dip Records for this Tank</p>
            </div>
          </div>
          {loadingPrevious ? (
            <div className="loading-state py-6"><div className="loading-spinner" /></div>
          ) : previousReadings.length === 0 ? (
            <p className="px-5 pb-5 text-xs text-dragon-text-muted">No previous recordings for this Tank.</p>
          ) : (
            <table className="data-table w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Date</th>
                  <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Time</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Gross Dip</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Auto Dip</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Radar Dip</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Water</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Sludge</th>
                  <th className="text-right px-3 py-2 font-medium text-dragon-text-secondary">Temp</th>
                  <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Status</th>
                  <th className="text-left px-3 py-2 font-medium text-dragon-text-secondary">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {previousReadings.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-dragon-text">{r.date}</td>
                    <td className="px-3 py-2 text-dragon-text-secondary">{r.time}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text">{fmtNum(r.gross_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmtNum(r.auto_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmtNum(r.radar_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmtNum(r.water_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">{fmtNum(r.sludge_dip_mm)}</td>
                    <td className="px-3 py-2 text-right font-mono text-dragon-text-secondary">
                      {r.temperature != null ? `${r.temperature}${r.temperature_unit ?? ''}` : '--'}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.record_status === 'approved' ? 'bg-dragon-success/20 text-dragon-success' :
                        r.record_status === 'rejected' ? 'bg-dragon-danger/20 text-dragon-danger' :
                        'bg-dragon-warning/20 text-dragon-warning'
                      }`}>{r.record_status}</span>
                    </td>
                    <td className="px-3 py-2 text-dragon-text-secondary">{r.operator_name || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

function fmtNum(value: number | null | undefined): string {
  return value == null ? '--' : value.toFixed(1);
}

function Info({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-dragon-text-secondary">{label}</span>
      <span className={`font-mono text-right ${danger ? 'text-dragon-danger' : 'text-dragon-text'}`}>{value}</span>
    </div>
  );
}
