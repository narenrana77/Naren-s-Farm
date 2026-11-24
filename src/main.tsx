import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any stale dev-mode service workers that could cache outdated module chunks
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        if (reg.active?.scriptURL?.includes('dev-sw') || window.location.hostname === 'localhost') {
          reg.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});
}

// Two-Tier Client-Side Quota & Auth Defense for Google Maps Platform
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  window.dispatchEvent(new CustomEvent('gmp-project-error'));
};

const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  try {
    const message = args
      .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ');
    if (
      message.includes('OverQuotaMapError') ||
      message.includes('QuotaExceededError') ||
      message.includes('ApiProjectMapError') ||
      message.includes('ApiNotActivatedMapError') ||
      message.includes('InvalidKeyMapError') ||
      message.includes('RefererNotAllowedMapError') ||
      message.includes('BillingNotEnabledMapError') ||
      message.includes('MissingKeyMapError')
    ) {
      if (message.includes('OverQuotaMapError') || message.includes('QuotaExceededError')) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
      window.dispatchEvent(new CustomEvent('gmp-project-error'));
    }
  } catch {
    // ignore console serialization errors
  }
  originalConsoleError.apply(console, args);
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMsg: error?.message || 'Unexpected error occurred',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('AppErrorBoundary caught an error:', error, errorInfo);
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMsg: '' });
    window.location.reload();
  };

  handleResetDataAndRecover = () => {
    try {
      localStorage.removeItem('naren_farm_tracker_store_v1');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, errorMsg: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-emerald-500/30 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl">
              🚜
            </div>
            <h1 className="text-xl font-black text-white">
              Naren&apos;s Farm Tracker — ऑटो रिकवरी
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              ऐप को सुरक्षित मोड में रीलोड करने के लिए नीचे बटन दबाएं। आपका डेटा सुरक्षित है।
            </p>
            {this.state.errorMsg && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-[11px] font-mono text-amber-300 break-words">
                {this.state.errorMsg}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRecover}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer transition-all"
              >
                🔄 ऐप रीफ्रेश करें (Reload App)
              </button>
              <button
                type="button"
                onClick={this.handleResetDataAndRecover}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-white/10 cursor-pointer transition-all"
              >
                🛠️ डिफ़ॉल्ट डेटा रीसेट
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
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
