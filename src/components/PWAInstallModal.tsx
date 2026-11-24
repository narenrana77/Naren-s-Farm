import React from 'react';
import { Smartphone, Download, Share, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { App3DIcon } from './App3DIcon';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstallDirectly?: () => void;
  isInstallable: boolean;
  isIOS: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstallDirectly,
  isInstallable,
  isIOS,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 text-white shadow-2xl overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header with App Icon Preview */}
        <div className="flex items-center gap-3.5 mb-5">
          <App3DIcon size="md" showBadge />
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span>Farm Tracker ऐप इंस्टॉल करें</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Standalone PWA
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              WhatsApp व Facebook की तरह अपने मोबाइल की होम स्क्रीन पर सीधे चलाएं!
            </p>
          </div>
        </div>

        {/* Home Screen App Icon Simulation (WhatsApp / Facebook comparison) */}
        <div className="mb-5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-around text-center">
          <div className="flex flex-col items-center gap-1 opacity-60">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white text-xl shadow-md">
              💬
            </div>
            <span className="text-[10px] text-slate-300 font-medium">WhatsApp</span>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-60">
            <div className="w-12 h-12 rounded-2xl bg-[#1877F2] flex items-center justify-center text-white text-xl font-bold shadow-md">
              f
            </div>
            <span className="text-[10px] text-slate-300 font-medium">Facebook</span>
          </div>

          {/* Farm Tracker highlighted */}
          <div className="flex flex-col items-center gap-1 scale-110">
            <div className="relative">
              <App3DIcon size="md" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 flex items-center justify-center text-[8px] text-slate-950 font-bold z-20">
                ✓
              </span>
            </div>
            <span className="text-[10px] text-emerald-300 font-black">FarmTracker 3D</span>
          </div>
        </div>

        {/* Direct One-Click Install Button if supported */}
        {isInstallable && onInstallDirectly && (
          <div className="mb-5">
            <button
              onClick={() => {
                onInstallDirectly();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-5 h-5 text-slate-950" />
              <span>📲 1-क्लिक में फ़ोन पर इंस्टॉल करें (Install Now)</span>
            </button>
          </div>
        )}

        {/* Step-by-Step Instructions Tabs / Guides */}
        <div className="space-y-3.5 text-xs">
          {/* Android Guide */}
          <div className={`p-3.5 rounded-2xl border ${!isIOS ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
              <Smartphone className="w-4 h-4" />
              <span>एंड्रॉयड फ़ोन (Android - Chrome / Samsung Internet)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li>
                ऊपर दिया गया <strong className="text-white">"Install Now"</strong> बटन दबाएं।
              </li>
              <li>
                या अगर बटन न दिखे तो ब्राउज़र में ऊपर दाएँ कोने के <strong className="text-white">तीन बिंदु (⋮)</strong> पर क्लिक करें।
              </li>
              <li>
                मेनू में से <strong className="text-emerald-300">"Install app" (ऐप इंस्टॉल करें)</strong> या <strong className="text-emerald-300">"Add to Home screen"</strong> चुनें।
              </li>
              <li>
                कुछ ही सेकंड में आपके मोबाइल स्क्रीन पर Farm Tracker का ऐप आ जाएगा!
              </li>
            </ol>
          </div>

          {/* iPhone / iPad Guide */}
          <div className={`p-3.5 rounded-2xl border ${isIOS ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-800/40 border-slate-700/60'}`}>
            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-2">
              <Share className="w-4 h-4" />
              <span>आईफोन / आईपैड (iPhone - Safari Browser)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li>
                Safari ब्राउज़र में सबसे नीचे दिए गए <strong className="text-white">Share (शेयर) बटन 📤</strong> पर टैप करें।
              </li>
              <li>
                नीचे स्क्रॉल करके <strong className="text-emerald-300">"Add to Home Screen" (होम स्क्रीन पर जोड़ें) <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /></strong> पर टैप करें।
              </li>
              <li>
                ऊपर दाएँ कोने में <strong className="text-white">"Add"</strong> पर टैप करें।
              </li>
              <li>
                अब यह ऐप बिना सफारी के सीधे आपके आईफोन पर फुल स्क्रीन में खुलेगा!
              </li>
            </ol>
          </div>
        </div>

        {/* Benefits bullets */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-around text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> कोई प्लेस्टोर डाउनलोड नहीं
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> ऑफलाइन भी चलता है
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> केवल 2MB स्टोरेज
          </span>
        </div>
      </div>
    </div>
  );
};
