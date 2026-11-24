import React, { useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'prominent' | 'nav';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Suppress button if already running in standalone mode (already installed!)
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      {variant === 'nav' ? (
        <button
          onClick={handleAction}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
          title="फ़ोन में WhatsApp/Facebook की तरह इंस्टॉल करें"
        >
          <Download className="w-3.5 h-3.5 text-slate-950" />
          <span className="hidden sm:inline">📲 ऐप इंस्टॉल करें</span>
          <span className="sm:hidden">📲 इंस्टॉल</span>
        </button>
      ) : variant === 'prominent' ? (
        <button
          onClick={handleAction}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
        >
          <Download className="w-4 h-4 text-slate-950" />
          <span>📲 अपने फ़ोन में इंस्टॉल करें (Install App)</span>
        </button>
      ) : (
        <button
          onClick={handleAction}
          className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          <span>📲 ऐप इंस्टॉल करें</span>
        </button>
      )}

      {/* Guide Modal */}
      <PWAInstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onInstallDirectly={isInstallable ? install : undefined}
        isInstallable={isInstallable}
        isIOS={isIOS}
      />
    </>
  );
};
