import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../validation/schemas';
import type { User } from '../types';
import * as api from '../services/api';
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { useToastStore } from '../store/toastStore';
import { useAuthStore } from '../store/authStore';
import EntryLine from '../components/EntryLine';

const ROLE_OPTIONS = ['Shift In-Charge', 'Shift Supervisor', 'Administrator'];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Edit-form state (password is optional on edit, so it is not part of the create schema)
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('Shift In-Charge');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const currentUser = useAuthStore((s) => s.user);

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

  const handleCreate = () => {
    setEditingUser(null);
    setEditError(null);
    reset({ username: '', full_name: '', password: '', role: 'Shift In-Charge' });
    setShowForm(true);
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditFullName(u.full_name);
    setEditRole(u.role);
    setEditActive(Boolean(u.active));
    setEditPassword('');
    setEditError(null);
    setShowForm(true);
  };

  const submitEdit = async () => {
    if (!editingUser) return;
    if (!editUsername.trim() || !editFullName.trim()) {
      setEditError('Username and Full Name are required');
      return;
    }
    if (editPassword && editPassword.length < 8) {
      setEditError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    setEditError(null);
    setMsg(null);
    try {
      await api.updateUser(editingUser.id, {
        username: editUsername.trim(),
        full_name: editFullName.trim(),
        role: editRole,
        active: editActive,
        password: editPassword || undefined,
      });
      setMsg('User details updated');
      setShowForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to update user';
      setEditError(text);
      setMsg(text);
      useToastStore.getState().addToast('Failed to update user', 'error');
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

  const handleRemove = async (u: User) => {
    if (!window.confirm(`Remove user "${u.username}" (${u.full_name})? This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      setMsg(`User ${u.username} removed`);
      loadUsers();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Failed to remove user';
      setMsg(text);
      useToastStore.getState().addToast('Failed to remove user', 'error');
    }
  };

  const isSelf = (u: User) => currentUser?.user_id === u.id;

  return (
    <div className="space-y-4 anim-fade-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-dragon-text">User Management</h2>
        <button onClick={handleCreate} className="btn btn-primary flex items-center gap-1">
          <Plus size={14} /> Add User
        </button>
      </div>

      {msg && <div className="notice-banner info">{msg}</div>}

      {showForm && (
        <div className="glass-panel p-4">
          <h3 className="text-lg font-bold text-dragon-text mb-3">
            {editingUser ? `Edit User — ${editingUser.username}` : 'New User'}
          </h3>
          {editingUser ? (
            <>
              <EntryLine
                columns={[
                  {
                    label: 'Username', required: true, error: editError && !editUsername.trim() ? 'Username is required' : undefined, width: 'm',
                    children: <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="input-field entry-m" autoComplete="off" />,
                  },
                  {
                    label: 'Full Name', required: true, error: editError && !editFullName.trim() ? 'Full Name is required' : undefined, width: 'l',
                    children: <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="input-field entry-l" />,
                  },
                  {
                    label: 'Role', required: true, width: 'm',
                    children: (
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="input-field entry-m">
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ),
                  },
                  {
                    label: 'Active', width: 's',
                    children: <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} className="entry-ck" />,
                  },
                  {
                    label: 'New Password (optional)', width: 'm',
                    children: <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="input-field entry-m" placeholder="Leave blank to keep current" autoComplete="new-password" />,
                  },
                ]}
              />
              {editError && <p className="text-dragon-danger text-xs mt-2">{editError}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={submitEdit} disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingUser(null); setEditError(null); }} className="btn btn-secondary">Cancel</button>
              </div>
            </>
          ) : (
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
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
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
          )}
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
                  <td className="px-2 py-1 font-mono text-dragon-text">{u.username}{isSelf(u) && <span className="ml-1 text-[10px] text-dragon-text-muted">(you)</span>}</td>
                  <td className="px-2 py-1 font-medium text-dragon-text">{u.full_name}</td>
                  <td className="px-2 py-1 text-dragon-text-secondary">{u.role}</td>
                  <td className="px-2 py-1 text-center">{u.active ? <span className="badge badge-success">Active</span> : <span className="badge badge-danger">Inactive</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(u)} title="Edit details" className="p-0.5 text-dragon-text-muted hover:text-dragon-primary transition-colors">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleToggleActive(u.id)} title={u.active ? 'Deactivate' : 'Activate'} className={`p-0.5 rounded transition-colors ${u.active ? 'text-dragon-text-muted hover:text-dragon-warning' : 'text-dragon-success hover:text-dragon-success/80'}`}>
                        {u.active ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      <button
                        onClick={() => handleRemove(u)}
                        disabled={isSelf(u)}
                        title={isSelf(u) ? 'You cannot remove your own account' : 'Remove user'}
                        className="p-0.5 text-dragon-text-muted hover:text-dragon-danger transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
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
