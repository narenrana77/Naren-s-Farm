import React, { useState, useMemo } from 'react';
import {
  FarmDataStore,
  FarmPlot,
  AcreSubPlot,
  WeatherData,
} from '../types/farm';
import {
  generateAcreSubPlots,
  isAcreEmptyOrWet,
  calculateFasalAgeAndStage,
  applyNarenBattarPresetToSubPlots,
  sowWetAcresOnBattar,
  WHEAT_DBW_327_LABEL,
} from '../utils/acreUtils';
import { DEFAULT_STOCK_ITEMS } from '../utils/stockUtils';
import { PerAcreEntryForm } from './PerAcreEntryForm';
import { TodaysTasks } from './TodaysTasks';
import { SequentialFarmWorkPlan } from './SequentialFarmWorkPlan';
import { SectionHelpPopup } from './SectionHelpPopup';
import {
  exportFarmDataToExcel,
  exportFarmDataToPDF,
} from '../utils/exportUtils';
import { AppNavTab } from './Navbar';
import {
  Plus,
  Compass,
  Tractor,
  BookOpen,
  BarChart3,
  Bot,
  Sun,
  Trash2,
  X,
  Edit3,
  Package,
  Sprout,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  ListChecks,
} from 'lucide-react';

interface SocialFarmFeedHomeProps {
  store: FarmDataStore;
  currentWeather: WeatherData | null;
  onSaveStore: (newStore: FarmDataStore) => void;
  onUpdatePlot: (updatedPlot: FarmPlot, oldName?: string) => void;
  onNavigateTab: (tab: AppNavTab) => void;
  onOpenAIChat: () => void;
  onOpenQuickAcreFormModal: (plotId?: string, acreId?: string) => void;
  language: 'hi' | 'en';
}

