import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/schemas';
import { useAuthStore } from '../store/authStore';
import { APP_VERSION } from '../version';
import { Fuel, AlertCircle } from 'lucide-react';

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
    <div className="flex items-center justify-center h-screen bg-dragon-bg relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--dr-primary) 30%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="glass-card w-full max-w-md p-8 anim-scale-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-dragon-primary/10 flex items-center justify-center">
              <Fuel size={24} className="text-dragon-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-dragon-text tracking-wide">
            Tank Farm Control
          </h1>
          <p className="text-xs text-dragon-text-secondary mt-1.5">
            Oil Movement Digital Dip Register
          </p>
        </div>

        {error && (
          <div className="notice-banner error mb-6">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-dragon-danger/70 hover:text-dragon-danger transition-colors"
            >
              x
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
              Username
            </label>
            <input
              id="login-username"
              {...register('username')}
              className="input-field"
              placeholder="Enter username"
              autoFocus
            />
            {errors.username && (
              <p className="text-dragon-danger text-xs mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              {...register('password')}
              className="input-field"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-dragon-danger text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary w-full mt-2"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[10px] text-dragon-text-muted mt-6">
          v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
