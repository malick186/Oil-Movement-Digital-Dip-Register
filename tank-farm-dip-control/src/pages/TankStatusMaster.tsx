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
      if (editingId) { await api.updateTankStatus(editingId, data); setMsg('Status updated'); }
      else { await api.createTankStatus(data); setMsg('Status created'); }
      setShowForm(false); setEditingId(null); reset(); load();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Operation failed'); }
  };

  const handleEdit = (s: TankStatus) => {
    setEditingId(s.id);
    reset({ name: s.name, display_order: s.display_order, active: s.active, allow_custom: s.allow_custom });
    setShowForm(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">Tank Status Master</h2>
        <button onClick={() => { setEditingId(null); reset({ name: '', display_order: 0, active: true, allow_custom: false }); setShowForm(true); }} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">
          <Plus size={14} /> Add Status
        </button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">{msg}</div>}

      {showForm && (
        <div className="bg-white rounded border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">{editingId ? 'Edit Status' : 'New Status'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
                <input {...register('name')} className="input-field" />
                {errors.name && <p className="text-red-500 text-[10px] mt-0.5">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Display Order</label>
                <input type="number" {...register('display_order', { valueAsNumber: true })} className="input-field" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" {...register('active')} /> Active</label>
                <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" {...register('allow_custom')} /> Allow Custom</label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="bg-slate-100 hover:bg-slate-200 text-xs px-3 py-1.5 rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Order</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Name</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Allow Custom</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : statuses.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No statuses found</td></tr>
            ) : (
              statuses.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono text-slate-500">{s.display_order}</td>
                  <td className="px-2 py-1 font-medium text-slate-600">{s.name}</td>
                  <td className="px-2 py-1 text-center">{s.active ? <span className="text-green-600">Yes</span> : <span className="text-red-500">No</span>}</td>
                  <td className="px-2 py-1 text-center">{s.allow_custom ? <span className="text-blue-600">Yes</span> : <span className="text-slate-300">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(s)} className="p-0.5 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                      <button onClick={async () => { try { await api.deleteTankStatus(s.id); load(); } catch {} }} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
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
