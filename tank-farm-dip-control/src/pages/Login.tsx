import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../validation/schemas';
import { useAuthStore } from '../store/authStore';
import { APP_VERSION } from '../version';
import * as api from '../services/api';
import { Fuel, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapRequired, setBootstrapRequired] = useState<boolean | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setup, setSetup] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    api.isBootstrapRequired()
      .then(setBootstrapRequired)
      .catch((err) => {
        setBootstrapRequired(false);
        setSetupError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setSubmitting(true);
    try {
      await login(data.username, data.password);
    } catch {
      setSubmitting(false);
    }
  };

  const handleBootstrap = async (event: React.FormEvent) => {
    event.preventDefault();
    setSetupError(null);
    if (!setup.username.trim() || !setup.fullName.trim()) {
      setSetupError('Username and full name are required');
      return;
    }
    if (setup.password.length < 8) {
      setSetupError('Password must be at least 8 characters');
      return;
    }
    if (setup.password !== setup.confirmPassword) {
      setSetupError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await bootstrap(setup.username.trim(), setup.fullName.trim(), setup.password);
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  if (bootstrapRequired === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-dragon-bg">
        <div className="loading-state">
          <div className="loading-spinner" />
          <span>Preparing local database...</span>
        </div>
      </div>
    );
  }

  const notice = setupError || error;

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
              {bootstrapRequired ? (
                <ShieldCheck size={24} className="text-dragon-primary" />
              ) : (
                <Fuel size={24} className="text-dragon-primary" />
              )}
            </div>
          </div>
          <h1 className="text-xl font-bold text-dragon-text tracking-wide">
            {bootstrapRequired ? 'First-Run Setup' : 'Tank Farm Control'}
          </h1>
          <p className="text-xs text-dragon-text-secondary mt-1.5">
            {bootstrapRequired
              ? 'Create the local Administrator account'
              : 'Oil Movement Digital Dip Register'}
          </p>
        </div>

        {notice && (
          <div className="notice-banner error mb-6">
            <AlertCircle size={16} />
            <span>{notice}</span>
            <button
              onClick={() => { clearError(); setSetupError(null); }}
              className="ml-auto text-dragon-danger/70 hover:text-dragon-danger transition-colors"
            >
              x
            </button>
          </div>
        )}

        {bootstrapRequired ? (
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div>
              <label htmlFor="setup-full-name" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
                Administrator Full Name
              </label>
              <input
                id="setup-full-name"
                value={setup.fullName}
                onChange={(e) => setSetup((s) => ({ ...s, fullName: e.target.value }))}
                className="input-field"
                placeholder="Enter full name"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="setup-username" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
                Username
              </label>
              <input
                id="setup-username"
                value={setup.username}
                onChange={(e) => setSetup((s) => ({ ...s, username: e.target.value }))}
                className="input-field"
                placeholder="Choose username"
              />
            </div>
            <div>
              <label htmlFor="setup-password" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
                Password
              </label>
              <input
                id="setup-password"
                type="password"
                value={setup.password}
                onChange={(e) => setSetup((s) => ({ ...s, password: e.target.value }))}
                className="input-field"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label htmlFor="setup-confirm" className="block text-xs text-dragon-text-secondary mb-1.5 font-medium">
                Confirm Password
              </label>
              <input
                id="setup-confirm"
                type="password"
                value={setup.confirmPassword}
                onChange={(e) => setSetup((s) => ({ ...s, confirmPassword: e.target.value }))}
                className="input-field"
                placeholder="Re-enter password"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-2">
              {submitting ? 'Creating Administrator...' : 'Complete First-Run Setup'}
            </button>
            <p className="text-[10px] text-dragon-text-muted leading-relaxed">
              This creates only a local Administrator account and minimum reference data. No credentials or operational data are sent outside this computer.
            </p>
          </form>
        ) : (
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

            <button type="submit" disabled={submitting} className="btn btn-primary w-full mt-2">
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="text-center text-[10px] text-dragon-text-muted mt-6">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
