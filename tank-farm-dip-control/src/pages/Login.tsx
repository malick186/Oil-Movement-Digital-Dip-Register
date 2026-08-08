import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/schemas';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitting(true);
    try {
      await login(data.username, data.password);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="w-full max-w-sm bg-slate-800 rounded-lg shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-white tracking-wide">
            TANK FARM CONTROL
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dip Recording Control Center
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-xs px-3 py-2 rounded mb-4 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-400 hover:text-red-200 ml-2">
              x
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="block text-xs text-slate-400 mb-1">Username</label>
            <input
              id="login-username"
              {...register('username')}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Enter username"
              autoFocus
            />
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              id="login-password"
              type="password"
              {...register('password')}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
