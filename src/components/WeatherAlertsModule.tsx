import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  WeatherData,
  WeatherRiskAlert,
  FarmPlot,
  FarmTask,
  Language,
} from '../types/farm';
import {
  WeatherService,
  WeatherScenarioMode,
} from '../services/weatherService';
import {
  Bell,
  BellRing,
  AlertTriangle,
  Flame,
  CloudLightning,
  Wind,
  Snowflake,
  ShieldCheck,
  CheckCircle2,
  PlusCircle,
  X,
  Calendar,
  MapPin,
  Bot,
  Droplets,
  Sun,
  Maximize2,
  Thermometer,
  Sparkles,
} from 'lucide-react';

interface WeatherAlertsModuleProps {
  weather: WeatherData | null;
  plots: FarmPlot[];
  scenario: WeatherScenarioMode;
  onSelectScenario: (mode: WeatherScenarioMode) => void;
  onAddTask: (task: FarmTask) => void;
  onOpenAIDoctor: () => void;
  language: Language;
}

/**
 * Interactive 60FPS Atmospheric Canvas for Samsung One UI Full-Screen Weather Takeover
 * Renders realistic pouring rain + lightning, blazing heat embers/sunbeams, gale wind streaks + hail, or frost crystals
 */
const OneUIAtmosphericCanvas: React.FC<{
  type: WeatherRiskAlert['type'];
}> = ({ type }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
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

    // Initialize particles based on weather type
    const count = type === 'heavy_rain' ? 140 : type === 'high_wind_hail' ? 110 : 75;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      len: 18 + Math.random() * 28,
      speedX:
        type === 'high_wind_hail'
          ? 9 + Math.random() * 8
          : type === 'heavy_rain'
          ? 2.5 + Math.random() * 2
          : (Math.random() - 0.5) * 1.2,
      speedY:
        type === 'heavy_rain'
          ? 14 + Math.random() * 10
          : type === 'high_wind_hail'
          ? 6 + Math.random() * 6
          : type === 'extreme_heat'
          ? -(1.2 + Math.random() * 2.2)
          : 1.2 + Math.random() * 1.8,
      radius: 1.5 + Math.random() * 3.5,
      alpha: 0.25 + Math.random() * 0.65,
    }));

    let lightningTimer = 0;
    let flashOpacity = 0;

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      if (type === 'heavy_rain') {
        // Occasional sheet lightning flash across the sky
        if (now - lightningTimer > 3800 && Math.random() < 0.035) {
          flashOpacity = 0.45;
          lightningTimer = now;
        }
        if (flashOpacity > 0.01) {
          ctx.fillStyle = `rgba(224, 242, 254, ${flashOpacity})`;
          ctx.fillRect(0, 0, width, height);
          flashOpacity *= 0.86;
        }

        // Pouring rain streaks
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        for (const p of particles) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.speedX * 1.6, p.y + p.len);
          ctx.stroke();

          p.x += p.speedX;
          p.y += p.speedY;
          if (p.y > height) {
            p.y = -30;
            p.x = Math.random() * width;
          }
          if (p.x > width) p.x = 0;
        }
      } else if (type === 'extreme_heat') {
        // Rotating solar corona glow in top-right sky
        const sunX = width * 0.82;
        const sunY = height * 0.18;
        const pulse = 1 + Math.sin(now * 0.002) * 0.08;
        const grad = ctx.createRadialGradient(
          sunX,
          sunY,
          20,
          sunX,
          sunY,
          Math.max(width, height) * 0.55 * pulse
        );
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
        grad.addColorStop(0.35, 'rgba(251, 146, 60, 0.28)');
        grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Rising thermal heat-haze orbs & solar embers
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(253, 224, 71, ${p.alpha * 0.55})`;
          ctx.fill();

          p.y += p.speedY;
          p.x += Math.sin(now * 0.002 + p.y * 0.02) * 0.8;
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
        }
      } else if (type === 'high_wind_hail') {
        // High-velocity wind streaks + bouncing hail pellets
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          if (i % 3 === 0) {
            // Wind streak
            ctx.strokeStyle = `rgba(204, 251, 241, ${p.alpha * 0.45})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.len * 2.2, p.y + p.speedY * 0.8);
            ctx.stroke();
          } else {
            // Hailstone pellet
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(241, 245, 249, ${p.alpha * 0.85})`;
            ctx.fill();
          }

          p.x += p.speedX;
          p.y += p.speedY;
          if (p.x > width + 40) p.x = -40;
          if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
        }
      } else {
        // Frost / Cold Wave & Fog crystals
        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 1.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha * 0.7})`;
          ctx.fill();

          p.y += p.speedY * 0.7;
          p.x += Math.sin(now * 0.0015 + p.y * 0.015) * 0.6;
          if (p.y > height + 10) {
            p.y = -10;
            p.x = Math.random() * width;
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [type]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export const WeatherAlertsModule: React.FC<WeatherAlertsModuleProps> = ({
  weather,
  plots,
  scenario,
  onSelectScenario,
  onAddTask,
  onOpenAIDoctor,
  language,
}) => {
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return true;
  });

  // Full-Screen Samsung One UI Weather Alert Takeover state
  const [fullScreenAlert, setFullScreenAlert] =
    useState<WeatherRiskAlert | null>(null);
  const [addedTaskIds, setAddedTaskIds] = useState<Record<string, boolean>>({});
  const [dismissedAlertIds, setDismissedAlertIds] = useState<
    Record<string, boolean>
  >({});
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const alerts = (weather?.riskAlerts || []).filter(
    (a) => !dismissedAlertIds[a.id]
  );
  const dailyForecast = weather?.dailyForecast || [];

  // Only auto-open the Full-Screen One UI Takeover when the user explicitly selects a test scenario (not on initial live load or clock re-renders)
  useEffect(() => {
    setDismissedAlertIds({});
    if (scenario === 'live') {
      setFullScreenAlert(null);
      return;
    }
    const topAlert = weather?.riskAlerts?.[0];
    if (topAlert) {
      setFullScreenAlert(topAlert);
      if (pushEnabled && weather) {
        WeatherService.triggerBrowserPushNotification(
          topAlert,
          weather.location,
          language
        );
      }
    }
  }, [scenario]);

  const handleEnablePushNotifications = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPushEnabled(true);
        if (perm === 'granted' && weather?.riskAlerts?.[0]) {
          await WeatherService.triggerBrowserPushNotification(
            weather.riskAlerts[0],
            weather.location,
            language
          );
        }
        setPushStatusMsg(
          language === 'hi'
            ? '🔔 One UI फुल-स्क्रीन और ब्राउज़र पुश अलर्ट सक्रिय हैं!'
            : '🔔 One UI Full-Screen & Browser Push Alerts Enabled!'
        );
      } catch {
        setPushEnabled(true);
      }
    } else {
      setPushEnabled(!pushEnabled);
    }
    setTimeout(() => setPushStatusMsg(null), 4000);
  };

  // Launch Full-Screen One UI Takeover on demand (even if live weather is calm, creates a sample or uses current alert)
  const handleLaunchOneUIFullScreen = async (alertItem?: WeatherRiskAlert) => {
    if (alertItem) {
      setFullScreenAlert(alertItem);
      if (weather) {
        await WeatherService.triggerBrowserPushNotification(
          alertItem,
          weather.location,
          language
        );
      }
      return;
    }

    // If currently in calm live weather, switch to Heavy Rain to showcase the full-screen transformation
    onSelectScenario('heavy_rain');
  };

  const handleAddProtectiveTask = (alert: WeatherRiskAlert) => {
    const newTask: FarmTask = {
      id: `weather-task-${alert.id}-${Date.now()}`,
      title: alert.taskSuggestionHi,
      plotName: plots[0]?.name || 'सभी खेत (All Farm Plots)',
      category: alert.taskCategory,
      dueDate: new Date().toISOString().split('T')[0],
      isCompleted: false,
      priority: 'high',
    };
    onAddTask(newTask);
    setAddedTaskIds((prev) => ({ ...prev, [alert.id]: true }));
  };

  const getAlertIcon = (type: WeatherRiskAlert['type'], sizeClass = 'w-6 h-6') => {
    switch (type) {
      case 'heavy_rain':
        return <CloudLightning className={`${sizeClass} text-sky-300 shrink-0`} />;
      case 'extreme_heat':
        return <Flame className={`${sizeClass} text-amber-300 shrink-0`} />;
      case 'high_wind_hail':
        return <Wind className={`${sizeClass} text-teal-200 shrink-0`} />;
      case 'frost_fog':
      case 'fungal_humid':
        return <Snowflake className={`${sizeClass} text-cyan-200 shrink-0`} />;
    }
  };

  // Dynamic Samsung One UI 7 full-screen background theme per weather risk type
  const getOneUIFullScreenGradient = (type: WeatherRiskAlert['type']) => {
    switch (type) {
      case 'heavy_rain':
        return 'bg-gradient-to-b from-[#071124] via-[#102544] to-[#193759]';
      case 'extreme_heat':
        return 'bg-gradient-to-b from-[#431007] via-[#9a2c0c] to-[#d95b12]';
      case 'high_wind_hail':
        return 'bg-gradient-to-b from-[#091c22] via-[#133b42] to-[#1e293b]';
      case 'frost_fog':
      case 'fungal_humid':
        return 'bg-gradient-to-b from-[#07233b] via-[#0c4a6e] to-[#0284c7]';
    }
  };

  return (
    <div className="space-y-4">
      {/* =====================================================================
          SAMSUNG ONE UI 7 FULL-SCREEN DYNAMIC WEATHER PUSH ALERT TAKEOVER
         ===================================================================== */}
      <AnimatePresence>
        {fullScreenAlert && (
          <motion.div
            key={fullScreenAlert.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`fixed inset-0 z-[100] overflow-y-auto text-white select-none ${getOneUIFullScreenGradient(
              fullScreenAlert.type
            )}`}
          >
            {/* 60FPS Atmospheric Particle & Sky Physics Canvas */}
            <OneUIAtmosphericCanvas type={fullScreenAlert.type} />

            {/* Ambient One UI Soft Radial Backlight */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div
                className={`absolute -top-28 left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-3xl opacity-35 ${
                  fullScreenAlert.type === 'extreme_heat'
                    ? 'bg-amber-400'
                    : fullScreenAlert.type === 'heavy_rain'
                    ? 'bg-sky-400'
                    : fullScreenAlert.type === 'high_wind_hail'
                    ? 'bg-teal-400'
                    : 'bg-cyan-300'
                }`}
              />
            </div>

            {/* Full-Screen One UI Content Wrapper */}
            <div className="relative z-10 min-h-screen max-w-4xl mx-auto px-4 sm:px-8 py-5 sm:py-8 flex flex-col justify-between gap-6">
              {/* 1. One UI Top Status & Live Scenario Switcher Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-2xl border border-white/25 flex items-center gap-2 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-black tracking-wide">
                      {weather?.location ||
                        plots[0]?.locationName ||
                        plots[0]?.name ||
                        'सक्रिय खेत लोकेशन'}
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-rose-500/80 backdrop-blur-md text-[10px] font-black uppercase tracking-widest border border-white/30 shadow-md">
                    ONE UI WEATHER ALERT
                  </span>
                </div>

                {/* Live Weather Transformation Switcher Pills inside Full-Screen */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onSelectScenario('heavy_rain')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer backdrop-blur-xl border ${
                      scenario === 'heavy_rain'
                        ? 'bg-white text-slate-950 border-white shadow-md scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    🌧️ भारी बारिश
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectScenario('extreme_heat')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer backdrop-blur-xl border ${
                      scenario === 'extreme_heat'
                        ? 'bg-white text-slate-950 border-white shadow-md scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    🔥 भीषण लू
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectScenario('high_wind_hail')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer backdrop-blur-xl border ${
                      scenario === 'high_wind_hail'
                        ? 'bg-white text-slate-950 border-white shadow-md scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    🌪️ आंधी/ओला
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectScenario('frost_rust')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer backdrop-blur-xl border ${
                      scenario === 'frost_rust'
                        ? 'bg-white text-slate-950 border-white shadow-md scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                    }`}
                  >
                    ❄️ पाला/कोहरा
                  </button>

                  <button
                    type="button"
                    onClick={() => setFullScreenAlert(null)}
                    className="ml-1 w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-xl border border-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
                    title="फुल-स्क्रीन अलर्ट बंद करें"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 2. Samsung One UI Center Hero Temperature & Dynamic Weather Figure */}
              <div className="text-center my-2 space-y-2">
                <motion.div
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-[32px] bg-white/15 backdrop-blur-2xl border border-white/30 shadow-2xl mx-auto"
                >
                  {getAlertIcon(fullScreenAlert.type, 'w-11 h-11 sm:w-13 sm:h-13')}
                </motion.div>

                <div className="flex items-start justify-center leading-none pt-1">
                  <span className="text-7xl sm:text-8xl font-extralight tracking-tighter font-mono drop-shadow-xl">
                    {weather ? Math.round(weather.temperature) : 26}
                  </span>
                  <span className="text-4xl sm:text-5xl font-light mt-2">°</span>
                </div>

                <p className="text-lg sm:text-2xl font-black tracking-tight text-white drop-shadow">
                  {language === 'hi'
                    ? fullScreenAlert.titleHi
                    : fullScreenAlert.titleEn}
                </p>

                <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-white/85 font-medium flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/15 font-mono">
                    {fullScreenAlert.triggerMetric}
                  </span>
                  <span>•</span>
                  <span>
                    आभासी तापमान (Feels Like): {weather?.apparentTemp ?? 27}°C
                  </span>
                  <span>•</span>
                  <span>
                    ⏱️{' '}
                    {language === 'hi'
                      ? fullScreenAlert.forecastWindowHi
                      : fullScreenAlert.forecastWindowEn}
                  </span>
                </div>
              </div>

              {/* 3. One UI Frosted Squircle Alert & Crop Protection Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Main Warning & Action Checklist Squircle Card (7 cols) */}
                <div className="md:col-span-7 rounded-[32px] bg-white/14 backdrop-blur-2xl border border-white/25 p-5 sm:p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        {language === 'hi'
                          ? 'गंभीर कृषि चेतावनी व फसल प्रभाव'
                          : 'Severe Agronomic Impact & Advisory'}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                      {fullScreenAlert.severity === 'critical'
                        ? 'RED ALERT'
                        : 'ORANGE ALERT'}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
                    {language === 'hi'
                      ? fullScreenAlert.descriptionHi
                      : fullScreenAlert.descriptionEn}
                  </p>

                  {/* Recommended Actions List */}
                  <div className="rounded-2xl bg-black/25 border border-white/15 p-4 space-y-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      🛡️{' '}
                      {language === 'hi'
                        ? 'किसान भाई तुरंत यह कदम उठाएं:'
                        : 'Immediate Steps for Your Farm:'}
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-white/90">
                      {(language === 'hi'
                        ? fullScreenAlert.recommendedActionsHi
                        : fullScreenAlert.recommendedActionsEn
                      ).map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 1-Click Task & AI Doctor Buttons inside One UI Full-Screen */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      disabled={addedTaskIds[fullScreenAlert.id]}
                      onClick={() => handleAddProtectiveTask(fullScreenAlert)}
                      className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                        addedTaskIds[fullScreenAlert.id]
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white hover:bg-slate-100 text-slate-950 active:scale-95'
                      }`}
                    >
                      {addedTaskIds[fullScreenAlert.id] ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>आज के कार्य (Task) में जुड़ गया ✓</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4 text-slate-950" />
                          <span>+ आज के कार्य में बचाव टास्क जोड़ें</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFullScreenAlert(null);
                        onOpenAIDoctor();
                      }}
                      className="py-3 px-4 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Bot className="w-4 h-4 text-emerald-300" />
                      <span>डॉ. किसान से पूछें</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: One UI Micro-Metrics + Affected Plots + 3-Day Strip (5 cols) */}
                <div className="md:col-span-5 flex flex-col justify-between gap-4">
                  {/* One UI 3-Widget Pill Row (Humidity, Wind, Rain) */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-[26px] bg-white/14 backdrop-blur-2xl border border-white/20 p-3.5 text-center">
                      <Droplets className="w-4 h-4 text-sky-300 mx-auto mb-1" />
                      <span className="text-[10px] text-white/70 block">
                        नमी (Humidity)
                      </span>
                      <span className="text-base font-black font-mono">
                        {weather?.humidity ?? 55}%
                      </span>
                    </div>

                    <div className="rounded-[26px] bg-white/14 backdrop-blur-2xl border border-white/20 p-3.5 text-center">
                      <Wind className="w-4 h-4 text-teal-300 mx-auto mb-1" />
                      <span className="text-[10px] text-white/70 block">
                        हवा (Wind)
                      </span>
                      <span className="text-base font-black font-mono">
                        {weather?.windSpeed ?? 12} km/h
                      </span>
                    </div>

                    <div className="rounded-[26px] bg-white/14 backdrop-blur-2xl border border-white/20 p-3.5 text-center">
                      <Sun className="w-4 h-4 text-amber-300 mx-auto mb-1" />
                      <span className="text-[10px] text-white/70 block">
                        बारिश (Rain)
                      </span>
                      <span className="text-base font-black font-mono">
                        {weather?.precipitationChance ?? 80}%
                      </span>
                    </div>
                  </div>

                  {/* Affected Farm Plots Squircle Card */}
                  <div className="rounded-[28px] bg-white/14 backdrop-blur-2xl border border-white/20 p-4 space-y-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-white/80 block">
                      🌾 आपके प्रभावित खेत ({plots.length} Plots):
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {plots.map((p) => (
                        <div
                          key={p.id}
                          className="px-3 py-2 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-between text-xs"
                        >
                          <span className="font-bold truncate pr-2">
                            {p.name.split('(')[0].trim()}
                          </span>
                          <span className="text-amber-300 font-mono font-bold shrink-0">
                            {p.crop.split('(')[0].trim()} · {p.acres} एकड़
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* One UI 3-Day Forecast Squircle Card */}
                  <div className="rounded-[28px] bg-white/14 backdrop-blur-2xl border border-white/20 p-4 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-white/80 block">
                      📅 आगामी 3-दिवसीय पूर्वानुमान:
                    </span>
                    <div className="space-y-1.5">
                      {dailyForecast.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs py-1 border-b border-white/10 last:border-none"
                        >
                          <span className="font-bold">{d.dayLabelHi}</span>
                          <span className="text-sky-200 font-mono">
                            💧 {d.rainProbability}%
                          </span>
                          <span className="font-mono font-black">
                            {d.maxTemp}° / {d.minTemp}°
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Bottom One UI Dismiss Pill Button */}
              <div className="flex justify-center pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => setFullScreenAlert(null)}
                  className="px-8 py-3.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-2xl border border-white/35 text-white font-black text-xs sm:text-sm tracking-wide shadow-2xl flex items-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>
                    {language === 'hi'
                      ? 'समझ गया — डैशबोर्ड पर वापस जाएं (Dismiss Full-Screen Alert)'
                      : 'Got It — Return to Farm Dashboard'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          2. DASHBOARD EMBEDDED WEATHER ALERTS & ONE UI TRIGGER MODULE
         ===================================================================== */}
      <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xl backdrop-blur-xl">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                alerts.some((a) => a.severity === 'critical')
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                  : alerts.length > 0
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
              }`}
            >
              {alerts.length > 0 ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {language === 'hi'
                    ? '🚨 One UI मौसम पुश अलर्ट एवं फसल सुरक्षा (Full-Screen Weather Alerts)'
                    : '🚨 One UI Full-Screen Weather Push Alerts & Crop Protection'}
                </h2>
                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    alerts.some((a) => a.severity === 'critical')
                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                      : alerts.length > 0
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {alerts.length > 0
                    ? language === 'hi'
                      ? `${alerts.length} सक्रिय चेतावनी`
                      : `${alerts.length} Active Risk Alerts`
                    : language === 'hi'
                    ? 'सुरक्षित मौसम'
                    : 'All Clear'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  {weather?.location ||
                    plots[0]?.locationName ||
                    plots[0]?.name ||
                    'सक्रिय खेत लोकेशन'}{' '}
                  — खेत की GPS लोकेशन से लाइव मौसम व पूर्वानुमान सिंक है
                </span>
              </p>
            </div>
          </div>

          {/* Right Controls: Launch One UI Full-Screen Alert & Push Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleEnablePushNotifications}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                pushEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {pushEnabled ? (
                <BellRing className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Bell className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {pushEnabled
                  ? language === 'hi'
                    ? 'पुश अलर्ट: ON'
                    : 'Push: ON'
                  : language === 'hi'
                  ? 'पुश चालू करें'
                  : 'Enable Push'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleLaunchOneUIFullScreen(alerts[0])}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/25 cursor-pointer transition-all active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>
                {language === 'hi'
                  ? '📱 One UI फुल-स्क्रीन अलर्ट खोलें'
                  : '📱 Open One UI Full-Screen Alert'}
              </span>
            </button>
          </div>
        </div>

        {/* Push Notification Status Feedback */}
        {pushStatusMsg && (
          <div className="px-4 py-2 bg-emerald-950/90 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
            <span>{pushStatusMsg}</span>
            <button
              onClick={() => setPushStatusMsg(null)}
              className="text-emerald-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Interactive Weather Risk Scenario Simulator Bar */}
        <div className="px-4 sm:px-5 py-3 bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              One UI फुल-स्क्रीन मौसम अलर्ट टेस्ट करें (Click to Transform Full
              Screen):
            </span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectScenario('live')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
              }`}
            >
              📡 लाइव मौसम (Live)
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectScenario('heavy_rain');
                if (scenario === 'heavy_rain' && alerts[0]) {
                  setFullScreenAlert(alerts[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'heavy_rain'
                  ? 'bg-sky-600 text-white shadow-md ring-2 ring-sky-400/50'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-400'
              }`}
            >
              🌧️ भारी बारिश (Full-Screen Rain)
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectScenario('extreme_heat');
                if (scenario === 'extreme_heat' && alerts[0]) {
                  setFullScreenAlert(alerts[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'extreme_heat'
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400'
              }`}
            >
              🔥 भीषण गर्मी/लू (Full-Screen Heat)
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectScenario('high_wind_hail');
                if (scenario === 'high_wind_hail' && alerts[0]) {
                  setFullScreenAlert(alerts[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'high_wind_hail'
                  ? 'bg-teal-600 text-white shadow-md ring-2 ring-teal-400/50'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
              }`}
            >
              🌪️ आंधी/ओलावृष्टि (Full-Screen Storm)
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectScenario('frost_rust');
                if (scenario === 'frost_rust' && alerts[0]) {
                  setFullScreenAlert(alerts[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'frost_rust'
                  ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400/50'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-400'
              }`}
            >
              ❄️ पाला व रतुआ (Full-Screen Frost)
            </button>
          </div>
        </div>

        {/* Embedded Summary Cards inside Dashboard */}
        <div className="p-4 sm:p-5 space-y-4">
          {alerts.length > 0 ? (
            <div className="space-y-3.5">
              {alerts.map((alert) => {
                const isCritical = alert.severity === 'critical';
                const taskAdded = addedTaskIds[alert.id];

                return (
                  <div
                    key={alert.id}
                    className={`rounded-2xl p-4 sm:p-5 border-2 transition-all ${
                      isCritical
                        ? 'bg-rose-50/90 dark:bg-rose-950/35 border-rose-500/70 shadow-lg shadow-rose-500/10'
                        : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-500/60 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`p-3 rounded-2xl shrink-0 ${
                            isCritical
                              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                              : 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          }`}
                        >
                          {getAlertIcon(alert.type)}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                isCritical
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-slate-950'
                              }`}
                            >
                              {isCritical ? 'HIGH RISK ALERT' : 'WARNING'}
                            </span>
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-900 text-amber-300">
                              {alert.triggerMetric}
                            </span>
                          </div>

                          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                            {language === 'hi' ? alert.titleHi : alert.titleEn}
                          </h3>

                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                            {language === 'hi'
                              ? alert.descriptionHi
                              : alert.descriptionEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap lg:flex-col items-stretch gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFullScreenAlert(alert)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>One UI फुल-स्क्रीन देखें</span>
                        </button>

                        <button
                          type="button"
                          disabled={taskAdded}
                          onClick={() => handleAddProtectiveTask(alert)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            taskAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md'
                          }`}
                        >
                          {taskAdded ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>टास्क जुड़ गया ✓</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-4 h-4" />
                              <span>+ आज के कार्य में जोड़ें</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                    {language === 'hi'
                      ? 'अभी मौसम सामान्य है — One UI फुल-स्क्रीन अलर्ट देखने के लिए ऊपर कोई भी मौसम बटन दबाएं!'
                      : 'Weather is currently calm — Click any scenario above to launch the One UI Full-Screen Alert!'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'hi'
                      ? 'ऊपर "🌧️ भारी बारिश", "🔥 भीषण गर्मी/लू", या "📱 One UI फुल-स्क्रीन अलर्ट खोलें" पर क्लिक करते ही पूरी स्क्रीन बदल जाएगी।'
                      : 'Tap Heavy Rain or Extreme Heat above to experience the full-screen One UI weather takeover.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3-Day Forecast Cards */}
          {dailyForecast.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'hi'
                      ? 'आगामी 3-दिवसीय मौसम व जोखिम पूर्वानुमान:'
                      : '3-Day Risk Forecast:'}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {dailyForecast.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
                      day.riskSeverity === 'critical'
                        ? 'bg-rose-50/60 dark:bg-rose-950/25 border-rose-400/60'
                        : day.riskSeverity === 'warning'
                        ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-400/60'
                        : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {language === 'hi' ? day.dayLabelHi : day.dayLabelEn}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          day.riskSeverity === 'critical'
                            ? 'bg-rose-600 text-white'
                            : day.riskSeverity === 'warning'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {day.riskTagHi || 'अनुकूल'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between my-1">
                      <div className="font-mono">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          {day.maxTemp}°C
                        </span>
                        <span className="text-xs text-slate-500 ml-1">
                          / {day.minTemp}°C
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {language === 'hi' ? day.conditionHi : day.conditionEn}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>🌧️ बारिश: {day.rainProbability}%</span>
                      <span>💨 हवा: {day.windSpeedMax} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
