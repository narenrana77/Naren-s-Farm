import React, { useState, useEffect } from 'react';
import { FarmDataStore, WeatherData, FarmTask, FarmPlot } from '../types/farm';
import {
  WeatherService,
  WeatherScenarioMode,
} from '../services/weatherService';
import { TodaysTasks } from './TodaysTasks';
import { PlotEditModal } from './PlotEditModal';
import { WeatherAlertsModule } from './WeatherAlertsModule';
import { CropVarietiesExplorerModal } from './CropVarietiesExplorerModal';
import {
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Tractor,
  Users,
  FlaskConical,
  Landmark,
  ArrowRight,
  Edit3,
  Plus,
  Sprout,
  Compass,
} from 'lucide-react';

interface DashboardProps {
  store: FarmDataStore;
  onNavigateTab: (
    tab:
      | 'dashboard'
      | 'hisab'
      | 'simulator'
      | 'reports'
      | 'map'
      | 'ai_doctor'
      | 'about'
  ) => void;
  onUpdateTasks: (tasks: FarmTask[]) => void;
  onUpdatePlot?: (plot: FarmPlot, oldName?: string) => void;
  onAddPlot?: (plot: FarmPlot) => void;
  onDeletePlot?: (plotId: string) => void;
  onSyncWeatherPlot?: (plot: FarmPlot) => void;
  language: 'hi' | 'en';
}

