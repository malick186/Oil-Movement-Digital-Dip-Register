import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { dipEntrySchema, type DipEntryFormData } from '../validation/schemas';
import type { Tank, Product, Operator, TankStatus, ShiftStatus } from '../types';
import * as api from '../services/api';

export default function NewDip() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [statuses, setStatuses] = useState<TankStatus[]>([]);
  const [activeShifts, setActiveShifts] = useState<ShiftStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      water_dip_mm: 0,
      sludge_dip_mm: 0,
      temperature_unit: 'C',
    },
  });

  const selectedTankId = watch('tank_id');

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
        setStatuses(s);
        const openShifts = shifts.filter((sh) => !sh.is_closed);
        setActiveShifts(openShifts);
        if (openShifts.length > 0) {
          setValue('shift_id', openShifts[0].shift_id);
        }
      } catch {
        setErrorMsg('Failed to load reference data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedTank = tanks.find((t) => t.id === Number(selectedTankId));

  const onSubmit = async (data: DipEntryFormData) => {
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 5);
      await api.createDipRecord({
        date: dateStr,
        time: timeStr,
        shift_id: Number(data.shift_id),
        tank_id: Number(data.tank_id),
        product_id: Number(data.product_id),
        gross_dip_mm: Number(data.gross_dip_mm),
        auto_dip_mm: data.auto_dip_mm != null ? Number(data.auto_dip_mm) : null,
        radar_dip_mm: data.radar_dip_mm != null ? Number(data.radar_dip_mm) : null,
        water_dip_mm: Number(data.water_dip_mm),
        sludge_dip_mm: Number(data.sludge_dip_mm),
        temperature: data.temperature != null ? Number(data.temperature) : null,
        temperature_unit: data.temperature_unit,
        density: data.density != null ? Number(data.density) : null,
        tank_status_id: data.tank_status_id != null ? Number(data.tank_status_id) : null,
        custom_tank_status: data.custom_tank_status,
        operator_id: Number(data.operator_id),
        remarks: data.remarks,
      });
      setSuccessMsg('Dip record created successfully');
      reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create dip record');
    } finally {
      setSubmitting(false);
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
    <div className="h-full flex flex-col anim-fade-up">
      <h2 className="text-xl font-bold text-dragon-text mb-4">New Dip Entry</h2>

      {successMsg && (
        <div className="notice-banner success mb-3">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="notice-banner error mb-3">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-4 overflow-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeShifts.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
                Shift <span className="text-red-500">*</span>
              </label>
              <select
                {...register('shift_id', { valueAsNumber: true })}
                className="input-field"
              >
                {activeShifts.map((sh) => (
                  <option key={sh.shift_id} value={sh.shift_id}>
                    {sh.shift_name}
                  </option>
                ))}
              </select>
              {errors.shift_id && (
                <p className="text-dragon-danger text-xs mt-1">{errors.shift_id.message}</p>
              )}
            </div>
          )}
          {activeShifts.length === 0 && (
            <div className="notice-banner warning">
              No active shifts. Please configure shifts in Shift Closing.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Tank <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tank_id', { valueAsNumber: true })}
              className="input-field"
            >
              <option value="">Select tank...</option>
              {tanks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tank_no} - {t.location}
                </option>
              ))}
            </select>
            {errors.tank_id && (
              <p className="text-dragon-danger text-xs mt-1">{errors.tank_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              {...register('product_id', { valueAsNumber: true })}
              className="input-field"
            >
              <option value="">Select product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            {errors.product_id && (
              <p className="text-dragon-danger text-xs mt-1">{errors.product_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Operator
            </label>
            <select
              {...register('operator_id', { valueAsNumber: true })}
              className="input-field"
            >
              <option value="">Select operator...</option>
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Gross Dip (mm) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.1"
              {...register('gross_dip_mm', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0"
            />
            {errors.gross_dip_mm && (
              <p className="text-dragon-danger text-xs mt-1">{errors.gross_dip_mm.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Auto Dip (mm)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('auto_dip_mm', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0"
              disabled={!selectedTank?.auto_dip_available}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Radar Dip (mm)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('radar_dip_mm', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0"
              disabled={!selectedTank?.radar_available}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Water Dip (mm)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('water_dip_mm', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Sludge Dip (mm)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('sludge_dip_mm', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Temperature
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                step="0.1"
                {...register('temperature', { valueAsNumber: true })}
                className="flex-1 input-field"
                placeholder="--"
              />
              <select
                {...register('temperature_unit')}
                className="input-field w-16"
              >
                <option value="C">C</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Density
            </label>
            <input
              type="number"
              step="0.0001"
              {...register('density', { valueAsNumber: true })}
              className="input-field"
              placeholder="0.0000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Tank Status
            </label>
            <select
              {...register('tank_status_id', { valueAsNumber: true })}
              className="input-field"
            >
              <option value="">Select status...</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
              Custom Status
            </label>
            <input
              {...register('custom_tank_status')}
              className="input-field"
              placeholder="Custom status..."
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Remarks</label>
          <textarea
            {...register('remarks')}
            className="input-field resize-none"
            rows={2}
            placeholder="Any remarks..."
          />
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'Saving...' : 'Save Dip Record'}
          </button>
        </div>
      </form>
    </div>
  );
}
