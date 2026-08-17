import { Component, type ReactNode } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="bg-white rounded border border-red-200 p-8 max-w-md text-center shadow-sm">
            <h1 className="text-lg font-semibold text-red-700 mb-2">Application Error</h1>
            <p className="text-sm text-slate-600 mb-4">
              An unexpected error occurred. You can go back to the Dashboard or try again.
            </p>
            <pre className="text-xs text-left text-red-600 bg-red-50 rounded p-3 mb-4 overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  useAppStore.getState().setPage('dashboard');
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
              >
                Try Again
              </button>
              <button
                onClick={() => void useAuthStore.getState().logout()}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded hover:bg-slate-300"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
