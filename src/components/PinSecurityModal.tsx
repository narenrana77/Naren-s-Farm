import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Lock, X, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const PIN_STORAGE_KEY = 'naren_farm_app_pin_v1';
export const LAST_ACTIVE_TS_KEY = 'naren_farm_last_active_ts_v1';
export const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 Minutes (300,000 ms)

interface PinSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow: () => void;
  language: 'hi' | 'en';
}

export const PinSecurityModal: React.FC<PinSecurityModalProps> = ({
  isOpen,
  onClose,
  onLockNow,
  language,
}) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const getStoredPin = (): string | null => {
    try {
      return localStorage.getItem(PIN_STORAGE_KEY);
    } catch {
      return null;
    }
  };

  const storedPin = getStoredPin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (storedPin && currentPin !== storedPin) {
      setError(
        language === 'hi'
          ? 'पुराना (Current) PIN गलत है! बिना सही पुराने PIN के नया PIN सेट नहीं हो सकता।'
          : 'Incorrect Current PIN! You must verify your existing PIN first.'
      );
      return;
    }

    if (!/^\d{4}$/.test(newPin)) {
      setError(
        language === 'hi'
          ? 'नया PIN ठीक 4 अंकों (Digits) का होना चाहिए।'
          : 'New PIN must be exactly 4 digits.'
      );
      return;
    }

    if (newPin !== confirmPin) {
      setError(
        language === 'hi'
          ? 'नया PIN और कन्फर्म PIN दोनों एक समान नहीं हैं।'
          : 'New PIN and Confirm PIN do not match.'
      );
      return;
    }

    try {
      localStorage.setItem(PIN_STORAGE_KEY, newPin);
      localStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
    } catch {
      // ignore storage errors
    }

    setSuccess(true);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');

    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 text-white shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {language === 'hi' ? 'सुरक्षा व PIN सेटिंग्स' : 'Security & PIN Settings'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'hi'
                ? 'लॉगिन स्क्रीन पर कोई भी बिना पुराने PIN के इसे नहीं बदल सकता'
                : 'Protected: Requires Current PIN verification to change'}
            </p>
          </div>
        </div>

        {/* 5-Minute Auto-Lock Status Banner */}
        <div className="mb-3 px-3.5 py-2.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-2.5 text-emerald-300 text-xs font-bold">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {language === 'hi'
              ? '⏱️ स्मार्ट ऑटो-लॉक: तुरंत लॉक की जगह 5 मिनट निष्क्रिय (Inactive) रहने के बाद ही लॉक होगा'
              : '⏱️ Smart Auto-Lock: Locks after 5 minutes of inactivity instead of instantly'}
          </span>
        </div>

        {/* Quick Lock Action */}
        <div className="mb-5 p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white">
              {language === 'hi' ? 'ऐप को तुरंत लॉक करें' : 'Lock App Immediately'}
            </p>
            <p className="text-[11px] text-slate-400">
              {language === 'hi'
                ? 'वापस 3D लॉन्च व PIN लॉक स्क्रीन पर जाएं'
                : 'Return to the PIN lock screen right now'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem(LAST_ACTIVE_TS_KEY);
              } catch {
                // ignore
              }
              onClose();
              onLockNow();
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'अभी लॉक करें' : 'Lock Now'}</span>
          </button>
        </div>

        {/* Change PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <KeyRound className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'अपना 4-अंकों का PIN बदलें' : 'Change 4-Digit App PIN'}</span>
          </div>

          {storedPin && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {language === 'hi' ? '1. वर्तमान (Current) PIN दर्ज करें *' : '1. Enter Current PIN *'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-center font-mono text-lg tracking-[0.5em] text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {language === 'hi' ? '2. नया 4-Digit PIN *' : '2. New 4-Digit PIN *'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-center font-mono text-lg tracking-[0.4em] text-emerald-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {language === 'hi' ? '3. नया PIN कन्फर्म करें *' : '3. Confirm New PIN *'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-emerald-500 focus:outline-none text-center font-mono text-lg tracking-[0.4em] text-emerald-400"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {language === 'hi'
                  ? 'नया सुरक्षा PIN सफलतापूर्वक सेव हो गया!'
                  : 'New Security PIN saved successfully!'}
              </span>
            </div>
          )}

          <div className="pt-1 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
            >
              {language === 'hi' ? 'PIN अपडेट करें' : 'Update PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
