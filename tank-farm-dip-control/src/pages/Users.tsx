import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userSchema, type UserFormData } from '../validation/schemas';
import type { User } from '../types';
import * as api from '../services/api';
import { Plus, UserCheck, UserX } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const loadUsers = async () => {
    try { setUsers(await api.listUsers()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const onSubmit = async (data: UserFormData) => {
    try {
      await api.createUser(data);
      setMsg('User created successfully');
      setShowForm(false);
      reset();
      loadUsers();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleToggleActive = async (userId: number) => {
    try {
      await api.toggleUserActive(userId);
      loadUsers();
    } catch {}
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-700">User Management</h2>
        <button onClick={() => { reset({ username: '', full_name: '', password: '', role: 'Shift In-Charge' }); setShowForm(true); }} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded">
          <Plus size={14} /> Add User
        </button>
      </div>

      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs px-3 py-2 rounded mb-3">{msg}</div>}

      {showForm && (
        <div className="bg-white rounded border border-slate-200 p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">New User</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Username <span className="text-red-500">*</span></label>
                <input {...register('username')} className="input-field" autoComplete="off" />
                {errors.username && <p className="text-red-500 text-[10px] mt-0.5">{errors.username.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input {...register('full_name')} className="input-field" />
                {errors.full_name && <p className="text-red-500 text-[10px] mt-0.5">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" {...register('password')} className="input-field" autoComplete="new-password" />
                {errors.password && <p className="text-red-500 text-[10px] mt-0.5">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Role <span className="text-red-500">*</span></label>
                <select {...register('role')} className="input-field">
                  <option value="Shift In-Charge">Shift In-Charge</option>
                  <option value="Shift Supervisor">Shift Supervisor</option>
                  <option value="Administrator">Administrator</option>
                </select>
                {errors.role && <p className="text-red-500 text-[10px] mt-0.5">{errors.role.message}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded">Create User</button>
              <button type="button" onClick={() => { setShowForm(false); }} className="bg-slate-100 hover:bg-slate-200 text-xs px-3 py-1.5 rounded">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 overflow-auto flex-1">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Username</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Full Name</th>
              <th className="text-left px-2 py-1.5 font-medium text-slate-600">Role</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Active</th>
              <th className="text-center px-2 py-1.5 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-slate-400">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-2 py-1 font-mono text-slate-700">{u.username}</td>
                  <td className="px-2 py-1 font-medium text-slate-600">{u.full_name}</td>
                  <td className="px-2 py-1 text-slate-500">{u.role}</td>
                  <td className="px-2 py-1 text-center">{u.active ? <span className="text-green-600">Active</span> : <span className="text-red-500">Inactive</span>}</td>
                  <td className="px-2 py-1 text-center">
                    <button onClick={() => handleToggleActive(u.id)} className={`p-1 rounded transition-colors ${u.active ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600'}`}>
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
