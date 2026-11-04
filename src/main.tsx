import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App runtime boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndRecover = () => {
    try {
      localStorage.removeItem('albuainain_tree_families_v8');
      localStorage.removeItem('albuainain_tree_submissions_v8');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 font-tajawal" dir="rtl">
          <div className="max-w-lg w-full bg-[#0F1A30] border border-[#C5A059]/40 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#0F3D3E] border border-[#C5A059] flex items-center justify-center mx-auto text-[#E5C384] text-2xl font-bold shadow-lg">
              ع
            </div>
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">مشروع توثيق شجرة نسب آل بوعينين</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                حدث استثناء مؤقت أثناء استرجاع الواجهة. يمكنك الضغط على زر إعادة التحميل أو استعادة الذاكرة النظيفة.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#987836] text-[#0A0F1D] text-xs font-bold shadow-md hover:brightness-110 transition cursor-pointer"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                type="button"
                onClick={this.handleResetAndRecover}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 text-xs font-semibold transition cursor-pointer"
              >
                استعادة الذاكرة النظيفة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
