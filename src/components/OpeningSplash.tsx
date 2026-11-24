import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Lock, Delete, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  PIN_STORAGE_KEY,
  LAST_ACTIVE_TS_KEY,
  AUTO_LOCK_TIMEOUT_MS,
} from './PinSecurityModal';
import avengersPortraitAsset from '../assets/images/avengers_farming_portrait_1794491418229.jpg';
import avengersWideAsset from '../assets/images/kisan_avengers_wide_1794491446768.jpg';

interface OpeningSplashProps {
  onEnter: () => void;
  farmName: string;
  forcePinLock?: boolean;
}

export const OpeningSplash: React.FC<OpeningSplashProps> = ({
  onEnter,
  farmName,
  forcePinLock = false,
}) => {
  const [savedPin, setSavedPin] = useState<string | null>(() => {
    try {
      return localStorage.getItem(PIN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Check if user unlocked within the last 5 minutes (5-Minute Auto-Lock policy)
  const isWithinFiveMinUnlock = (() => {
    if (forcePinLock) return false;
    try {
      if (!savedPin) return false;
      const lastActiveStr = localStorage.getItem(LAST_ACTIVE_TS_KEY);
      if (!lastActiveStr) return false;
      const elapsed = Date.now() - Number(lastActiveStr);
      return elapsed > 0 && elapsed < AUTO_LOCK_TIMEOUT_MS;
    } catch {
      return false;
    }
  })();

  const [phase, setPhase] = useState<
    'loading' | 'unlocked_ready' | 'setup_create' | 'setup_confirm' | 'pin'
  >('loading');

  const [enteredPin, setEnteredPin] = useState<string>('');
  const [firstTimeDraftPin, setFirstTimeDraftPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [unlockSuccess, setUnlockSuccess] = useState<boolean>(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);
  const fxCanvasRef = useRef<HTMLCanvasElement>(null);

  // 60FPS Real-Time 3D Video FX Canvas (Thor's Rain + Lightning, Spidey's Seed Broadcasting, Tractor Smoke & Dust, Iron Man Jet Glow)
  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 1. Rain drops under Thor (Top-Right Sky to Mid-Right Field)
    const raindrops = Array.from({ length: 95 }, (_, i) => ({
      x: width * (0.48 + ((i * 37) % 52) / 100),
      y: ((i * 73) % 100) * (height * 0.0055),
      len: 16 + (i % 14),
      speed: 9 + (i % 6),
    }));

    // 2. Flying Fertilizer / Seeds from Spider-Kisan's Hand (Center-Right Arc)
    const seeds = Array.from({ length: 42 }, (_, i) => ({
      t: (i / 42) * Math.PI * 2,
      speed: 0.025 + (i % 5) * 0.004,
      spreadX: 45 + (i % 7) * 18,
      spreadY: 35 + (i % 6) * 14,
      color: i % 2 === 0 ? '#fef08a' : '#ffffff',
    }));

    // 3. Tractor Exhaust Smoke & Wheel Dust Puffs (Bottom-Left)
    const smokePuffs = Array.from({ length: 18 }, (_, i) => ({
      progress: (i / 18),
      driftX: ((i % 5) - 2) * 14,
    }));

    let startTime = performance.now();

    const renderFX = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // A. Thor's Thunder Flash & Lightning Bolts in Upper-Right Sky
      const lightningPulse = Math.sin(elapsed * 11) * Math.cos(elapsed * 7);
      if (lightningPulse > 0.72) {
        const lx = width * 0.82;
        const ly = height * 0.16;
        const grad = ctx.createRadialGradient(lx, ly, 4, lx, ly, width * 0.35);
        grad.addColorStop(0, 'rgba(125, 211, 252, 0.55)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.18)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height * 0.55);

        // Jagged Lightning Bolt from Thor's Hammer
        ctx.save();
        ctx.strokeStyle = '#e0f2fe';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        let bx = lx;
        let by = ly;
        ctx.moveTo(bx, by);
        for (let s = 0; s < 6; s++) {
          bx += (Math.sin(elapsed * 45 + s * 12) - 0.3) * 26;
          by += 28;
          ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.restore();
      }

      // B. Falling Irrigation Rain streaks
      ctx.save();
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < raindrops.length; i++) {
        const r = raindrops[i];
        r.y += r.speed;
        r.x -= 1.8;
        if (r.y > height * 0.52) {
          r.y = height * 0.08;
          r.x = width * (0.52 + ((i * 29) % 48) / 100);
        }
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 4, r.y + r.len);
      }
      ctx.stroke();
      ctx.restore();

      // C. Iron Man's Arc Reactor & Jet Thruster Glow (Upper-Left Sky)
      const ironX = width * 0.32;
      const ironY = height * 0.18;
      const jetPulse = 0.7 + Math.sin(elapsed * 22) * 0.3;
      const jetGrad = ctx.createRadialGradient(
        ironX,
        ironY,
        2,
        ironX,
        ironY,
        46 * jetPulse
      );
      jetGrad.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
      jetGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.28)');
      jetGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.arc(ironX, ironY, 46 * jetPulse, 0, Math.PI * 2);
      ctx.fill();

      // D. Spider-Kisan's Flying Seed & Urea Broadcast Granules (Center)
      const spideyHandX = width * 0.68;
      const spideyHandY = height * 0.41;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        s.t = (s.t + s.speed) % 1;
        const p = s.t;
        const gx = spideyHandX + p * s.spreadX * 1.9;
        const gy =
          spideyHandY - Math.sin(p * Math.PI) * 28 + p * p * s.spreadY * 2.2;
        ctx.fillStyle = s.color;
        ctx.globalAlpha = 1 - p * 0.85;
        ctx.beginPath();
        ctx.arc(gx, gy, 2.6 * (1 - p * 0.4), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // E. Captain's Tractor Exhaust Smoke Puffs (Mid-Left)
      const pipeX = width * 0.42;
      const pipeY = height * 0.56;
      for (let i = 0; i < smokePuffs.length; i++) {
        const sp = smokePuffs[i];
        sp.progress = (sp.progress + 0.008) % 1;
        const p = sp.progress;
        const sx = pipeX - p * 35 + sp.driftX * p;
        const sy = pipeY - p * 95;
        const radius = 6 + p * 24;
        ctx.fillStyle = `rgba(226, 232, 240, ${(1 - p) * 0.34})`;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(renderFX);
    };

    animId = requestAnimationFrame(renderFX);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'loading') return;

    let rafId = 0;
    const startTime = performance.now();
    const duration = 2600;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct}%`;
      }
      if (progressTextRef.current) {
        progressTextRef.current.textContent = `${farmName} • Loading ${pct}%`;
      }

      if (pct < 100) {
        rafId = requestAnimationFrame(updateProgress);
      } else {
        if (!savedPin) {
          setPhase('setup_create');
        } else if (isWithinFiveMinUnlock) {
          setPhase('unlocked_ready');
        } else {
          setPhase('pin');
        }
      }
    };

    rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [phase, savedPin, isWithinFiveMinUnlock, farmName]);

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (unlockSuccess) return;
      setPinError(null);

      setEnteredPin((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + digit;

        if (next.length === 4) {
          if (phase === 'setup_create') {
            setTimeout(() => {
              setFirstTimeDraftPin(next);
              setEnteredPin('');
              setPhase('setup_confirm');
            }, 180);
          } else if (phase === 'setup_confirm') {
            if (next === firstTimeDraftPin) {
              try {
                localStorage.setItem(PIN_STORAGE_KEY, next);
                localStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
              } catch {
                // ignore storage errors
              }
              setSavedPin(next);
              setUnlockSuccess(true);
              setTimeout(() => {
                onEnter();
              }, 350);
            } else {
              setPinError('PIN मेल नहीं खाया। दोबारा डालें।');
              setTimeout(() => {
                setEnteredPin('');
                setFirstTimeDraftPin('');
                setPinError(null);
                setPhase('setup_create');
              }, 750);
            }
          } else if (phase === 'pin') {
            if (next === savedPin) {
              try {
                localStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
              } catch {
                // ignore storage errors
              }
              setUnlockSuccess(true);
              setTimeout(() => {
                onEnter();
              }, 260);
            } else {
              setPinError('गलत PIN! कृपया सही PIN दर्ज करें');
              setTimeout(() => {
                setEnteredPin('');
                setPinError(null);
              }, 520);
            }
          }
        }

        return next;
      });
    },
    [phase, savedPin, firstTimeDraftPin, unlockSuccess, onEnter]
  );

  const handleBackspace = useCallback(() => {
    if (unlockSuccess) return;
    setPinError(null);
    setEnteredPin((prev) => prev.slice(0, -1));
  }, [unlockSuccess]);

  // Keyboard support for 0-9, Backspace, and Enter
  useEffect(() => {
    if (phase === 'loading') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'unlocked_ready' && e.key === 'Enter') {
        onEnter();
        return;
      }
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleDigitPress, handleBackspace, onEnter]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-slate-950 text-white select-none p-3 sm:p-5"
      style={{ perspective: '1100px' }}
    >
      {/* ==================== 1. LIVE 3D VIDEO-STYLE KISAN AVENGERS SCENE (100% UNOBSTRUCTED TOP/CENTER) ==================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Continuous 3D Camera Pan/Tilt/Zoom Loop so the whole scene moves like a 3D Animated Video */}
        <motion.div
          animate={{
            scale: [1.03, 1.1, 1.04, 1.09, 1.03],
            rotateX: [0, 2.2, -1.5, 1.8, 0],
            rotateY: [-2, 2.5, -2.5, 1.5, -2],
            x: [0, -10, 8, -6, 0],
            y: [0, -8, 4, -6, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="w-full h-full will-change-transform"
        >
          {/* Portrait Mobile Artwork */}
          <img
            src={avengersPortraitAsset}
            alt="Kisan Avengers 3D Video Scene"
            referrerPolicy="no-referrer"
            className="block md:hidden w-full h-full object-cover object-top"
          />

          {/* Landscape Desktop / Tablet Artwork */}
          <img
            src={avengersWideAsset}
            alt="Kisan Avengers 3D Video Scene"
            referrerPolicy="no-referrer"
            className="hidden md:block w-full h-full object-cover object-center"
          />
        </motion.div>

        {/* Live 60FPS Animated Rain, Lightning, Seed Broadcasting & Tractor Smoke Canvas */}
        <canvas
          ref={fxCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Soft Bottom Gradient ONLY behind the Login Pad (Top & Center remain 100% clear!) */}
        <div
          className="absolute inset-x-0 bottom-0 h-64 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.45) 55%, rgba(2,6,23,0) 100%)',
          }}
        />
      </div>

      {/* ==================== 2. ESSENTIAL LOGIN / PIN CONTROLS ONLY (AT BOTTOM) ==================== */}
      <div className="relative z-20 w-full max-w-sm mb-1">
        {phase === 'loading' ? (
          <div className="rounded-3xl bg-slate-950/85 border border-amber-400/40 p-4 shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span ref={progressTextRef}>{farmName} • Loading 0%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/15">
              <div
                ref={progressBarRef}
                style={{ width: '0%' }}
                className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 rounded-full transition-none"
              />
            </div>
          </div>
        ) : phase === 'unlocked_ready' ? (
          /* Single Essential Login Button when within 5-Minute Auto-Unlock window */
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
                } catch {
                  // ignore
                }
                onEnter();
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 hover:from-emerald-400 hover:to-amber-300 text-slate-950 font-black text-base shadow-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform border-2 border-white/40"
            >
              <span>🚀 खेत में प्रवेश करें (Login)</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </motion.div>
        ) : (
          /* Essential 4-Digit Login PIN Pad ONLY */
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="rounded-3xl bg-slate-950/85 border border-amber-400/35 p-4 shadow-2xl space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  {phase === 'pin' ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                </div>
                <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                  {phase === 'pin'
                    ? 'PIN दर्ज करें (Login PIN)'
                    : phase === 'setup_create'
                    ? 'नया 4-अंकों का PIN बनाएं'
                    : 'PIN कन्फर्म करें'}
                </h2>
              </div>

              {/* 4 PIN Dots */}
              <motion.div
                animate={pinError ? { x: [-8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-2.5 bg-slate-900/90 px-3 py-1.5 rounded-2xl border border-white/10"
              >
                {[0, 1, 2, 3].map((idx) => {
                  const filled = idx < enteredPin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                        unlockSuccess
                          ? 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-400/50'
                          : pinError
                          ? 'bg-rose-500 scale-110'
                          : filled
                          ? 'bg-amber-400 scale-110 shadow-md shadow-amber-400/50'
                          : 'bg-slate-800 border-2 border-slate-600'
                      }`}
                    />
                  );
                })}
              </motion.div>
            </div>

            {pinError && (
              <p className="text-center text-xs font-bold text-rose-400">{pinError}</p>
            )}

            {unlockSuccess && phase === 'setup_confirm' && (
              <p className="text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PIN सेट हो गया!</span>
              </p>
            )}

            {/* Essential Login Keypad (1-9, CLR, 0, Backspace) */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  className="h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white font-mono font-black text-base shadow-sm border border-white/15 transition-all cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setEnteredPin('')}
                className="h-10 rounded-2xl bg-slate-900/70 hover:bg-slate-800 active:scale-95 text-amber-300 font-mono font-black text-xs border border-white/10 transition-all cursor-pointer"
              >
                CLR
              </button>

              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                className="h-10 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-white font-mono font-black text-base shadow-sm border border-white/15 transition-all cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="h-10 rounded-2xl bg-slate-900/70 hover:bg-slate-800 active:scale-95 text-slate-200 flex items-center justify-center border border-white/10 transition-all cursor-pointer"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
