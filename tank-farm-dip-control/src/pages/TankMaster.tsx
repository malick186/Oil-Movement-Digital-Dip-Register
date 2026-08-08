import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tankSchema, type TankFormData } from '../validation/schemas';
import type { Tank } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function TankMaster() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TankFormData>({
    resolver: zodResolver(tankSchema),
  });

  const loadTanks = async () => {
    try {
      const data = await api.listTanks();
      setTanks(data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTanks();
  }, []);

  const onSubmit = async (data: TankFormData) => {
    try {
      if (editingId) {
        await api.updateTank(editingId, data);
        setMsg('Tank updated');
      } else {
        await api.createTank(data);
        setMsg('Tank created');
      }
      setShowForm(false);
      setEditingId(null);
      reset();
      loadTanks();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const handleEdit = (tank: Tank) => {
    setEditingId(tank.id);
    reset({
      tank_no: tank.tank_no,
      location: tank.location,
      tank_farm: tank.tank_farm,
      normal_product: tank.normal_product,
      current_product: tank.current_product,
      reference_point: tank.reference_point,
      tank_type: tank.tank_type,
      roof_type: tank.roof_type,
      safe_fill_height: tank.safe_fill_height,
      min_operating_level: tank.min_operating_level,
      ref_gauge_height: tank.ref_gauge_height,
      datum_height: tank.datum_height,
      working_capacity: tank.working_capacity,
      radar_available: tank.radar_available,
      auto_dip_available: tank.auto_dip_available,
      water_dip_applicable: tank.water_dip_applicable,
      sludge_dip_applicable: tank.sludge_dip_applicable,
      active: tank.active,
      remarks: tank.remarks,
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    reset({
      radar_available: false,
      auto_dip_available: false,
      water_dip_applicable: false,
      sludge_dip_applicable: false,
      active: true,
    });
    setShowForm(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">Tank Master</h2>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded transition-colors"
        >
          <Plus size={14} />
          Add Tank
        </button>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">
          {msg}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded border border-slate-200 p-4 mb-4 overflow-auto">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            {editingId ? 'Edit Tank' : 'New Tank'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Tank No" required error={errors.tank_no?.message}>
                <input {...register('tank_no')} className="input-field" />
              </Field>
              <Field label="Location" required error={errors.location?.message}>
                <input {...register('location')} className="input-field" />
              </Field>
              <Field label="Tank Farm" required error={errors.tank_farm?.message}>
                <input {...register('tank_farm')} className="input-field" />
              </Field>
              <Field label="Normal Product" error={errors.normal_product?.message}>
                <input {...register('normal_product')} className="input-field" />
              </Field>
              <Field label="Current Product" error={errors.current_product?.message}>
                <input {...register('current_product')} className="input-field" />
              </Field>
              <Field label="Reference Point" error={errors.reference_point?.message}>
                <input {...register('reference_point')} className="input-field" />
              </Field>
              <Field label="Tank Type" error={errors.tank_type?.message}>
                <input {...register('tank_type')} className="input-field" />
              </Field>
              <Field label="Roof Type" error={errors.roof_type?.message}>
                <input {...register('roof_type')} className="input-field" />
              </Field>
              <Field label="Safe Fill Height" error={errors.safe_fill_height?.message}>
                <input type="number" step="0.1" {...register('safe_fill_height', { valueAsNumber: true })} className="input-field" />
              </Field>
              <Field label="Min Operating Level" error={errors.min_operating_level?.message}>
                <input type="number" step="0.1" {...register('min_operating_level', { valueAsNumber: true })} className="input-field" />
              </Field>
              <Field label="Ref Gauge Height" error={errors.ref_gauge_height?.message}>
                <input type="number" step="0.1" {...register('ref_gauge_height', { valueAsNumber: true })} className="input-field" />
              </Field>
              <Field label="Datum Height" error={errors.datum_height?.message}>
                <input type="number" step="0.1" {...register('datum_height', { valueAsNumber: true })} className="input-field" />
              </Field>
              <Field label="Working Capacity" error={errors.working_capacity?.message}>
                <input type="number" step="0.1" {...register('working_capacity', { valueAsNumber: true })} className="input-field" />
              </Field>
              <Field label="Remarks" error={errors.remarks?.message}>
                <input {...register('remarks')} className="input-field" />
              </Field>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('radar_available')} />
                  Radar Available
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('auto_dip_available')} />
                  Auto Dip Available
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('water_dip_applicable')} />
                  Water Dip
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('sludge_dip_applicable')} />
                  Sludge Dip
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" {...register('active')} />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded">
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="bg-slate-100 hover:bg-slate-200 text-xs px-3 py-1.5 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Tank No</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Location</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Farm</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Product</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Type</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Roof</th>
              <th className="text-right px-2 py-1.5 font-medium text-slate-600">Safe Fill</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Radar</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Auto</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : tanks.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-slate-400">No tanks found</td></tr>
            ) : (
              tanks.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-medium text-slate-700">{t.tank_no}</td>
                  <td className="px-2 py-1 text-slate-500">{t.location}</td>
                  <td className="px-2 py-1 text-slate-500">{t.tank_farm}</td>
                  <td className="px-2 py-1 text-slate-500">{t.current_product || t.normal_product || '--'}</td>
                  <td className="px-2 py-1 text-slate-500">{t.tank_type || '--'}</td>
                  <td className="px-2 py-1 text-slate-500">{t.roof_type || '--'}</td>
                  <td className="px-2 py-1 text-right text-slate-500">{t.safe_fill_height ?? '--'}</td>
                  <td className="px-2 py-1 text-center">{t.radar_available ? <span className="text-green-600">Yes</span> : <span className="text-slate-300">No</span>}</td>
                  <td className="px-2 py-1 text-center">{t.auto_dip_available ? <span className="text-green-600">Yes</span> : <span className="text-slate-300">No</span>}</td>
                  <td className="px-2 py-1 text-center">{t.active ? <span className="text-green-600">Yes</span> : <span className="text-red-500">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(t)} className="p-0.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={async () => { try { await api.deleteTank(t.id); loadTanks(); } catch {} }} className="p-0.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
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

function Field({ label, required, error, children }: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-[10px] mt-0.5">{error}</p>}
    </div>
  );
}
