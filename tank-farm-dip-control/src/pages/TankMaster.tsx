import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tankSchema, type TankFormData } from '../validation/schemas';
import type { Tank } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

export default function TankMaster() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
      useToastStore.getState().addToast('Failed to load tanks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTanks();
  }, []);

  const onSubmit = async (data: TankFormData) => {
    setSubmitting(true);
    setMsg(null);
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
      useToastStore.getState().addToast('Failed to save tank', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tank: Tank) => {
    setEditingId(tank.id);
    reset({
      tank_no: tank.tank_no,
      location: tank.location,
      current_product: tank.current_product,
      reference_point: tank.reference_point,
      tank_type: tank.tank_type,
      roof_type: tank.roof_type,
      safe_fill_height: tank.safe_fill_height,
      radar_available: !!tank.radar_available,
      auto_dip_available: !!tank.auto_dip_available,
      water_dip_applicable: !!tank.water_dip_applicable,
      sludge_dip_applicable: !!tank.sludge_dip_applicable,
      active: !!tank.active,
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
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">Tank Master</h2>
        <button
          onClick={handleCreate}
          className="btn btn-primary flex items-center gap-1"
        >
          <Plus size={14} />
          Add Tank
        </button>
      </div>

      {msg && (
        <div className="notice-banner info">
          {msg}
        </div>
      )}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">
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
              <Field label="Current Service" error={errors.current_product?.message}>
                <input {...register('current_product')} className="input-field" placeholder="e.g. Crude, HSFO, HSD" />
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
              <Field label="Remarks" error={errors.remarks?.message}>
                <input {...register('remarks')} className="input-field" />
              </Field>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary">
                  <input type="checkbox" {...register('radar_available')} />
                  Radar Available
                </label>
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary">
                  <input type="checkbox" {...register('auto_dip_available')} />
                  Auto Dip Available
                </label>
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary">
                  <input type="checkbox" {...register('water_dip_applicable')} />
                  Water Dip
                </label>
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary">
                  <input type="checkbox" {...register('sludge_dip_applicable')} />
                  Sludge Dip
                </label>
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary">
                  <input type="checkbox" {...register('active')} />
                  Active
                </label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingId ? 'Update Tank' : 'Create Tank')}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Tank No</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Location</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Service</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Type</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Roof</th>
              <th className="text-right px-2 py-1.5 font-medium text-dragon-text-secondary">Safe Fill</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Radar</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Auto</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : tanks.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No tanks found</span></div></td></tr>
            ) : (
              tanks.map((t) => (
                <tr key={t.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-medium text-dragon-text">{t.tank_no}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{t.location}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{t.current_product || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{t.tank_type || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{t.roof_type || '--'}</td>
                  <td className="px-2 py-1 text-right text-dragon-text-secondary">{t.safe_fill_height ?? '--'}</td>
                  <td className="px-2 py-1 text-center">{t.radar_available ? <span className="badge badge-success">Yes</span> : <span className="text-dragon-text-muted">No</span>}</td>
                  <td className="px-2 py-1 text-center">{t.auto_dip_available ? <span className="badge badge-success">Yes</span> : <span className="text-dragon-text-muted">No</span>}</td>
                  <td className="px-2 py-1 text-center">{t.active ? <span className="badge badge-success">Yes</span> : <span className="badge badge-danger">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(t)} className="p-0.5 text-dragon-text-muted hover:text-dragon-primary transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={async () => { if (!window.confirm('Are you sure you want to delete this tank?')) return; try { await api.deleteTank(t.id); loadTanks(); } catch { useToastStore.getState().addToast('Failed to delete tank', 'error'); } }} className="p-0.5 text-dragon-text-muted hover:text-dragon-danger transition-colors">
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
      <label className="block text-xs font-medium text-dragon-text-secondary mb-1">
        {label} {required && <span className="text-dragon-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-dragon-danger text-xs mt-0.5">{error}</p>}
    </div>
  );
}
