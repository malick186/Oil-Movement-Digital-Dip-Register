import type { ReactNode } from 'react';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';

interface Props {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setPage = useAppStore((s) => s.setPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-700">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-1">
            You do not have permission to access this page. Required role:{' '}
            {allowedRoles.join(' / ')}.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={() => setPage('dashboard')}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => void logout()}
              className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
