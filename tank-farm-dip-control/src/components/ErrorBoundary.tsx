import { Component, type ReactNode } from 'react';

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
              An unexpected error occurred. Please restart the application.
            </p>
            <pre className="text-xs text-left text-red-600 bg-red-50 rounded p-3 mb-4 overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
