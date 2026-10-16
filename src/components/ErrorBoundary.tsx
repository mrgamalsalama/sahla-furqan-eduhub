import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  uiLang?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const isAr = this.props.uiLang === 'ar';
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-200 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-black text-slate-900">
              {isAr ? 'حدث خطأ غير متوقع في هذه الصفحة' : 'An Unexpected Error Occurred'}
            </h2>

            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'تم حصر الخطأ بنجاح للحفاظ على بياناتك. يمكنك العودة للشاشة الرئيسية أو إعادة المحاولة.'
                : 'The error was safely caught to protect your data. You can return home or try again.'}
            </p>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-md transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isAr ? 'إعادة المحاولة' : 'Try Again'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (typeof window !== 'undefined') {
                    window.location.hash = '';
                    window.location.reload();
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                <Home className="w-4 h-4" />
                <span>{isAr ? 'الرئيسية' : 'Dashboard'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
