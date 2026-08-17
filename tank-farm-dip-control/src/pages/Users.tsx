import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../validation/schemas';
import type { User } from '../types';
import * as api from '../services/api';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import EntryLine from '../components/EntryLine';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const loadUsers = async () => {
    try { setUsers(await api.listUsers()); } catch { useToastStore.getState().addToast('Failed to load users', 'error'); } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true);
    setMsg(null);
    try {
      await api.createUser(data);
      setMsg('User created successfully');
      setShowForm(false);
      reset();
      loadUsers();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to create user');
      useToastStore.getState().addToast('Failed to create user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await api.toggleUserActive(userId);
      loadUsers();
    } catch {
      useToastStore.getState().addToast('Failed to toggle user active status', 'error');
    }
  };

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">User Management</h2>
        <button onClick={() => { reset({ username: '', full_name: '', password: '', role: 'Shift In-Charge' }); setShowForm(true); }} className="btn btn-primary flex items-center gap-1">
          <Plus size={14} /> Add User
        </button>
      </div>

      {msg && <div className="notice-banner info">{msg}</div>}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">New User</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <EntryLine
              columns={[
                {
                  label: 'Username', required: true, error: errors.username?.message, width: 'm',
                  children: <input {...register('username')} className="input-field entry-m" autoComplete="off" />,
                },
                {
                  label: 'Full Name', required: true, error: errors.full_name?.message, width: 'l',
                  children: <input {...register('full_name')} className="input-field entry-l" />,
                },
                {
                  label: 'Password', required: true, error: errors.password?.message, width: 'm',
                  children: <input type="password" {...register('password')} className="input-field entry-m" autoComplete="new-password" />,
                },
                {
                  label: 'Role', required: true, error: errors.role?.message, width: 'm',
                  children: (
                    <select {...register('role')} className="input-field entry-m">
                      <option value="Shift In-Charge">Shift In-Charge</option>
                      <option value="Shift Supervisor">Shift Supervisor</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  ),
                },
              ]}
            />
            <div className="flex gap-2 mt-4">
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</button>
              <button type="button" onClick={() => { setShowForm(false); }} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel rounded-xl overflow-hidden overflow-auto flex-1">
        <table className="data-table w-full text-xs">
          <thead className="sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Username</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Full Name</th>
              <th className="text-left px-2 py-1.5 font-medium text-dragon-text-secondary">Role</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-dragon-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="loading-state"><div className="loading-spinner" /><span>Loading...</span></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="empty-state"><span className="empty-state-text">No users found</span></div></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-dragon-border hover:bg-dragon-bg">
                  <td className="px-2 py-1 font-mono text-dragon-text">{u.username}</td>
                  <td className="px-2 py-1 font-medium text-dragon-text">{u.full_name}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{u.role}</td>
                  <td className="px-2 py-1 text-center">{u.active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <button onClick={() => handleToggleActive(u.id)} className={`p-1 rounded transition-colors ${u.active ? 'text-dragon-danger hover:text-dragon-danger/80' : 'text-dragon-success hover:text-dragon-success/80'}`}>
                      {u.active ? <UserX size={14} /> : <UserCheck size={14} />}
                    </button>
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
