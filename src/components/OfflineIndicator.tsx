import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <aside aria-label="Offline status" className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600/95 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md border border-amber-400/40 animate-fade-in">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
      </span>
      <WifiOff className="w-4 h-4 text-amber-200" />
      <div>
        <p className="font-bold leading-tight">ऑफलाइन मोड (Offline Mode)</p>
        <p className="text-[10px] text-amber-100 font-normal">
          इंटरनेट नहीं है, फिर भी आपका डाटा सुरक्षित है और लोकल मेमोरी में सेव हो रहा है।
        </p>
      </div>
    </aside>
  );
};
