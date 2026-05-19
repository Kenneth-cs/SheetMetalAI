import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-slate-900 border border-red-800 rounded-lg p-4">
          <div className="text-center">
            <div className="text-red-400 text-4xl mb-2">⚠️</div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">渲染出错</h3>
            <p className="text-xs text-slate-500 mb-3">
              {this.state.error?.message || '3D视图加载失败'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-3 py-1.5 bg-industrial-600 hover:bg-industrial-500 text-white text-xs rounded"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
