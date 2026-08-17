import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { operatorSchema, type OperatorFormData } from '../validation/schemas';
import type { Operator } from '../types';
import * as api from '../services/api';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import EntryLine from '../components/EntryLine';

export default function OperatorMaster() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
  });

  const loadOperators = async () => {
    try { setOperators(await api.listOperators()); } catch { useToastStore.getState().addToast('Failed to load operators', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { loadOperators(); }, []);

  const onSubmit = async (data: OperatorFormData) => {
    setSubmitting(true);
    setMsg(null);
    try {
      if (editingId) { await api.updateOperator(editingId, data); setMsg('Operator updated'); }
      else { await api.createOperator(data); setMsg('Operator created'); }
      setShowForm(false); setEditingId(null); reset(); loadOperators();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Operation failed');
      useToastStore.getState().addToast('Failed to save operator', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (o: Operator) => {
    setEditingId(o.id);
    reset({ employee_id: o.employee_id, name: o.name, designation: o.designation, location: o.location, shift_group: o.shift_group, active: !!o.active, remarks: o.remarks });
    setShowForm(true);
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">Operator Master</h2>
        <button onClick={() => { setEditingId(null); reset({ employee_id: '', name: '', designation: '', location: '', shift_group: '', active: true, remarks: '' }); setShowForm(true); }} className="btn btn-primary flex items-center gap-1">
          <Plus size={14} /> Add Operator
        </button>
      </div>

      {msg && <div className="notice-banner info">{msg}</div>}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">{editingId ? 'Edit Operator' : 'New Operator'}</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <EntryLine
              columns={[
                {
                  label: 'Employee ID', error: errors.employee_id?.message, width: 's',
                  children: <input {...register('employee_id')} className="input-field entry-s" placeholder="Optional" />,
                },
                {
                  label: 'Name', required: true, error: errors.name?.message, width: 'm',
                  children: <input {...register('name')} className="input-field entry-m" />,
                },
                {
                  label: 'Designation', error: errors.designation?.message, width: 'm',
                  children: <input {...register('designation')} className="input-field entry-m" />,
                },
                {
                  label: 'Location', error: errors.location?.message, width: 'm',
                  children: <input {...register('location')} className="input-field entry-m" />,
                },
                {
                  label: 'Shift Group', error: errors.shift_group?.message, width: 's',
                  children: <input {...register('shift_group')} className="input-field entry-s" />,
                },
                {
                  label: 'Remarks', error: errors.remarks?.message, width: 'm',
                  children: <input {...register('remarks')} className="input-field entry-m" />,
                },
                {
                  label: 'Active', width: 's',
                  children: <input type="checkbox" {...register('active')} className="entry-ck" />,
                },
              ]}
            />
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update Operator' : 'Create Operator')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Emp ID</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Name</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Designation</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Location</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Shift Group</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : operators.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No operators found</span></div></td></tr>
            ) : (
              operators.map((o) => (
                <tr key={o.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-mono text-dragon-text">{o.employee_id || '--'}</td>
                  <td className="px-2 py-1 font-medium text-dragon-text">{o.name}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{o.designation || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{o.location || '--'}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{o.shift_group || '--'}</td>
                  <td className="px-2 py-1 text-center">{o.active ? <span className="badge badge-success">Yes</span> : <span className="badge badge-danger">No</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(o)} className="p-0.5 text-dragon-text-muted hover:text-dragon-primary"><Pencil size={13} /></button>
                      <button onClick={async () => { if (!window.confirm('Are you sure you want to delete this operator?')) return; try { await api.deleteOperator(o.id); loadOperators(); } catch { useToastStore.getState().addToast('Failed to delete operator', 'error'); } }} className="p-0.5 text-dragon-text-muted hover:text-dragon-danger"><Trash2 size={13} /></button>
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