export const SocialFarmFeedHome: React.FC<SocialFarmFeedHomeProps> = ({
  store,
  currentWeather,
  onSaveStore,
  onUpdatePlot,
  onNavigateTab,
  onOpenAIChat,
  onOpenQuickAcreFormModal,
  language,
}) => {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(
    store.plots[0]?.id || ''
  );

  // Opens when tapping any Acre Story Card or Right-Rail Acre Contact
  const [selectedAcreModal, setSelectedAcreModal] = useState<{
    plot: FarmPlot;
    acre: AcreSubPlot;
  } | null>(null);

  // Simple Feed Toggle: Expenses Feed vs Today's Tasks
  const [feedMode, setFeedMode] = useState<'expenses' | 'tasks'>('expenses');

  // Toggle 8-Stage Sequential Farm Work Plan cleanly from a Post button
  const [showWorkPlan, setShowWorkPlan] = useState<boolean>(false);

  // Quick In-Place Edit Modal for any Expense Post
  const [editingExpense, setEditingExpense] = useState<{
    category: 'machinery' | 'labour' | 'material';
    id: string;
    titleOrActivity: string;
    workerOrVendor: string;
    qtyOrAcres: number;
    rate: number;
    date: string;
  } | null>(null);

  const activePlot =
    store.plots.find((p) => p.id === selectedPlotId) || store.plots[0] || null;

  const activeSubPlots: AcreSubPlot[] = useMemo(() => {
    if (!activePlot) return [];
    if (activePlot.subPlots && activePlot.subPlots.length > 0) {
      return activePlot.subPlots;
    }
    return generateAcreSubPlots(
      activePlot.id,
      activePlot.name,
      activePlot.acres,
      activePlot.coordinates?.lat,
      activePlot.coordinates?.lng,
      activePlot.crop,
      activePlot.boundaries
    );
  }, [activePlot]);

  const emptyWetAcresCount = activeSubPlots.filter((sp) =>
    isAcreEmptyOrWet(sp)
  ).length;

  const totalSeasonExpense = useMemo(() => {
    const mach = store.machineryRecords.reduce((a, r) => a + r.totalAmount, 0);
    const lab = store.labourRecords.reduce((a, r) => a + r.totalAmount, 0);
    const mat = store.materialRecords.reduce((a, r) => a + r.totalAmount, 0);
    return mach + lab + mat;
  }, [store.machineryRecords, store.labourRecords, store.materialRecords]);

  const stockItems =
    store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;

  const totalGodownValue = useMemo(
    () =>
      stockItems.reduce(
        (sum, it) => sum + Math.round(it.currentStock * it.ratePerUnit),
        0
      ),
    [stockItems]
  );

  // Latest Expenses as Simple Facebook Feed Posts
  const recentExpenses = useMemo(() => {
    const combined: Array<{
      id: string;
      category: 'machinery' | 'labour' | 'material';
      icon: string;
      title: string;
      subtitle: string;
      date: string;
      amount: number;
      qtyOrAcres: number;
      rate: number;
      workerOrVendor: string;
    }> = [
      ...store.machineryRecords.map((m) => ({
        id: m.id,
        category: 'machinery' as const,
        icon: '🚜',
        title: m.activity,
        subtitle: `${m.plotName || 'खेत'} · ${m.driverName || 'ट्रैक्टर'}`,
        date: m.date,
        amount: m.totalAmount,
        qtyOrAcres: m.acres || 1,
        rate: m.ratePerUnit || m.totalAmount,
        workerOrVendor: m.driverName || '',
      })),
      ...store.labourRecords.map((l) => ({
        id: l.id,
        category: 'labour' as const,
        icon: '🖐️',
        title: l.activity,
        subtitle: `${l.plotName || 'खेत'} · ${l.mateName || 'लेबर'}`,
        date: l.date,
        amount: l.totalAmount,
        qtyOrAcres: l.acresCovered || l.workersCount || 1,
        rate: l.ratePerWorkerOrAcre || l.totalAmount,
        workerOrVendor: l.mateName || '',
      })),
      ...store.materialRecords.map((mat) => ({
        id: mat.id,
        category: 'material' as const,
        icon: '🧪',
        title: mat.itemName,
        subtitle: `${mat.quantity} ${mat.unit} · ${mat.vendor || 'दुकान'}`,
        date: mat.date,
        amount: mat.totalAmount,
        qtyOrAcres: mat.quantity || 1,
        rate: mat.ratePerUnit || mat.totalAmount,
        workerOrVendor: mat.vendor || '',
      })),
    ];
    return combined
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);
  }, [store.machineryRecords, store.labourRecords, store.materialRecords]);

  const pendingTasksCount = (store.tasks || []).filter(
    (t) => !t.isCompleted
  ).length;

  const handleSowAllWetAcresOnBattar = () => {
    if (!activePlot) return;
    const todayIso = new Date().toISOString().split('T')[0];
    const nextSubs = sowWetAcresOnBattar(
      activeSubPlots,
      undefined,
      WHEAT_DBW_327_LABEL,
      todayIso
    );
    onUpdatePlot({
      ...activePlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity: 'सभी खाली एकड़ों में बतर आने पर गेहूं DBW 327 की बिजाई',
      subPlots: nextSubs,
    });
  };

  const handleApplyNarenPreset = () => {
    if (!activePlot) return;
    const nextSubs = applyNarenBattarPresetToSubPlots(activeSubPlots);
    onUpdatePlot({
      ...activePlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity: 'एकड़ #5 व #6 में गेहूं DBW 327 बोया हुआ — बाकी खाली',
      subPlots: nextSubs,
    });
  };

  const handleDeleteExpense = (
    category: 'machinery' | 'labour' | 'material',
    id: string
  ) => {
    if (category === 'machinery') {
      onSaveStore({
        ...store,
        machineryRecords: store.machineryRecords.filter((m) => m.id !== id),
      });
    } else if (category === 'labour') {
      onSaveStore({
        ...store,
        labourRecords: store.labourRecords.filter((l) => l.id !== id),
      });
    } else {
      onSaveStore({
        ...store,
        materialRecords: store.materialRecords.filter((m) => m.id !== id),
      });
    }
  };

  const handleSaveEditedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const {
      category,
      id,
      titleOrActivity,
      workerOrVendor,
      qtyOrAcres,
      rate,
      date,
    } = editingExpense;
    const validQty = Math.max(0.1, Number(qtyOrAcres) || 1);
    const validRate = Math.max(0, Number(rate) || 0);
    const newTotal = Math.round(validQty * validRate);

    const nextStore = { ...store };

    if (category === 'machinery') {
      nextStore.machineryRecords = store.machineryRecords.map((m) =>
        m.id === id
          ? {
              ...m,
              activity: (titleOrActivity as any) || m.activity,
              driverName: workerOrVendor.trim() || m.driverName,
              acres: validQty,
              ratePerUnit: validRate,
              totalAmount: newTotal,
              paidAmount: m.isPaid ? newTotal : m.paidAmount,
              date,
            }
          : m
      );
      nextStore.plots = store.plots.map((p) => ({
        ...p,
        subPlots: (p.subPlots || []).map((sp) => {
          const hasMatch = (sp.expenseEntries || []).some(
            (en) => en.ledgerRecordId === id
          );
          if (!hasMatch) return sp;
          const updatedEntries = (sp.expenseEntries || []).map((en) =>
            en.ledgerRecordId === id
              ? {
                  ...en,
                  machineryOrJob: titleOrActivity || en.machineryOrJob,
                  workerName: workerOrVendor.trim() || en.workerName,
                  rate: validRate,
                  totalAmount: Math.round(validRate * (Number(sp.acres) || 1)),
                  date,
                }
              : en
          );
          const machExp = updatedEntries
            .filter((en) => en.category === 'machinery')
            .reduce((acc, en) => acc + en.totalAmount, 0);
          const labExp = updatedEntries
            .filter((en) => en.category === 'labour')
            .reduce((acc, en) => acc + en.totalAmount, 0);
          const matExp = updatedEntries
            .filter((en) => en.category === 'chemical_seed')
            .reduce((acc, en) => acc + en.totalAmount, 0);
          return {
            ...sp,
            expenseEntries: updatedEntries,
            machineryExpense: machExp,
            labourExpense: labExp,
            materialExpense: matExp,
            allocatedExpense: machExp + labExp + matExp,
          };
        }),
      }));
    } else if (category === 'labour') {
      nextStore.labourRecords = store.labourRecords.map((l) =>
        l.id === id
          ? {
              ...l,
              activity: (titleOrActivity as any) || l.activity,
              mateName: workerOrVendor.trim() || l.mateName,
              acresCovered: validQty,
              ratePerWorkerOrAcre: validRate,
              totalAmount: newTotal,
              paidAmount: l.isPaid ? newTotal : l.paidAmount,
              date,
            }
          : l
      );
    } else {
      nextStore.materialRecords = store.materialRecords.map((mat) =>
        mat.id === id
          ? {
              ...mat,
              itemName: titleOrActivity.trim() || mat.itemName,
              vendor: workerOrVendor.trim() || mat.vendor,
              quantity: validQty,
              ratePerUnit: validRate,
              totalAmount: newTotal,
              date,
            }
          : mat
      );
    }

    onSaveStore(nextStore);
    setEditingExpense(null);
  };

  return (
    <div className="w-full max-w-[1360px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-10">
      {/* ==================== LEFT RAIL (EXACT FACEBOOK UNBOXED SHORTCUTS — DESKTOP ONLY) ==================== */}
      <aside className="hidden xl:block xl:col-span-3 sticky top-20 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-lg shrink-0">
            👨‍🌾
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#050505] dark:text-[#E4E6EB] truncate">
              {store.farmSettings.ownerName || 'नरेन राणा जी'}
            </div>
            <div className="text-xs text-[#65676B] dark:text-[#B0B3B8] truncate">
              {currentWeather?.location || store.farmSettings.location}
            </div>
          </div>
        </div>

        {[
          {
            label: 'खर्चा लिखें',
            icon: <BookOpen className="w-6 h-6 text-[#16A34A]" />,
            onClick: () => onNavigateTab('hisab'),
          },
          {
            label: 'गोदाम स्टॉक',
            icon: <Package className="w-6 h-6 text-amber-500" />,
            onClick: () => onNavigateTab('stock'),
          },
          {
            label: 'एकड़ फॉर्म भरें',
            icon: <Sprout className="w-6 h-6 text-emerald-500" />,
            onClick: () =>
              onOpenQuickAcreFormModal(activePlot?.id, activeSubPlots[0]?.id),
          },
          {
            label: 'खेत का नक्शा',
            icon: <Compass className="w-6 h-6 text-sky-500" />,
            onClick: () => onNavigateTab('map'),
          },
          {
            label: '3D खेत देखें',
            icon: <Tractor className="w-6 h-6 text-orange-500" />,
            onClick: () => onNavigateTab('simulator'),
          },
          {
            label: 'रिपोर्ट / Excel व PDF',
            icon: <BarChart3 className="w-6 h-6 text-indigo-500" />,
            onClick: () => onNavigateTab('reports'),
          },
          {
            label: 'डॉ. किसान (AI सलाह)',
            icon: <Bot className="w-6 h-6 text-teal-500" />,
            onClick: onOpenAIChat,
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="w-full px-3 py-2.5 rounded-xl hover:bg-[#E4E6EB] dark:hover:bg-[#3A3B3C] flex items-center gap-3 text-[15px] font-semibold text-[#050505] dark:text-[#E4E6EB] cursor-pointer transition-colors text-left"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </aside>

      {/* ==================== CENTER FACEBOOK FEED (MAX-W-680PX, SUPER SIMPLE & CALM) ==================== */}
      <div className="xl:col-span-6 w-full max-w-[680px] mx-auto space-y-4">
        {/* 1. EXACT FACEBOOK "WHAT'S ON YOUR MIND?" COMPOSER BOX */}
        <section className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] p-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#16A34A]/15 flex items-center justify-center text-xl shrink-0">
              👨‍🌾
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenQuickAcreFormModal(activePlot?.id, activeSubPlots[0]?.id)
              }
              className="flex-1 min-h-[42px] px-4 py-2 rounded-full bg-[#F0F2F5] hover:bg-[#E4E6EB] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-left text-[15px] text-[#65676B] dark:text-[#B0B3B8] cursor-pointer transition-colors truncate"
            >
              नरेन जी, आज खेत में क्या काम या खर्चा हुआ?
            </button>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-[#3E4042] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onNavigateTab('hisab')}
              className="min-h-[42px] py-2 px-2 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer transition-colors"
            >
              <BookOpen className="w-5 h-5 text-[#16A34A] shrink-0" />
              <span className="truncate">खर्चा लिखें</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('stock')}
              className="min-h-[42px] py-2 px-2 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer transition-colors"
            >
              <Package className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">गोदाम स्टॉक</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenQuickAcreFormModal(activePlot?.id, activeSubPlots[0]?.id)
              }
              className="min-h-[42px] py-2 px-2 rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer transition-colors"
            >
              <Sprout className="w-5 h-5 text-sky-500 shrink-0" />
              <span className="truncate">एकड़ फॉर्म</span>
            </button>
          </div>
        </section>

        {/* 2. EXACT FACEBOOK STORIES ROW ("मेरे एकड़ #1 से #9" — TALL ROUNDED STORY CARDS) */}
        {activePlot && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-[15px] font-bold text-[#050505] dark:text-[#E4E6EB] truncate">
                  मेरे एकड़ ({activeSubPlots.length})
                </h2>
                {store.plots.length > 1 && (
                  <select
                    value={activePlot.id}
                    onChange={(e) => setSelectedPlotId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#242526] border border-slate-200 dark:border-[#3E4042] text-xs font-bold text-[#050505] dark:text-[#E4E6EB]"
                  >
                    {store.plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(p.name || 'खेत').split('(')[0].trim()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApplyNarenPreset}
                  className="text-xs font-bold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  #5,#6 DBW 327
                </button>
                {emptyWetAcresCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSowAllWetAcresOnBattar}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    · खाली बोएं
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-stretch gap-2.5 overflow-x-auto pb-1.5 no-scrollbar">
              {/* Story Card 0: Exact Facebook "Create Story" Card */}
              <button
                type="button"
                onClick={() =>
                  onOpenQuickAcreFormModal(activePlot.id, activeSubPlots[0]?.id)
                }
                className="w-[106px] h-[168px] rounded-2xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.1)] overflow-hidden shrink-0 flex flex-col cursor-pointer group active:scale-[0.98] transition-transform"
              >
                <div className="h-[112px] w-full bg-gradient-to-b from-emerald-500 to-emerald-700 flex items-center justify-center text-4xl">
                  🌾
                </div>
                <div className="relative flex-1 w-full bg-white dark:bg-[#242526] flex flex-col items-center justify-end pb-2.5 px-1">
                  <div className="absolute -top-5 w-9 h-9 rounded-full bg-[#16A34A] border-[3px] border-white dark:border-[#242526] text-white flex items-center justify-center shadow-sm">
                    <Plus className="w-5 h-5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-[#050505] dark:text-[#E4E6EB] leading-tight">
                    काम लिखें
                  </span>
                </div>
              </button>

              {/* Story Cards for Each Acre (#1 to #9) */}
              {activeSubPlots.map((sp) => {
                const emptyWet = isAcreEmptyOrWet(sp);
                const statusVal =
                  sp.acreStatus || (emptyWet ? 'Empty' : 'Seeded');
                const isSeeded = statusVal === 'Seeded';
                const isCultivated = statusVal === 'Cultivated';
                const ageStage = calculateFasalAgeAndStage(
                  statusVal,
                  sp.sowingDate
                );
                const exp =
                  (Number(sp.machineryExpense) || 0) +
                    (Number(sp.labourExpense) || 0) +
                    (Number(sp.materialExpense) || 0) ||
                  Number(sp.allocatedExpense) ||
                  0;

                const bgGrad = isSeeded
                  ? 'from-emerald-600 via-emerald-700 to-teal-900'
                  : isCultivated
                  ? 'from-amber-500 via-amber-600 to-orange-800'
                  : 'from-sky-500 via-blue-600 to-slate-800';

                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() =>
                      setSelectedAcreModal({ plot: activePlot, acre: sp })
                    }
                    className={`relative w-[106px] h-[168px] rounded-2xl bg-gradient-to-b ${bgGrad} shadow-[0_1px_2px_rgba(0,0,0,0.12)] overflow-hidden shrink-0 p-2.5 flex flex-col justify-between text-left cursor-pointer active:scale-[0.98] transition-transform`}
                  >
                    {/* Top-Left Round Story Avatar Badge (Just like Facebook!) */}
                    <div className="w-9 h-9 rounded-full bg-white/95 text-[#050505] border-2 border-[#16A34A] font-mono font-black text-xs flex items-center justify-center shadow-sm">
                      #{sp.acreNumber}
                    </div>

                    {/* Center Subtle Icon */}
                    <div className="text-3xl self-center opacity-90 select-none">
                      {isSeeded ? '🌾' : isCultivated ? '🚜' : '💧'}
                    </div>

                    {/* Bottom Clean Caption */}
                    <div className="space-y-0.5 text-white">
                      <div className="text-xs font-black leading-tight drop-shadow-xs">
                        एकड़ #{sp.acreNumber}
                      </div>
                      <div className="text-[11px] font-medium text-white/90 truncate">
                        {isSeeded
                          ? `बोया · ${ageStage.days}d`
                          : isCultivated
                          ? 'जुताई तैयार'
                          : 'खाली / गीला'}
                      </div>
                      {exp > 0 && (
                        <div className="text-[11px] font-mono font-black text-amber-200">
                          ₹{exp.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. FEED POST 1: TODAY'S FARM SUMMARY & WEATHER (SIMPLE FACEBOOK STATUS CARD) */}
        <article className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Post Header */}
          <div className="p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-xl shrink-0">
                🌾
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-[#050505] dark:text-[#E4E6EB] truncate">
                  आज का खेत हाल व हिसाब
                </div>
                <div className="text-xs text-[#65676B] dark:text-[#B0B3B8] flex items-center gap-1.5 flex-wrap">
                  {currentWeather ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>
                        {Math.round(currentWeather.temperature)}°C ·{' '}
                        {currentWeather.agriAdvice?.isSuitableForSpray
                          ? 'स्प्रे सही है'
                          : 'हवा देखें'}
                      </span>
                    </>
                  ) : (
                    <span>{store.farmSettings.location}</span>
                  )}
                </div>
              </div>
            </div>

            <SectionHelpPopup
              compact
              titleHi="आसान फेसबुक-स्टाइल होम गाइड"
              bulletsHi={[
                'ऊपर "आज खेत में क्या काम हुआ?" बॉक्स पर दबाकर तुरंत काम या खर्चा लिखें।',
                'एकड़ स्टोरीज (#1 से #9) में किसी भी एकड़ पर दबाकर उसकी पूरी जानकारी देखें या बदलें।',
                'नीचे Excel, PDF और 8-चरण प्लान के सीधे बटन दिए गए हैं।',
              ]}
            />
          </div>

          {/* Post Body: Clean 2 Numbers */}
          <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab('hisab')}
              className="p-3.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-left cursor-pointer transition-colors"
            >
              <span className="text-xs font-semibold text-[#65676B] dark:text-[#B0B3B8] block">
                कुल सीजन खर्च
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-[#050505] dark:text-[#E4E6EB] tabular-nums mt-0.5 block">
                ₹{totalSeasonExpense.toLocaleString('en-IN')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('stock')}
              className="p-3.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-left cursor-pointer transition-colors"
            >
              <span className="text-xs font-semibold text-[#65676B] dark:text-[#B0B3B8] block">
                गोदाम बचा स्टॉक
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-[#16A34A] dark:text-emerald-400 tabular-nums mt-0.5 block">
                ₹{totalGodownValue.toLocaleString('en-IN')}
              </span>
            </button>
          </div>

          {/* Facebook-Style 3-Button Action Footer */}
          <div className="px-2 py-1 border-t border-slate-200/80 dark:border-[#3E4042] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => exportFarmDataToExcel(store)}
              className="min-h-[40px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={() => exportFarmDataToPDF(store)}
              className="min-h-[40px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWorkPlan((prev) => !prev)}
              className={`min-h-[40px] rounded-lg flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold cursor-pointer ${
                showWorkPlan
                  ? 'bg-[#16A34A]/10 text-[#16A34A] dark:text-emerald-400'
                  : 'hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] text-[#65676B] dark:text-[#B0B3B8]'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>8-चरण प्लान</span>
            </button>
          </div>
        </article>

        {/* Expandable 8-Stage Sequential Farm Plan (Only opens when farmer taps "8-चरण प्लान") */}
        {showWorkPlan && (
          <SequentialFarmWorkPlan
            store={store}
            onSaveStore={onSaveStore}
            defaultCollapsed={false}
          />
        )}

        {/* 4. FEED POST 2: SIMPLE GODOWN STOCK SNAPSHOT CARD */}
        <article className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-xl shrink-0">
                📦
              </div>
              <div>
                <div className="text-[15px] font-bold text-[#050505] dark:text-[#E4E6EB]">
                  गोदाम स्टॉक (बचा सामान)
                </div>
                <div className="text-xs text-[#65676B] dark:text-[#B0B3B8]">
                  कट्टे, बोतलें, पैकेट व अनाज साइलो
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('stock')}
              className="text-xs font-bold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              सब देखें
            </button>
          </div>

          <div className="px-3.5 pb-3.5 grid grid-cols-2 gap-2.5">
            {stockItems.slice(0, 4).map((item) => {
              const icon =
                item.unit === 'bag'
                  ? '🛍️'
                  : item.unit === 'litre'
                  ? '🍾'
                  : item.unit === 'packet'
                  ? '🧧'
                  : item.unit === 'quintal'
                  ? '🛢️'
                  : '🪣';
              const isLow = item.currentStock <= (item.category === 'grain' ? 2 : 1);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab('stock')}
                  className="p-3 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-left cursor-pointer transition-colors"
                >
                  <div className="text-xs font-bold text-[#050505] dark:text-[#E4E6EB] truncate">
                    {icon} {item.name.split('(')[0].trim()}
                  </div>
                  <div
                    className={`text-base font-mono font-black mt-1 tabular-nums ${
                      isLow
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-[#16A34A] dark:text-emerald-400'
                    }`}
                  >
                    {item.currentStock} {item.unitLabelHi}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-2 py-1 border-t border-slate-200/80 dark:border-[#3E4042] grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => onNavigateTab('stock')}
              className="min-h-[40px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
            >
              <Package className="w-4 h-4 text-amber-500" />
              <span>पूरा गोदाम खोलें</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('hisab')}
              className="min-h-[40px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#16A34A]" />
              <span>खर्च / स्प्रे लिखें</span>
            </button>
          </div>
        </article>

        {/* 5. FEED SWITCHER (हाल के खर्चे | आज के काम) */}
        <div className="flex items-center justify-between gap-2 px-1 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFeedMode('expenses')}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-colors ${
                feedMode === 'expenses'
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#E4E6EB] dark:bg-[#3A3B3C] text-[#050505] dark:text-[#E4E6EB]'
              }`}
            >
              हाल के खर्चे ({recentExpenses.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedMode('tasks')}
              className={`min-h-[38px] px-4 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-colors flex items-center gap-1.5 ${
                feedMode === 'tasks'
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-[#E4E6EB] dark:bg-[#3A3B3C] text-[#050505] dark:text-[#E4E6EB]'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>आज के काम ({pendingTasksCount})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('hisab')}
            className="text-xs font-bold text-[#16A34A] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            सभी खर्चे →
          </button>
        </div>

        {/* 6. INDIVIDUAL EXPENSE POSTS (EXACT FACEBOOK POST CARD SIMPLICITY) */}
        {feedMode === 'expenses' ? (
          recentExpenses.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[#65676B] dark:text-[#B0B3B8]">
                अभी कोई खर्चा नहीं लिखा है।
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('hisab')}
                className="px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer"
              >
                + पहला खर्चा लिखें
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentExpenses.map((item) => (
                <article
                  key={`${item.category}-${item.id}`}
                  className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] overflow-hidden"
                >
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-[#F0F2F5] dark:bg-[#3A3B3C] flex items-center justify-center text-xl shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-[#050505] dark:text-[#E4E6EB] truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#65676B] dark:text-[#B0B3B8] truncate">
                          {item.subtitle} · {item.date}
                        </div>
                      </div>
                    </div>

                    <div className="text-lg font-mono font-black text-[#050505] dark:text-[#E4E6EB] tabular-nums shrink-0">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Facebook-Style Flat Bottom Post Bar */}
                  <div className="px-2 py-1 border-t border-slate-200/80 dark:border-[#3E4042] grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingExpense({
                          category: item.category,
                          id: item.id,
                          titleOrActivity: item.title,
                          workerOrVendor: item.workerOrVendor,
                          qtyOrAcres: item.qtyOrAcres,
                          rate: item.rate,
                          date: item.date,
                        })
                      }
                      className="min-h-[38px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>बदलें</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(item.category, item.id)}
                      className="min-h-[38px] rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>हटाएं</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('hisab')}
                      className="min-h-[38px] rounded-lg hover:bg-[#F0F2F5] dark:hover:bg-[#3A3B3C] flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-[#65676B] dark:text-[#B0B3B8] cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>खाता</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : (
          <div className="rounded-xl bg-white dark:bg-[#242526] shadow-[0_1px_2px_rgba(0,0,0,0.08)] p-4">
            <TodaysTasks
              store={store}
              onUpdateTasks={(newTasks) =>
                onSaveStore({ ...store, tasks: newTasks })
              }
              onNavigateTab={(tab) => onNavigateTab(tab)}
              language={language}
            />
          </div>
        )}
      </div>

      {/* ==================== RIGHT RAIL (EXACT FACEBOOK "CONTACTS" STYLE ACRE LIST — DESKTOP ONLY) ==================== */}
      <aside className="hidden xl:block xl:col-span-3 sticky top-20 space-y-2">
        <div className="px-3 text-[15px] font-bold text-[#65676B] dark:text-[#B0B3B8]">
          मेरे एकड़ (सीधे खोलें)
        </div>

        <div className="space-y-0.5">
          {activePlot &&
            activeSubPlots.map((sp) => {
              const emptyWet = isAcreEmptyOrWet(sp);
              const isSeeded = !emptyWet;
              const exp =
                (Number(sp.machineryExpense) || 0) +
                  (Number(sp.labourExpense) || 0) +
                  (Number(sp.materialExpense) || 0) ||
                Number(sp.allocatedExpense) ||
                0;

              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() =>
                    setSelectedAcreModal({ plot: activePlot, acre: sp })
                  }
                  className="w-full px-3 py-2 rounded-xl hover:bg-[#E4E6EB] dark:hover:bg-[#3A3B3C] flex items-center justify-between gap-2.5 cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-9 h-9 rounded-full bg-white dark:bg-[#242526] border border-slate-200 dark:border-[#3E4042] flex items-center justify-center text-sm font-mono font-black shrink-0">
                      #{sp.acreNumber}
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#F0F2F5] dark:border-[#18191A] ${
                          isSeeded ? 'bg-[#31A24C]' : 'bg-sky-500'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#050505] dark:text-[#E4E6EB] truncate">
                        एकड़ #{sp.acreNumber}
                      </div>
                      <div className="text-xs text-[#65676B] dark:text-[#B0B3B8] truncate">
                        {isSeeded ? 'गेहूं DBW 327' : 'खाली / गीला'}
                      </div>
                    </div>
                  </div>

                  {exp > 0 && (
                    <span className="text-xs font-mono font-bold text-[#65676B] dark:text-[#B0B3B8] shrink-0">
                      ₹{exp.toLocaleString('en-IN')}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </aside>

      {/* ==================== MODAL 1: PER-ACRE FORM MODAL ==================== */}
      {selectedAcreModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedAcreModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3.5 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <span className="text-sm sm:text-base font-black text-emerald-300">
                🌾 एकड़ #{selectedAcreModal.acre.acreNumber} — पूरा विवरण व खर्चा
              </span>
              <button
                type="button"
                onClick={() => setSelectedAcreModal(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PerAcreEntryForm
              plot={selectedAcreModal.plot}
              acre={selectedAcreModal.acre}
              store={store}
              onSaveAcreAndStore={(updatedPlot, updatedStore) => {
                if (updatedStore) {
                  onSaveStore(updatedStore);
                } else {
                  onUpdatePlot(updatedPlot);
                }
                const nextAcre = (updatedPlot.subPlots || []).find(
                  (a) => a.id === selectedAcreModal.acre.id
                );
                if (nextAcre) {
                  setSelectedAcreModal({ plot: updatedPlot, acre: nextAcre });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ==================== MODAL 2: QUICK EXPENSE EDIT MODAL ==================== */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={() => setEditingExpense(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEditedExpense}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#242526] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#3E4042] pb-3">
              <h3 className="text-base font-black text-[#050505] dark:text-[#E4E6EB]">
                ✏️ खर्चा बदलें
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="w-8 h-8 rounded-full bg-[#E4E6EB] dark:bg-[#3A3B3C] text-[#050505] dark:text-[#E4E6EB] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#65676B] dark:text-[#B0B3B8] mb-1">
                  काम या सामान का नाम
                </label>
                <input
                  type="text"
                  value={editingExpense.titleOrActivity}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      titleOrActivity: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] text-sm font-bold text-[#050505] dark:text-[#E4E6EB]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676B] dark:text-[#B0B3B8] mb-1">
                  ड्राइवर / मजदूर / दुकान
                </label>
                <input
                  type="text"
                  value={editingExpense.workerOrVendor}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      workerOrVendor: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] text-sm font-bold text-[#050505] dark:text-[#E4E6EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#65676B] dark:text-[#B0B3B8] mb-1">
                    मात्रा / एकड़
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={editingExpense.qtyOrAcres}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        qtyOrAcres: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] text-sm font-mono font-black text-[#050505] dark:text-[#E4E6EB]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#65676B] dark:text-[#B0B3B8] mb-1">
                    रेट (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingExpense.rate}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        rate: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] text-sm font-mono font-black text-[#050505] dark:text-[#E4E6EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#65676B] dark:text-[#B0B3B8] mb-1">
                  तारीख
                </label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      date: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F0F2F5] dark:bg-[#3A3B3C] text-sm font-bold text-[#050505] dark:text-[#E4E6EB]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="flex-1 py-2.5 rounded-lg bg-[#E4E6EB] dark:bg-[#3A3B3C] text-[#050505] dark:text-[#E4E6EB] font-bold text-sm cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
              >
                सेव करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
