import React, { useState } from 'react';
import { HelpCircle, Volume2, VolumeX, X, CheckCircle2 } from 'lucide-react';

interface SectionHelpPopupProps {
  titleHi: string;
  subtitleHi?: string;
  bulletsHi: string[];
  speechTextHi?: string;
  buttonLabelHi?: string;
  compact?: boolean;
}

function speakHindiText(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'hi-IN';
    utter.rate = 0.95;
    utter.onend = () => onEnd?.();
    utter.onerror = () => onEnd?.();
    window.speechSynthesis.speak(utter);
  } catch {
    onEnd?.();
  }
}

function stopHindiSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export const SectionHelpPopup: React.FC<SectionHelpPopupProps> = ({
  titleHi,
  subtitleHi,
  bulletsHi,
  speechTextHi,
  buttonLabelHi = '❓ मदद',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fullNarration =
    speechTextHi || `${titleHi}। ${bulletsHi.join('। ')}`;

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      stopHindiSpeech();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakHindiText(fullNarration, () => setIsSpeaking(false));
    }
  };

  const handleClose = () => {
    stopHindiSpeech();
    setIsSpeaking(false);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-400/15 hover:bg-amber-400 text-amber-700 dark:text-amber-300 hover:text-slate-950 font-black transition-all cursor-pointer shrink-0 ${
          compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        }`}
        title={`${titleHi} की जानकारी व आवाज़ गाइड`}
      >
        <HelpCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{buttonLabelHi}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-400 p-5 sm:p-6 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-lg shrink-0">
                  ❓
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                    स्मार्ट गाइड व सहायता (Contextual Help)
                  </span>
                  <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                    {titleHi}
                  </h4>
                  {subtitleHi && (
                    <p className="text-xs text-slate-300 mt-0.5">{subtitleHi}</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Audio Narration Button */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                🔊 बोलकर हिंदी में समझें (Voice Narration):
              </span>
              <button
                type="button"
                onClick={handleToggleSpeech}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  isSpeaking
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>रोकें (Stop)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>🔊 सुनें (Listen)</span>
                  </>
                )}
              </button>
            </div>

            {/* Bullet points */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {bulletsHi.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-start gap-2.5 text-xs sm:text-sm text-slate-100 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="font-bold">{item}</span>
                </div>
              ))}
            </div>

            {/* Footer Close */}
            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                ✅ समझ आ गया — बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
