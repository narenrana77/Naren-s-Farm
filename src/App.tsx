import React, { useState, useEffect, useRef } from 'react';
import {
  FarmDataStore,
  FarmPlot,
  WeatherData,
  DeletedHistoryEntry,
} from './types/farm';
import { FarmStorage } from './services/storage';
import { OpeningSplash } from './components/OpeningSplash';
import { Navbar, AppNavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { SocialFarmFeedHome } from './components/SocialFarmFeedHome';
import { PerAcreEntryForm } from './components/PerAcreEntryForm';
import { HisabKitab } from './components/HisabKitab';
import { StockManagementBoard } from './components/StockManagementBoard';
import { VisualFarmSimulator } from './components/VisualFarmSimulator';
import { ReportsAndCharts } from './components/ReportsAndCharts';
import { FarmMap } from './components/FarmMap';
import { CropDoctorAI } from './components/CropDoctorAI';
import { AboutAppView } from './components/AboutAppView';
import { CloudBackupModal } from './components/CloudBackupModal';
import {
  PinSecurityModal,
  PIN_STORAGE_KEY,
  LAST_ACTIVE_TS_KEY,
  AUTO_LOCK_TIMEOUT_MS,
} from './components/PinSecurityModal';
import { CropVarietiesExplorerModal } from './components/CropVarietiesExplorerModal';
import {
  FloatingUndoBanner,
  TrashHistoryDrawerModal,
} from './components/UndoRecoveryComponents';
import {
  detectAndRecordDeletions,
  restoreDeletedHistoryEntry,
} from './utils/undoManager';
import { AnimatePresence, motion } from 'motion/react';
import { Bot, X, AlertCircle, MapPin, GripVertical, LogOut, ShieldCheck, Mic } from 'lucide-react';
import { WeatherService } from './services/weatherService';
import { OfflineIndicator } from './components/OfflineIndicator';
import { VoiceHisabTalkbackModal } from './components/VoiceHisabTalkbackModal';
import { AppHelpTutorialModal } from './components/AppHelpTutorialModal';

export default function App() {
  const dragBoundsRef = useRef<HTMLDivElement>(null);
  const wasDraggingRef = useRef<boolean>(false);
  const wasVoiceDraggingRef = useRef<boolean>(false);
  const [store, setStore] = useState<FarmDataStore>(() => FarmStorage.load());

  // 5-Minute Smart Auto-Lock instead of Instant Lock:
  // Always show the Kisan Avengers Opening Screen on launch; OpeningSplash skips PIN if unlocked within last 5 minutes!
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);
  const [showPinSettings, setShowPinSettings] = useState<boolean>(false);
  const [showVarietiesModal, setShowVarietiesModal] = useState<boolean>(false);
  const [showFloatingAIChat, setShowFloatingAIChat] = useState<boolean>(false);
  const [showTrashDrawer, setShowTrashDrawer] = useState<boolean>(false);
  const [showQuickAcreModal, setShowQuickAcreModal] = useState<boolean>(false);
  const [showGlobalVoiceHisabModal, setShowGlobalVoiceHisabModal] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [quickModalPlotId, setQuickModalPlotId] = useState<string>('');
  const [quickModalAcreId, setQuickModalAcreId] = useState<string>('');
  const [latestDeletedEntry, setLatestDeletedEntry] =
    useState<DeletedHistoryEntry | null>(null);
  const [restoredFeedbackMessage, setRestoredFeedbackMessage] = useState<
    string | null
  >(null);
  const undoTimerRef = useRef<number | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(
    null
  );
  const [defaultPlotPrefill, setDefaultPlotPrefill] = useState<
    string | undefined
  >(undefined);
  const [defaultCategoryPrefill, setDefaultCategoryPrefill] = useState<
    'machinery' | 'labour' | 'chemical_seed' | undefined
  >(undefined);

  // Track latest UI state in a ref for the hardware/browser Back button (popstate) listener
  const navStateRef = useRef({
    activeTab,
    showQuickAcreModal,
    showFloatingAIChat,
    showTrashDrawer,
    showBackupModal,
    showPinSettings,
    showVarietiesModal,
    showExitConfirmModal,
    showSplash,
  });
  useEffect(() => {
    navStateRef.current = {
      activeTab,
      showQuickAcreModal,
      showFloatingAIChat,
      showTrashDrawer,
      showBackupModal,
      showPinSettings,
      showVarietiesModal,
      showExitConfirmModal,
      showSplash,
    };
  }, [
    activeTab,
    showQuickAcreModal,
    showFloatingAIChat,
    showTrashDrawer,
    showBackupModal,
    showPinSettings,
    showVarietiesModal,
    showExitConfirmModal,
    showSplash,
  ]);

  // 1) Hardware / Browser Back Button Quit Protection (Confirmation before quitting)
  useEffect(() => {
    try {
      window.history.pushState({ kisanBackGuard: true }, '');
    } catch {
      // ignore history errors
    }

    const handlePopState = () => {
      const s = navStateRef.current;

      // Always re-push guard state so pressing Back doesn't abruptly quit the app
      try {
        window.history.pushState({ kisanBackGuard: true }, '');
      } catch {
        // ignore
      }

      if (s.showSplash) {
        return;
      }

      // Close open modals first on Back press
      if (s.showExitConfirmModal) {
        setShowExitConfirmModal(false);
        return;
      }
      if (s.showQuickAcreModal) {
        setShowQuickAcreModal(false);
        return;
      }
      if (s.showFloatingAIChat) {
        setShowFloatingAIChat(false);
        return;
      }
      if (s.showTrashDrawer) {
        setShowTrashDrawer(false);
        return;
      }
      if (s.showBackupModal) {
        setShowBackupModal(false);
        return;
      }
      if (s.showPinSettings) {
        setShowPinSettings(false);
        return;
      }
      if (s.showVarietiesModal) {
        setShowVarietiesModal(false);
        return;
      }

      // If on any non-Home tab, Back button takes user smoothly to Home ('dashboard')
      if (s.activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return;
      }

      // Already on Home tab: show Quit Confirmation Modal instead of quitting!
      setShowExitConfirmModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 2) 5-Minute Inactivity Auto-Lock Timer (replaces instant auto-lock)
  useEffect(() => {
    if (showSplash) return;

    let lastWrite = Date.now();
    try {
      localStorage.setItem(LAST_ACTIVE_TS_KEY, String(lastWrite));
    } catch {
      // ignore
    }

    const recordActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 4 seconds
      if (now - lastWrite > 4000) {
        lastWrite = now;
        try {
          localStorage.setItem(LAST_ACTIVE_TS_KEY, String(now));
        } catch {
          // ignore
        }
      }
    };

    const checkInactivityLock = () => {
      try {
        const lastActiveStr = localStorage.getItem(LAST_ACTIVE_TS_KEY);
        const lastActive = lastActiveStr ? Number(lastActiveStr) : lastWrite;
        if (Date.now() - lastActive >= AUTO_LOCK_TIMEOUT_MS) {
          setShowSplash(true);
        }
      } catch {
        // ignore
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // When user comes back to the app, only lock if 5+ minutes have passed!
        checkInactivityLock();
      } else {
        // Record timestamp when leaving tab so 5-minute countdown is accurate
        try {
          localStorage.setItem(LAST_ACTIVE_TS_KEY, String(Date.now()));
        } catch {
          // ignore
        }
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((ev) =>
      window.addEventListener(ev, recordActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkInactivityLock, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, recordActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [showSplash]);

  // Active Khet Plot used for Weather Updates & Predictions Sync
  const activeWeatherPlot =
    store.plots.find((p) => p.id === store.farmSettings.activeWeatherPlotId) ||
    store.plots[0] ||
    null;

  // Dynamically sync weather & predictions whenever the active Khet or its GPS coordinates change
  useEffect(() => {
    const lat =
      activeWeatherPlot?.coordinates?.lat ??
      store.farmSettings.coordinates?.lat ??
      29.6872;
    const lng =
      activeWeatherPlot?.coordinates?.lng ??
      store.farmSettings.coordinates?.lng ??
      76.989;
    const plotTitle = activeWeatherPlot?.name || store.farmSettings.farmName;

    let cancelled = false;
    (async () => {
      const resolvedLabel = await WeatherService.reverseGeocodeKhet(
        lat,
        lng,
        plotTitle
      );
      if (cancelled) return;

      const weatherData = await WeatherService.getWeather(
        lat,
        lng,
        resolvedLabel
      );
      if (cancelled) return;
      setCurrentWeather(weatherData);

      // Keep store.farmSettings.location synced with the real reverse-geocoded khet location
      if (
        store.farmSettings.location === 'Karnal, Haryana' ||
        store.farmSettings.location !== resolvedLabel
      ) {
        setStore((prev) => {
          const updatedPlots = prev.plots.map((p) =>
            p.id === activeWeatherPlot?.id
              ? { ...p, locationName: resolvedLabel }
              : p
          );
          const nextStore: FarmDataStore = {
            ...prev,
            plots: updatedPlots,
            farmSettings: {
              ...prev.farmSettings,
              location: resolvedLabel,
              activeWeatherPlotId: activeWeatherPlot?.id,
              coordinates: { lat, lng },
            },
          };
          FarmStorage.save(nextStore);
          return nextStore;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    activeWeatherPlot?.id,
    activeWeatherPlot?.name,
    activeWeatherPlot?.coordinates?.lat,
    activeWeatherPlot?.coordinates?.lng,
  ]);

  // Two-Tier Google Maps Quota Listener
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Sync dark mode class on document element
  useEffect(() => {
    if (store.farmSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [store.farmSettings.darkMode]);

  const triggerUndoBannerTimer = () => {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = window.setTimeout(() => {
      setLatestDeletedEntry(null);
      setRestoredFeedbackMessage(null);
    }, 12000);
  };

  const handleSaveStore = (newStore: FarmDataStore) => {
    setStore((prevStore) => {
      const { updatedStore, newlyDeletedEntries } = detectAndRecordDeletions(
        prevStore,
        newStore
      );
      FarmStorage.save(updatedStore);
      if (newlyDeletedEntries.length > 0) {
        setRestoredFeedbackMessage(null);
        setLatestDeletedEntry(newlyDeletedEntries[0]);
        triggerUndoBannerTimer();
      }
      return updatedStore;
    });
  };

  const handleRestoreDeletedItem = (entryId: string) => {
    setStore((prevStore) => {
      const { updatedStore, restoredEntry } = restoreDeletedHistoryEntry(
        prevStore,
        entryId
      );
      FarmStorage.save(updatedStore);
      if (restoredEntry) {
        setLatestDeletedEntry(null);
        setRestoredFeedbackMessage(
          `वापस लाया गया (Restored): ${restoredEntry.title}`
        );
        triggerUndoBannerTimer();
      }
      return updatedStore;
    });
  };

  const handleRestoreAllDeletedItems = () => {
    setStore((prevStore) => {
      let current = prevStore;
      const allIds = (prevStore.deletedHistory || []).map((e) => e.id);
      for (const id of allIds) {
        const res = restoreDeletedHistoryEntry(current, id);
        current = res.updatedStore;
      }
      FarmStorage.save(current);
      setLatestDeletedEntry(null);
      setRestoredFeedbackMessage(
        `सभी ${allIds.length} डिलीट किए गए आइटम वापस लाए गए!`
      );
      triggerUndoBannerTimer();
      return current;
    });
  };

  const handlePermanentDeleteTrashEntry = (entryId: string) => {
    setStore((prevStore) => {
      const nextHistory = (prevStore.deletedHistory || []).filter(
        (e) => e.id !== entryId
      );
      const nextStore = { ...prevStore, deletedHistory: nextHistory };
      FarmStorage.save(nextStore);
      if (latestDeletedEntry?.id === entryId) {
        setLatestDeletedEntry(null);
      }
      return nextStore;
    });
  };

  const handleClearAllTrashHistory = () => {
    setStore((prevStore) => {
      const nextStore = { ...prevStore, deletedHistory: [] };
      FarmStorage.save(nextStore);
      setLatestDeletedEntry(null);
      return nextStore;
    });
  };

  const handleSyncWeatherToPlot = (plot: FarmPlot) => {
    handleSaveStore({
      ...store,
      farmSettings: {
        ...store.farmSettings,
        activeWeatherPlotId: plot.id,
        location: plot.locationName || plot.name,
        coordinates: plot.coordinates || store.farmSettings.coordinates,
      },
    });
  };

  const handleUpdatePlot = (updatedPlot: FarmPlot, oldName?: string) => {
    const newPlots = store.plots.map((p) =>
      p.id === updatedPlot.id ? updatedPlot : p
    );

    const previousName =
      oldName ?? store.plots.find((p) => p.id === updatedPlot.id)?.name;
    const isRenamed = previousName && previousName !== updatedPlot.name;

    const updatedMachinery = isRenamed
      ? store.machineryRecords.map((r) =>
          r.plotName === previousName ? { ...r, plotName: updatedPlot.name } : r
        )
      : store.machineryRecords;

    const updatedLabour = isRenamed
      ? store.labourRecords.map((r) =>
          r.plotName === previousName ? { ...r, plotName: updatedPlot.name } : r
        )
      : store.labourRecords;

    const updatedTasks = isRenamed
      ? store.tasks.map((t) =>
          t.plotName === previousName ? { ...t, plotName: updatedPlot.name } : t
        )
      : store.tasks;

    handleSaveStore({
      ...store,
      plots: newPlots,
      machineryRecords: updatedMachinery,
      labourRecords: updatedLabour,
      tasks: updatedTasks,
      farmSettings: {
        ...store.farmSettings,
        activeWeatherPlotId: updatedPlot.id,
        coordinates: updatedPlot.coordinates || store.farmSettings.coordinates,
      },
    });
  };

  const handleAddPlot = (newPlot: FarmPlot) => {
    handleSaveStore({
      ...store,
      plots: [...store.plots, newPlot],
      farmSettings: {
        ...store.farmSettings,
        activeWeatherPlotId: newPlot.id,
        coordinates: newPlot.coordinates || store.farmSettings.coordinates,
      },
    });
  };

  const handleDeletePlot = (plotId: string) => {
    const remaining = store.plots.filter((p) => p.id !== plotId);
    handleSaveStore({ ...store, plots: remaining });
  };

  const handleQuickLogExpense = (
    plotName: string,
    category: 'machinery' | 'labour' | 'chemical_seed'
  ) => {
    setDefaultPlotPrefill(plotName);
    setDefaultCategoryPrefill(category);
    setActiveTab('hisab');
  };

  const setDarkMode = (val: boolean) => {
    handleSaveStore({
      ...store,
      farmSettings: {
        ...store.farmSettings,
        darkMode: val,
      },
    });
  };

  const setLanguage = (val: 'hi' | 'en') => {
    handleSaveStore({
      ...store,
      farmSettings: {
        ...store.farmSettings,
        language: val,
      },
    });
  };

  const totalAcres = store.plots.reduce((acc, p) => acc + p.acres, 0);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-[#18191A] text-[#050505] dark:text-[#E4E6EB] selection:bg-emerald-500/20 selection:text-emerald-700 font-sans transition-colors duration-200">
      {/* Google Maps Platform Quota Alert Banner */}
      {quotaExceeded && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-center text-xs sm:text-sm font-bold sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-slate-950" />
          <span>Google Maps API quota limit reached.</span>
          <a
            href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black font-extrabold ml-1"
          >
            Learn how to upgrade or configure your billing quota →
          </a>
        </div>
      )}

      {/* 1. 3D Tractor Launch & PIN Lock Screen */}
      <AnimatePresence>
        {showSplash && (
          <OpeningSplash
            farmName={store.farmSettings.farmName}
            onEnter={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>

      {/* 2. Top Navigation Bar & Mobile Bottom 5-Tab Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={store.farmSettings.darkMode}
        setDarkMode={setDarkMode}
        language={store.farmSettings.language}
        setLanguage={setLanguage}
        onOpenBackup={() => setShowBackupModal(true)}
        onOpenPinSettings={() => setShowPinSettings(true)}
        onReplaySplash={() => {
          try {
            localStorage.removeItem(LAST_ACTIVE_TS_KEY);
          } catch {
            // ignore
          }
          setShowSplash(true);
        }}
        onOpenTrashDrawer={() => setShowTrashDrawer(true)}
        onOpenVarietiesModal={() => setShowVarietiesModal(true)}
        onOpenHelpModal={() => setShowHelpModal(true)}
        onOpenQuickAcreForm={() => {
          const firstPlot = store.plots[0];
          const firstAcre = firstPlot?.subPlots?.[0];
          setQuickModalPlotId(firstPlot?.id || '');
          setQuickModalAcreId(firstAcre?.id || '');
          setShowQuickAcreModal(true);
        }}
        trashCount={(store.deletedHistory || []).length}
        cloudSyncStatus="synced"
      />

      {/* 3. Main Workspace Container */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <SocialFarmFeedHome
            store={store}
            currentWeather={currentWeather}
            onSaveStore={handleSaveStore}
            onUpdatePlot={handleUpdatePlot}
            onNavigateTab={setActiveTab}
            onOpenAIChat={() => setShowFloatingAIChat(true)}
            onOpenQuickAcreFormModal={(plotId, acreId) => {
              const targetPlot =
                store.plots.find((p) => p.id === plotId) || store.plots[0];
              const targetAcre =
                targetPlot?.subPlots?.find((a) => a.id === acreId) ||
                targetPlot?.subPlots?.[0];
              setQuickModalPlotId(targetPlot?.id || '');
              setQuickModalAcreId(targetAcre?.id || '');
              setShowQuickAcreModal(true);
            }}
            language={store.farmSettings.language}
          />
        )}

        {activeTab === 'classic_dashboard' && (
          <Dashboard
            store={store}
            onNavigateTab={setActiveTab}
            onUpdateTasks={(newTasks) =>
              handleSaveStore({ ...store, tasks: newTasks })
            }
            onUpdatePlot={handleUpdatePlot}
            onAddPlot={handleAddPlot}
            onDeletePlot={handleDeletePlot}
            onSyncWeatherPlot={handleSyncWeatherToPlot}
            language={store.farmSettings.language}
          />
        )}

        {activeTab === 'hisab' && (
          <HisabKitab
            store={store}
            onSaveStore={handleSaveStore}
            language={store.farmSettings.language}
            defaultPlotPrefill={defaultPlotPrefill}
            defaultCategoryPrefill={defaultCategoryPrefill}
            onOpenStock={() => setActiveTab('stock')}
          />
        )}

        {activeTab === 'stock' && (
          <StockManagementBoard
            store={store}
            onSaveStore={handleSaveStore}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsAndCharts
            store={store}
            language={store.farmSettings.language}
          />
        )}

        {activeTab === 'simulator' && (
          <VisualFarmSimulator
            plots={store.plots}
            store={store}
            onSaveStore={handleSaveStore}
            onUpdatePlot={handleUpdatePlot}
            onAddPlot={handleAddPlot}
            onDeletePlot={handleDeletePlot}
            onQuickLogExpense={handleQuickLogExpense}
            language={store.farmSettings.language}
          />
        )}

        {activeTab === 'map' && (
          <FarmMap
            plots={store.plots}
            store={store}
            onSaveStore={handleSaveStore}
            language={store.farmSettings.language}
            onSelectPlot={handleSyncWeatherToPlot}
            onUpdatePlot={handleUpdatePlot}
            onAddNewPlot={handleAddPlot}
            onDeletePlot={handleDeletePlot}
            onNavigateToHisab={(plotName) =>
              handleQuickLogExpense(plotName, 'machinery')
            }
          />
        )}

        {activeTab === 'ai_doctor' && (
          <CropDoctorAI
            plots={store.plots}
            currentWeather={currentWeather}
            language={store.farmSettings.language}
            onAddTask={(task) =>
              handleSaveStore({ ...store, tasks: [task, ...store.tasks] })
            }
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'about' && (
          <AboutAppView
            farmName={store.farmSettings.farmName}
            ownerName={store.farmSettings.ownerName}
            location={store.farmSettings.location}
            plotsCount={store.plots.length}
            totalAcres={totalAcres}
            language={store.farmSettings.language}
            onNavigateTab={setActiveTab}
            onOpenBackup={() => setShowBackupModal(true)}
            onOpenPinModal={() => setShowPinSettings(true)}
            onOpenVarietiesModal={() => setShowVarietiesModal(true)}
          />
        )}
      </main>

      {/* 3.5 Global 1-Tap "+" Per-Acre Status, Sowing & Worker Expense Form Modal */}
      {showQuickAcreModal && store.plots.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowQuickAcreModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border-2 border-emerald-500/60 shadow-2xl p-3 sm:p-5 space-y-3"
          >
            {(() => {
              const targetPlot =
                store.plots.find((p) => p.id === quickModalPlotId) ||
                store.plots[0];
              const subList = targetPlot?.subPlots || [];
              const targetAcre =
                subList.find((a) => a.id === quickModalAcreId) || subList[0];

              if (!targetPlot || !targetAcre) return null;

              return (
                <>
                  <div className="space-y-2.5 pb-2.5 border-b border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-emerald-300">
                          🌾 कौन-सा एकड़ खोलना है? (चुनें):
                        </span>
                        {store.plots.length > 1 && (
                          <select
                            value={targetPlot.id}
                            onChange={(e) => {
                              const nextP = store.plots.find(
                                (p) => p.id === e.target.value
                              );
                              setQuickModalPlotId(e.target.value);
                              setQuickModalAcreId(
                                nextP?.subPlots?.[0]?.id || ''
                              );
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white"
                          >
                            {store.plots.map((p) => (
                              <option key={p.id} value={p.id}>
                                {(p.name || 'खेत').split('(')[0].trim()}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowQuickAcreModal(false)}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Horizontal Scroller with Instagram Story Circular (Gol) Acre Tiles */}
                    <div className="flex items-start gap-3 overflow-x-auto pb-2 pt-1">
                      {subList.map((sp) => {
                        const isFocused = sp.id === targetAcre.id;
                        const isSeeded =
                          sp.acreStatus === 'Seeded' ||
                          (!sp.acreStatus &&
                            !`${sp.cropVariety || ''} ${sp.cropName || ''}`.includes(
                              'खाली'
                            ));
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => setQuickModalAcreId(sp.id)}
                            className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                          >
                            <div
                              className={`p-[2.5px] rounded-full transition-all ${
                                isFocused
                                  ? 'bg-gradient-to-tr from-amber-300 via-yellow-400 to-emerald-400 ring-2 ring-white scale-105 shadow-lg'
                                  : isSeeded
                                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-85 hover:opacity-100'
                                  : 'bg-gradient-to-tr from-sky-400 to-blue-500 opacity-75 hover:opacity-100'
                              }`}
                            >
                              <div
                                className={`w-13 h-13 rounded-full border-2 border-slate-950 flex flex-col items-center justify-center ${
                                  isFocused
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-slate-900 text-white'
                                }`}
                              >
                                <span className="text-xs font-mono font-black leading-none">
                                  #{sp.acreNumber}
                                </span>
                                <span
                                  className={`text-[9px] font-bold mt-0.5 ${
                                    isFocused
                                      ? 'text-slate-900'
                                      : isSeeded
                                      ? 'text-emerald-300'
                                      : 'text-sky-300'
                                  }`}
                                >
                                  {isSeeded ? '🌾 बोया' : '💧 खाली'}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-mono whitespace-nowrap ${
                                isFocused
                                  ? 'text-amber-300 font-black'
                                  : 'text-slate-300 font-bold'
                              }`}
                            >
                              एकड़ #{sp.acreNumber}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <PerAcreEntryForm
                    plot={targetPlot}
                    acre={targetAcre}
                    store={store}
                    onSaveAcreAndStore={(updatedPlot, updatedStore) => {
                      if (updatedStore) {
                        handleSaveStore(updatedStore);
                      } else {
                        handleUpdatePlot(updatedPlot);
                      }
                    }}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. Cloud Backup & Restore Modal */}
      <CloudBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        store={store}
        onRestoreStore={handleSaveStore}
        language={store.farmSettings.language}
      />

      {/* 5. PIN Security Modal */}
      <PinSecurityModal
        isOpen={showPinSettings}
        onClose={() => setShowPinSettings(false)}
        onLockNow={() => setShowSplash(true)}
        language={store.farmSettings.language}
      />

      {/* 6. Global Crop Varieties Directory Modal */}
      <CropVarietiesExplorerModal
        isOpen={showVarietiesModal}
        onClose={() => setShowVarietiesModal(false)}
        plots={store.plots}
        onAssignVarietyToPlot={(plotId, varietyLabel) => {
          const target = store.plots.find((p) => p.id === plotId);
          if (target) {
            handleUpdatePlot({
              ...target,
              crop: varietyLabel,
              subPlots: (target.subPlots || []).map((sp) => ({
                ...sp,
                cropVariety: varietyLabel,
              })),
            });
          }
        }}
        language={store.farmSettings.language}
      />

      {/* 7. Compact & Full-Screen Moveable (Draggable) Floating Voice Hisab + AI Salahkar Buttons */}
      <div
        ref={dragBoundsRef}
        className="fixed inset-2 pointer-events-none z-40"
      >
        {/* Full-Screen Moveable Floating Voice Talkback Expense Button */}
        <motion.button
          type="button"
          drag
          dragConstraints={dragBoundsRef}
          dragElastic={0.05}
          dragMomentum={false}
          whileDrag={{ scale: 1.06 }}
          onDragStart={() => {
            wasVoiceDraggingRef.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              wasVoiceDraggingRef.current = false;
            }, 150);
          }}
          onClick={() => {
            if (wasVoiceDraggingRef.current) return;
            setShowGlobalVoiceHisabModal(true);
          }}
          className="pointer-events-auto fixed bottom-32 lg:bottom-16 right-4 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 text-[11px] font-extrabold shadow-[0_6px_20px_-3px_rgba(245,158,11,0.75)] border border-white flex items-center gap-1.5 cursor-grab active:cursor-grabbing backdrop-blur-xl select-none touch-none"
          title="खींचकर कहीं भी ले जाएं (Moveable) · क्लिक करके बोलकर खर्चा लिखें"
        >
          <GripVertical className="w-3 h-3 text-slate-800/80 -mr-0.5 shrink-0" />
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-slate-950/15 border border-slate-950/20 shrink-0">
            <Mic className="w-3 h-3 text-slate-950" />
          </div>
          <span className="pr-0.5 whitespace-nowrap">बोलकर खर्चा</span>
        </motion.button>

        {/* Full-Screen Moveable Floating AI Salahkar Button */}
        <motion.button
          type="button"
          drag
          dragConstraints={dragBoundsRef}
          dragElastic={0.05}
          dragMomentum={false}
          whileDrag={{ scale: 1.06 }}
          onDragStart={() => {
            wasDraggingRef.current = true;
          }}
          onDragEnd={() => {
            window.setTimeout(() => {
              wasDraggingRef.current = false;
            }, 150);
          }}
          onClick={() => {
            if (wasDraggingRef.current) return;
            setShowFloatingAIChat((prev) => !prev);
          }}
          className="pointer-events-auto fixed bottom-20 lg:bottom-5 right-4 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600/95 via-teal-600/95 to-emerald-500/95 hover:from-emerald-500 hover:to-teal-400 text-white text-[11px] font-extrabold shadow-[0_6px_20px_-3px_rgba(16,185,129,0.7)] border border-emerald-300/70 flex items-center gap-1.5 cursor-grab active:cursor-grabbing backdrop-blur-xl select-none touch-none"
          title="खींचकर कहीं भी ले जाएं (Moveable) · क्लिक करके AI सलाहकार चैट खोलें"
        >
          <GripVertical className="w-3 h-3 text-emerald-200/80 -mr-0.5 shrink-0" />
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white/20 border border-white/30 shrink-0">
            <Bot className="w-3 h-3 text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 border border-slate-900" />
          </div>
          <span className="pr-0.5 whitespace-nowrap">AI सलाहकार</span>
        </motion.button>
      </div>

      {/* 7.5 Global Free Voice Talkback Hisab Modal */}
      <VoiceHisabTalkbackModal
        isOpen={showGlobalVoiceHisabModal}
        onClose={() => setShowGlobalVoiceHisabModal(false)}
        store={store}
        onSaveStore={handleSaveStore}
      />

      {/* 7.6 App Help & Tutorials Popup Window */}
      <AppHelpTutorialModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />

      {/* 8. 80% Screen-Size Floating AI Salahkar Chat Popup Modal */}
      {showFloatingAIChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowFloatingAIChat(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[94vw] sm:w-[84vw] h-[82vh] max-w-6xl rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-emerald-500/50 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden"
          >
            {/* Sticky Popup Header */}
            <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border-b border-emerald-500/30 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                      🤖 डॉ. किसान — लाइव AI कृषि सलाहकार चैट
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase">
                      LIVE AI CHAT
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300/90 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>
                      सिंक खेत लोकेशन:{' '}
                      {currentWeather?.location || store.farmSettings.location}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFloatingAIChat(false)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-400/40 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
                <span>बंद करें</span>
              </button>
            </div>

            {/* Scrollable 80% Screen Chat & Crop Doctor Workspace */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5">
              <CropDoctorAI
                plots={store.plots}
                currentWeather={currentWeather}
                language={store.farmSettings.language}
                onAddTask={(task) =>
                  handleSaveStore({ ...store, tasks: [task, ...store.tasks] })
                }
                onNavigateTab={(tab) => {
                  setActiveTab(tab);
                  setShowFloatingAIChat(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 9. Floating Undo Banner & Persistent 20-Item Trash History Drawer */}
      <FloatingUndoBanner
        latestDeletedEntry={latestDeletedEntry}
        restoredFeedbackMessage={restoredFeedbackMessage}
        totalTrashCount={(store.deletedHistory || []).length}
        onUndoLatest={handleRestoreDeletedItem}
        onDismissBanner={() => {
          setLatestDeletedEntry(null);
          setRestoredFeedbackMessage(null);
        }}
        onOpenTrashDrawer={() => setShowTrashDrawer(true)}
      />

      <TrashHistoryDrawerModal
        isOpen={showTrashDrawer}
        onClose={() => setShowTrashDrawer(false)}
        deletedHistory={store.deletedHistory || []}
        onRestoreEntry={handleRestoreDeletedItem}
        onRestoreAll={handleRestoreAllDeletedItems}
        onPermanentDeleteEntry={handlePermanentDeleteTrashEntry}
        onClearAllHistory={handleClearAllTrashHistory}
      />

      {/* 10. Back Button Quit Confirmation Modal */}
      {showExitConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowExitConfirmModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/60 p-6 text-white shadow-2xl space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  क्या आप ऐप बंद करना चाहते हैं?
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  बैक बटन दबाने से ऐप गलती से बंद न हो, इसलिए यह पुष्टि (Confirmation) है।
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                आपका सारा हिसाब-किताब सुरक्षित सेव है। ऑटो-लॉक 5 मिनट निष्क्रिय रहने पर लागू होता है।
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm cursor-pointer transition-all shadow-lg"
              >
                ✅ नहीं, खेती जारी रखें
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  try {
                    localStorage.removeItem(LAST_ACTIVE_TS_KEY);
                  } catch {
                    // ignore
                  }
                  setShowSplash(true);
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm cursor-pointer transition-all shadow-lg"
              >
                🔒 हाँ, लॉक / बाहर निकलें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Offline Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