export const Dashboard: React.FC<DashboardProps> = ({
  store,
  onNavigateTab,
  onUpdateTasks,
  onUpdatePlot,
  onAddPlot,
  onDeletePlot,
  onSyncWeatherPlot,
  language,
}) => {
  const [baseWeather, setBaseWeather] = useState<WeatherData | null>(null);
  const [weatherScenario, setWeatherScenario] =
    useState<WeatherScenarioMode>('live');
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [greeting, setGreeting] = useState<{ hi: string; en: string }>({
    hi: 'राम राम',
    en: 'Good Day',
  });
  const [editingPlot, setEditingPlot] = useState<FarmPlot | null>(null);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);
  const [isVarietiesModalOpen, setIsVarietiesModalOpen] = useState(false);

  // Active Khet Plot whose GPS coordinates drive Weather Updates & Predictions
  const syncedWeatherPlot =
    store.plots.find((p) => p.id === store.farmSettings.activeWeatherPlotId) ||
    store.plots[0] ||
    null;

  const weather = React.useMemo(
    () =>
      baseWeather
        ? WeatherService.applyScenario(baseWeather, weatherScenario)
        : null,
    [baseWeather, weatherScenario]
  );

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      let hiGreet = 'राम राम नरेन जी';
      let enGreet = 'Good Morning, Naren Ji';

      if (hours >= 12 && hours < 16) {
        hiGreet = 'नमस्ते नरेन जी (शुभ दोपहर)';
        enGreet = 'Good Afternoon, Naren Ji';
      } else if (hours >= 16 && hours < 20) {
        hiGreet = 'शुभ संध्या नरेन जी';
        enGreet = 'Good Evening, Naren Ji';
      } else if (hours >= 20 || hours < 5) {
        hiGreet = 'शुभ रात्रि नरेन जी';
        enGreet = 'Good Night, Naren Ji';
      }

      setGreeting({ hi: hiGreet, en: enGreet });
      setCurrentTime(
        now.toLocaleTimeString('hi-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeatherForKhet = async (plot?: FarmPlot | null) => {
    const target = plot || syncedWeatherPlot;
    const lat =
      target?.coordinates?.lat ?? store.farmSettings.coordinates?.lat ?? 29.6872;
    const lon =
      target?.coordinates?.lng ?? store.farmSettings.coordinates?.lng ?? 76.989;
    const plotTitle = target?.name || store.farmSettings.farmName;

    setLoadingWeather(true);
    try {
      const resolvedLocation = await WeatherService.reverseGeocodeKhet(
        lat,
        lon,
        plotTitle
      );
      const data = await WeatherService.getWeather(lat, lon, resolvedLocation);
      setBaseWeather(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Sync weather updates & predictions automatically whenever the active Khet or its coordinates change!
  useEffect(() => {
    fetchWeatherForKhet(syncedWeatherPlot);
  }, [
    syncedWeatherPlot?.id,
    syncedWeatherPlot?.name,
    syncedWeatherPlot?.coordinates?.lat,
    syncedWeatherPlot?.coordinates?.lng,
  ]);

  // 1-Click Sync Active Khet & Weather to User's Live GPS
  const handleSyncKhetToLiveGPS = () => {
    if (!('geolocation' in navigator)) return;
    setLoadingWeather(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const target = syncedWeatherPlot || store.plots[0];
        const resolvedLabel = await WeatherService.reverseGeocodeKhet(
          lat,
          lng,
          target?.name
        );
        if (target && onUpdatePlot) {
          onUpdatePlot({
            ...target,
            coordinates: { lat, lng },
            locationName: resolvedLabel,
          });
        }
        const data = await WeatherService.getWeather(lat, lng, resolvedLabel);
        setBaseWeather(data);
        setLoadingWeather(false);
      },
      () => {
        fetchWeatherForKhet(syncedWeatherPlot);
      },
      { timeout: 6000 }
    );
  };

  // Aggregate financial stats
  const totalMachinery = store.machineryRecords.reduce(
    (acc, r) => acc + r.totalAmount,
    0
  );
  const totalLabour = store.labourRecords.reduce(
    (acc, r) => acc + r.totalAmount,
    0
  );
  const totalMaterials = store.materialRecords.reduce(
    (acc, r) => acc + r.totalAmount,
    0
  );

  const totalAadtiCredit = store.aadtiRecords
    .filter((r) => r.type === 'credit')
    .reduce((acc, r) => acc + r.amount, 0);
  const totalAadtiDebit = store.aadtiRecords
    .filter((r) => r.type === 'debit')
    .reduce((acc, r) => acc + r.amount, 0);
  const netAadti = totalAadtiCredit - totalAadtiDebit;

  const totalAcresCount = store.plots.reduce((acc, p) => acc + p.acres, 0);

  return (
    <div className="space-y-6">
      {/* 1. CLEAN GREETING & REAL-TIME WEATHER HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/40 dark:border-white/10 p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-500/15 via-sky-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xl select-none">🚜</span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                {language === 'hi' ? 'फार्म डैशबोर्ड' : 'Farm Hub'} ·{' '}
                {currentTime}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white font-display">
              {language === 'hi' ? greeting.hi : greeting.en}
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {language === 'hi'
                ? `कुल ${store.plots.length} खेत (${totalAcresCount.toFixed(
                    1
                  )} एकड़) सक्रिय हैं। नक्शे पर खेत मार्क करने, खर्च लिखने या फसल किस्म देखने के लिए नीचे चुनें:`
                : `${store.plots.length} active plots (${totalAcresCount.toFixed(
                    1
                  )} Acres). Quick access to farm tools below:`}
            </p>

            {/* Clean Quick Action Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('map')}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {language === 'hi'
                    ? '🛰️ नक्शे पर खेत मार्क करें'
                    : '🛰️ Mark Khet on Map'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('hisab')}
                className="px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>📖</span>
                <span>
                  {language === 'hi'
                    ? 'बही-खाता (Hisab)'
                    : 'Hisab Ledger'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsVarietiesModalOpen(true)}
                className="px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {language === 'hi' ? 'सभी फसल किस्में' : 'Crop Varieties'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('ai_doctor')}
                className="px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>🤖</span>
                <span>
                  {language === 'hi' ? 'डॉ. किसान सलाह' : 'Dr. Kisan'}
                </span>
              </button>
            </div>
          </div>

          {/* Real-time Weather Box Synced to Active Khet Location */}
          <div className="glass-card rounded-3xl p-5 border border-white/50 dark:border-white/10 shadow-lg min-w-[290px] sm:min-w-[355px] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium min-w-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {weather?.location ||
                    syncedWeatherPlot?.locationName ||
                    syncedWeatherPlot?.name ||
                    store.farmSettings.location}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncKhetToLiveGPS}
                  className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold cursor-pointer transition-all"
                  title="अपनी लाइव GPS लोकेशन को इस खेत से सिंक करें"
                >
                  📍 GPS सिंक
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWeatherScenario('live');
                    fetchWeatherForKhet(syncedWeatherPlot);
                  }}
                  className="p-1.5 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  title="खेत के मौसम को रिफ्रेश करें"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      loadingWeather ? 'animate-spin text-emerald-500' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Khet Location Selector for Weather Updates & Predictions */}
            {store.plots.length > 0 && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/70">
                <span className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-400 shrink-0">
                  🌾 सिंक खेत:
                </span>
                <select
                  value={syncedWeatherPlot?.id || ''}
                  onChange={(e) => {
                    const chosen = store.plots.find(
                      (p) => p.id === e.target.value
                    );
                    if (chosen) {
                      if (onSyncWeatherPlot) onSyncWeatherPlot(chosen);
                      fetchWeatherForKhet(chosen);
                    }
                  }}
                  className="flex-1 bg-transparent text-[11px] font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer truncate"
                >
                  {store.plots.map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {(p.name || 'खेत').split('(')[0].trim()} (
                      {p.coordinates?.lat.toFixed(3)}°N,{' '}
                      {p.coordinates?.lng.toFixed(3)}°E)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                  {weather ? weather.temperature : '26.5'}
                </span>
                <span className="text-xl font-bold text-slate-500 font-mono">
                  °C
                </span>
              </div>

              <div className="text-right">
                <span className="text-2xl select-none">
                  {weather && weather.precipitationChance > 30
                    ? '🌧️'
                    : weather && weather.temperature >= 38
                    ? '🔥'
                    : '☀️'}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {weather ? weather.conditionText : 'खुशनुमा धूप'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-center">
              <div className="p-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40">
                <span className="text-[10px] text-slate-500 block">नमी</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {weather ? weather.humidity : 54}%
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40">
                <span className="text-[10px] text-slate-500 block">हवा</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {weather ? weather.windSpeed : 8.5} km/h
                </span>
              </div>

              <div className="p-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40">
                <span className="text-[10px] text-slate-500 block">बारिश</span>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {weather ? weather.precipitationChance : 5}%
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
              {weather?.agriAdvice.isSuitableForSpray ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block">
                  {weather?.agriAdvice.title || 'मौसम कृषि अनुकूल'}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {weather?.agriAdvice.description ||
                    'स्प्रे एवं सिंचाई के लिए अनुकूल परिस्थितियां हैं।'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PROACTIVE WEATHER ALERTS MODULE (With One UI Full-Screen Takeover) */}
      <WeatherAlertsModule
        weather={weather}
        plots={store.plots}
        scenario={weatherScenario}
        onSelectScenario={setWeatherScenario}
        onAddTask={(newTask) => onUpdateTasks([newTask, ...store.tasks])}
        onOpenAIDoctor={() => onNavigateTab('ai_doctor')}
        language={language}
      />

      {/* 3. FINANCIAL SNAPSHOT (4 Clean Ledger Summary Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateTab('hisab')}
          className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              1. मशीनरी खर्च
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Tractor className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums mt-2">
            ₹{totalMachinery.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{store.machineryRecords.length} मशीन लॉग्स</span>
            <span className="text-emerald-800 dark:text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
              खोलें →
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('hisab')}
          className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              2. मजदूरी खर्च
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums mt-2">
            ₹{totalLabour.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{store.labourRecords.length} मजदूरी प्रविष्टियां</span>
            <span className="text-emerald-800 dark:text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
              खोलें →
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('hisab')}
          className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              3. खाद, बीज व दवाइयां
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums mt-2">
            ₹{totalMaterials.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{store.materialRecords.length} खरीद रिकॉर्ड</span>
            <span className="text-emerald-800 dark:text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
              खोलें →
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('hisab')}
          className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-lg hover:border-emerald-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              4. आढ़ती पासबुक
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums mt-2 ${
              netAadti >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {netAadti >= 0 ? '+' : ''}₹{netAadti.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>
              {netAadti >= 0 ? 'जमा रकम (Receivable)' : 'देनदारी (Payable)'}
            </span>
            <span className="text-emerald-800 dark:text-emerald-400 font-medium group-hover:translate-x-0.5 transition-transform">
              पासबुक →
            </span>
          </div>
        </div>
      </div>

      {/* 4. TODAY'S TASKS & SCHEDULED FARM MAINTENANCE REMINDERS */}
      <TodaysTasks
        store={store}
        onUpdateTasks={onUpdateTasks}
        onNavigateTab={onNavigateTab}
        language={language}
      />

      {/* 5. ACTIVE FARM PLOTS & CROP VARIETIES */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {language === 'hi'
                  ? 'आपके खेत के प्लॉट (Active Farm Plots)'
                  : 'Active Farm Plots'}
              </h3>
              <p className="text-xs text-slate-500">
                {language === 'hi'
                  ? 'खेत को एडिट करने या नक्शे पर बाउंड्री मार्क करने के लिए नीचे चुनें'
                  : 'Edit plot details or mark boundary on map'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('map')}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {language === 'hi'
                  ? '🛰️ नक्शे पर खेत मार्क करें'
                  : '🛰️ Mark on Map'}
              </span>
            </button>

            {onAddPlot && (
              <button
                type="button"
                onClick={() => {
                  setEditingPlot(null);
                  setIsPlotModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'hi' ? '+ नया खेत' : '+ New Plot'}</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {store.plots.map((plot) => (
            <div
              key={plot.id}
              onClick={() => onNavigateTab('map')}
              className="group p-4 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] gap-1">
                  <span className="font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    {plot.stage}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onUpdatePlot && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlot(plot);
                          setIsPlotModalOpen(true);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-slate-950 border border-amber-500/30 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                        title="खेत एडिट करें"
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>एडिट</span>
                      </button>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-1.5 truncate">
                  {plot.name}
                </h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  {plot.crop} ·{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {plot.acres} एकड़
                  </strong>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>प्रगति</span>
                  <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                    {plot.progressPct}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full"
                    style={{ width: `${plot.progressPct}%` }}
                  />
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>📍 {plot.boundaries?.length || 4} बाउंड्री पॉइंट्स</span>
                  <span className="group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    <span>नक्शा</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plot Edit / Add Modal */}
      {onUpdatePlot && onAddPlot && (
        <PlotEditModal
          isOpen={isPlotModalOpen}
          onClose={() => setIsPlotModalOpen(false)}
          plot={editingPlot}
          plots={store.plots}
          onSavePlot={(savedPlot, oldName) => {
            const exists = store.plots.some((p) => p.id === savedPlot.id);
            if (exists) {
              onUpdatePlot(savedPlot, oldName);
            } else {
              onAddPlot(savedPlot);
            }
          }}
          onDeletePlot={onDeletePlot}
          language={language}
        />
      )}

      {/* All Crop Varieties Directory Modal */}
      <CropVarietiesExplorerModal
        isOpen={isVarietiesModalOpen}
        onClose={() => setIsVarietiesModalOpen(false)}
        plots={store.plots}
        onAssignVarietyToPlot={(plotId, varietyLabel) => {
          const target = store.plots.find((p) => p.id === plotId);
          if (target && onUpdatePlot) {
            const updated: FarmPlot = {
              ...target,
              crop: varietyLabel,
              subPlots: (target.subPlots || []).map((sp) => ({
                ...sp,
                cropVariety: varietyLabel,
              })),
            };
            onUpdatePlot(updated);
          }
        }}
        language={language}
      />
    </div>
  );
};
