import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tankStatusSchema, type TankStatusFormData } from '../validation/schemas';
import type { TankStatus } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';

export default function TankStatusMaster() {
  const [statuses, setStatuses] = useState<TankStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TankStatusFormData>({
    resolver: zodResolver(tankStatusSchema),
  });

  const load = async () => {
    try { setStatuses(await api.listTankStatuses()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: TankStatusFormData) => {
    try {
      if (editingId) { await api.updateTankStatus(editingId, data.name, data.display_order, data.allow_custom ? 1 : 0); setMsg('Status updated'); }
      else { await api.createTankStatus(data.name, data.display_order, data.allow_custom ? 1 : 0); setMsg('Status created'); }
      setShowForm(false); setEditingId(null); reset(); load();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Operation failed'); }
  };

  const handleEdit = (s: TankStatus) => {
    setEditingId(s.id);
    reset({ name: s.name, display_order: s.display_order, active: s.active, allow_custom: s.allow_custom });
    setShowForm(true);
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">Tank Status Master</h2>
        <button onClick={() => { setEditingId(null); reset({ name: '', display_order: 0, active: true, allow_custom: false }); setShowForm(true); }} className="btn btn-primary flex items-center gap-1">
          <Plus size={14} /> Add Status
        </button>
      </div>

      {msg && <div className="notice-banner info">{msg}</div>}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">{editingId ? 'Edit Status' : 'New Status'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Name <span className="text-dragon-danger">*</span></label>
                <input {...register('name')} className="input-field" />
                {errors.name && <p className="text-dragon-danger text-xs mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-dragon-text-secondary mb-1">Display Order</label>
                <input type="number" {...register('display_order', { valueAsNumber: true })} className="input-field" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary"><input type="checkbox" {...register('active')} /> Active</label>
                <label className="flex items-center gap-2 text-xs text-dragon-text-secondary"><input type="checkbox" {...register('allow_custom')} /> Allow Custom</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Order</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Name</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Allow Custom</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : statuses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No statuses found</span></div></td></tr>
            ) : (
              statuses.map((s) => (
                <tr key={s.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-mono text-dragon-text-secondary">{s.display_order}</td>
                  <td className="px-2 py-1 font-medium text-dragon-text">{s.name}</td>
                  <td className="px-2 py-1 text-center">{s.active ? <span className="badge badge-success">Yes</span> : <span className="badge badge-danger">No</span>}</td>
                  <td className="px-2 py-1 text-center">{s.allow_custom ? <span className="badge badge-info">Yes</span> : <span className="text-dragon-text-muted">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(s)} className="p-0.5 text-dragon-text-muted hover:text-dragon-primary"><Pencil size={13} /></button>
                      <button onClick={async () => { try { await api.deleteTankStatus(s.id); load(); } catch {} }} className="p-0.5 text-dragon-text-muted hover:text-dragon-danger"><Trash2 size={13} /></button>
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
