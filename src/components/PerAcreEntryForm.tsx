import React, { useState, useEffect, useMemo } from 'react';
import {
  AcreSubPlot,
  AcreStatusType,
  SowingMethodType,
  AcreExpenseEntry,
  FarmPlot,
  FarmDataStore,
  MachineryActivity,
  MachineryRecord,
  StockItem,
} from '../types/farm';
import {
  calculateFasalAgeAndStage,
  formatDateDDMMYYYY,
  WET_EMPTY_ACRE_LABEL,
  WHEAT_DBW_327_LABEL,
} from '../utils/acreUtils';
import {
  DEFAULT_STOCK_ITEMS,
  applyStockOutTransaction,
} from '../utils/stockUtils';
import { ALL_CROP_VARIETIES } from '../constants/cropVarieties';
import { FarmStorage } from '../services/storage';
import { SectionHelpPopup } from './SectionHelpPopup';
import {
  Calendar,
  CheckCircle2,
  Tractor,
  UserCheck,
  IndianRupee,
  PlusCircle,
  Trash2,
  Edit3,
  X,
  Sparkles,
  Sprout,
  Droplets,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface PerAcreEntryFormProps {
  plot: FarmPlot;
  acre: AcreSubPlot;
  store?: FarmDataStore;
  onSaveAcreAndStore: (
    updatedPlot: FarmPlot,
    updatedStore?: FarmDataStore,
    toastMessage?: string
  ) => void;
  compact?: boolean;
}

export const ACRE_STATUS_OPTIONS: Array<{
  value: AcreStatusType;
  labelHi: string;
  labelEn: string;
  badgeColor: string;
  icon: string;
}> = [
  {
    value: 'Empty',
    labelHi: 'Empty (खाली / गीला खेत)',
    labelEn: 'Empty',
    badgeColor: 'bg-sky-600 text-white border-sky-400',
    icon: '💧',
  },
  {
    value: 'Irrigated (Rauni)',
    labelHi: 'Irrigated / Rauni (रौनी / पलेवा)',
    labelEn: 'Irrigated (Rauni)',
    badgeColor: 'bg-blue-600 text-white border-blue-400',
    icon: '🌊',
  },
  {
    value: 'Cultivated',
    labelHi: 'Cultivated (जुताई / बतर तैयार)',
    labelEn: 'Cultivated',
    badgeColor: 'bg-amber-500 text-slate-950 border-amber-300',
    icon: '🚜',
  },
  {
    value: 'Seeded',
    labelHi: 'Seeded (बिजाई पूर्ण / बोया हुआ)',
    labelEn: 'Seeded',
    badgeColor: 'bg-emerald-600 text-white border-emerald-400',
    icon: '🌱',
  },
];

export const SOWING_METHOD_OPTIONS: Array<{
  value: SowingMethodType;
  label: string;
}> = [
  { value: 'Super Seeder', label: 'Super Seeder (सुपर सीडर)' },
  { value: 'Happy Seeder', label: 'Happy Seeder (हैप्पी सीडर)' },
  { value: 'Drill', label: 'Drill / Zero Till (सीड ड्रिल / जीरो टिल)' },
  { value: 'Foliar Spread', label: 'Foliar Spread (छिटकाव / ब्रॉडकास्ट)' },
];

export const ALL_MACHINERY_DROPDOWN_OPTIONS: Array<{
  value: string;
  label: string;
  shortGameLabel: string;
  icon: string;
  category: 'machinery' | 'labour' | 'chemical_seed';
  usesStockByDefault?: boolean;
}> = [
  // --- 1. बुवाई मशीनरी (Sowing Machinery) ---
  {
    value: 'Super Seeder',
    label: 'Super Seeder (सुपर सीडर से बिजाई)',
    shortGameLabel: 'सुपर सीडर बिजाई',
    icon: '🌱',
    category: 'machinery',
    usesStockByDefault: true,
  },
  {
    value: 'Happy Seeder',
    label: 'Happy Seeder (हैप्पी सीडर से बिजाई)',
    shortGameLabel: 'हैप्पी सीडर',
    icon: '🌾',
    category: 'machinery',
    usesStockByDefault: true,
  },
  {
    value: 'Zero Till Drill',
    label: 'Zero Till Drill (जीरो टिल ड्रिल बिजाई)',
    shortGameLabel: 'जीरो टिल ड्रिल',
    icon: '🚜',
    category: 'machinery',
    usesStockByDefault: true,
  },
  {
    value: 'Seed Drill',
    label: 'Seed Cum Fertilizer Drill (सीड ड्रिल मशीन बिजाई)',
    shortGameLabel: 'सीड ड्रिल',
    icon: '🌾',
    category: 'machinery',
    usesStockByDefault: true,
  },
  // --- 2. स्प्रे व फोलियर ब्रॉडकास्टिंग (Spray & Foliar Broadcasting) ---
  {
    value: 'Fertiliser Broadcasting (खाद/यूरिया छींटा)',
    label: '🖐️ खाद / यूरिया छींटा व ब्रॉडकास्टिंग (Fertiliser Broadcasting)',
    shortGameLabel: 'खाद/यूरिया छींटा',
    icon: '🖐️',
    category: 'labour',
    usesStockByDefault: true,
  },
  {
    value: 'Pesticide Broadcasting (दवाई/जिंक छींटा)',
    label: '🛡️ दवाई / जिंक / कीटनाशक फोलियर छींटा (Pesticide/Zinc Broadcasting)',
    shortGameLabel: 'दवाई/जिंक छींटा',
    icon: '🛡️',
    category: 'labour',
    usesStockByDefault: true,
  },
  {
    value: 'Manual Spray (पिट्ठू/बैटरी पंप स्प्रे)',
    label: '🎒 पिट्ठू / बैटरी पंप स्प्रे छिड़काव (Manual Knapsack Spray)',
    shortGameLabel: 'पंप स्प्रे छिड़काव',
    icon: '🎒',
    category: 'labour',
    usesStockByDefault: true,
  },
  {
    value: 'Foliar Spread',
    label: '✨ फोलियर स्प्रे / ब्रॉडकास्टिंग (Foliar Spray - NPK / Zinc / Micronutrient)',
    shortGameLabel: 'फोलियर स्प्रे / ब्रॉडकास्ट',
    icon: '✨',
    category: 'labour',
    usesStockByDefault: true,
  },
  {
    value: 'Seed Broadcasting (बीज छींटा बिजाई)',
    label: '🌾 हाथ से बीज छींटा बिजाई (Seed Broadcasting by Hand)',
    shortGameLabel: 'बीज छींटा बिजाई',
    icon: '🌾',
    category: 'labour',
    usesStockByDefault: true,
  },
  {
    value: 'Boom Sprayer',
    label: '🚿 ट्रैक्टर बूम स्प्रेयर पंप छिड़काव (Tractor Boom Sprayer)',
    shortGameLabel: 'ट्रैक्टर बूम स्प्रेयर',
    icon: '🚿',
    category: 'machinery',
    usesStockByDefault: true,
  },
  {
    value: 'Drone Spray',
    label: '🚁 किसान ड्रोन स्प्रे छिड़काव (Kisan Drone Foliar Spray)',
    shortGameLabel: 'ड्रोन फोलियर स्प्रे',
    icon: '🚁',
    category: 'machinery',
    usesStockByDefault: true,
  },
  // --- 3. जुताई व खेत तैयारी मशीनरी (Tillage & Land Prep Machinery) ---
  {
    value: 'Rotavator',
    label: 'Rotavator (रोटावेटर जुताई / बतर तैयारी)',
    shortGameLabel: 'रोटावेटर',
    icon: '🚜',
    category: 'machinery',
  },
  {
    value: 'Cultivator',
    label: 'Cultivator / Tillers (कल्टीवेटर / हल जुताई)',
    shortGameLabel: 'कल्टीवेटर (हल)',
    icon: '⚙️',
    category: 'machinery',
  },
  {
    value: 'Disc Harrow',
    label: 'Disc Harrow (डिस्क हैरो / तवियां)',
    shortGameLabel: 'तवियां (हैरो)',
    icon: '💿',
    category: 'machinery',
  },
  {
    value: 'MB Plough / Deep Plough',
    label: 'MB Plough / Deep Plough (तोता हल / एम.बी. प्लाऊ गहरी जुताई)',
    shortGameLabel: 'एम.बी. प्लाऊ',
    icon: '⛏️',
    category: 'machinery',
  },
  {
    value: 'Chisel Plough / Subsoiler',
    label: 'Chisel Plough / Subsoiler (सबसॉयलर / चिज़ल हल)',
    shortGameLabel: 'सबसॉयलर',
    icon: '🔩',
    category: 'machinery',
  },
  {
    value: 'Laser Land Leveler',
    label: 'Laser Land Leveler (लेजर लेवलर / कंप्यूटर गोड़ी समतल)',
    shortGameLabel: 'कंप्यूटर गोड़ी',
    icon: '📐',
    category: 'machinery',
  },
  {
    value: 'Suhaga / Plank',
    label: 'Suhaga / Plank (सुहागा / पाटा लगाना)',
    shortGameLabel: 'सुहागा / पाटा',
    icon: '🪵',
    category: 'machinery',
  },
  {
    value: 'Bund Maker / Ridger',
    label: 'Bund Maker / Ridger (मेड़बंदी / डॉल / रिजर मशीन)',
    shortGameLabel: 'मेड़ / डॉल मशीन',
    icon: '⛰️',
    category: 'machinery',
  },
  // --- 4. सिंचाई, कटाई व ढुलाई मशीनरी ---
  {
    value: 'Rauni Irrigation',
    label: 'Rauni / Irrigation (रौनी / पलेवा / ट्यूबवेल सिंचाई)',
    shortGameLabel: 'रौनी / सिंचाई',
    icon: '💧',
    category: 'machinery',
  },
  {
    value: 'Combine Harvester',
    label: 'Combine Harvester (कंबाइन मशीन से फसल कटाई)',
    shortGameLabel: 'कंबाइन कटाई',
    icon: '🌾',
    category: 'machinery',
  },
  {
    value: 'Straw Reaper',
    label: 'Straw Reaper (भूसा / तूड़ी बनाने वाली रीपर मशीन)',
    shortGameLabel: 'भूसा रीपर',
    icon: '🌪️',
    category: 'machinery',
  },
  {
    value: 'Baler / Parali Gaanth',
    label: 'Baler Machine (पराली गांठ बनाने वाला बेलर)',
    shortGameLabel: 'पराली बेलर',
    icon: '📦',
    category: 'machinery',
  },
  {
    value: 'Mulcher / Shredder',
    label: 'Mulcher / Shredder (पराली मल्चर कटर)',
    shortGameLabel: 'मल्चर कटर',
    icon: '🔪',
    category: 'machinery',
  },
  {
    value: 'Thresher',
    label: 'Thresher (थ्रेशर मशीन कढ़ाई)',
    shortGameLabel: 'थ्रेशर',
    icon: '⚙️',
    category: 'machinery',
  },
  {
    value: 'Trolley / Transport',
    label: 'Trolley / Transport (ट्रॉली / मंडी ढुलाई किराया)',
    shortGameLabel: 'ट्रॉली ढुलाई',
    icon: '🛞',
    category: 'machinery',
  },
  {
    value: 'Other',
    label: 'Other Farm Work (अन्य कृषि कार्य)',
    shortGameLabel: 'अन्य कार्य',
    icon: '🔧',
    category: 'machinery',
  },
];

export function doesActivityUseStock(act: string): boolean {
  const lower = act.toLowerCase();
  return (
    lower.includes('spray') ||
    lower.includes('foliar') ||
    lower.includes('broadcasting') ||
    lower.includes('छींटा') ||
    lower.includes('स्प्रे') ||
    lower.includes('seeder') ||
    lower.includes('drill') ||
    lower.includes('बिजाई')
  );
}

export const PerAcreEntryForm: React.FC<PerAcreEntryFormProps> = ({
  plot,
  acre,
  store,
  onSaveAcreAndStore,
}) => {
  const initialStatus: AcreStatusType =
    acre.acreStatus ||
    (`${acre.cropVariety || ''} ${acre.cropName || ''}`.includes('खाली')
      ? 'Empty'
      : 'Seeded');

  const [acreStatus, setAcreStatus] = useState<AcreStatusType>(initialStatus);
  const [sowingDate, setSowingDate] = useState<string>(
    acre.sowingDate || (initialStatus === 'Seeded' ? '2026-11-05' : '')
  );
  const [sowingMethod, setSowingMethod] = useState<SowingMethodType>(
    acre.sowingMethod || 'Super Seeder'
  );
  const [cropVariety, setCropVariety] = useState<string>(
    acre.cropVariety && !acre.cropVariety.includes('खाली')
      ? acre.cropVariety
      : WHEAT_DBW_327_LABEL
  );

  // Collapse / Expand state for the 2 form sections
  const [isStatusSectionCollapsed, setIsStatusSectionCollapsed] =
    useState<boolean>(false);
  const [isExpenseFormCollapsed, setIsExpenseFormCollapsed] =
    useState<boolean>(false);

  // Expense Form State
  const [selectedMachinery, setSelectedMachinery] =
    useState<string>('Super Seeder');
  const [workerName, setWorkerName] = useState<string>('');
  const [rateInput, setRateInput] = useState<string>('');
  const [jobDate, setJobDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [jobTimeSlot, setJobTimeSlot] = useState<string>('सुबह (Morning)');
  const [rememberedHint, setRememberedHint] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Stock Deduction State for Spray / Foliar Broadcasting / Sowing
  const [deductFromStock, setDeductFromStock] = useState<boolean>(true);
  const [selectedStockItemId, setSelectedStockItemId] = useState<string>('');
  const [stockQuantityUsed, setStockQuantityUsed] = useState<string>('1');

  const availableStockItems: StockItem[] = useMemo(() => {
    const base = store || FarmStorage.load();
    return base.stockItems && base.stockItems.length > 0
      ? base.stockItems
      : DEFAULT_STOCK_ITEMS;
  }, [store]);

  // Auto-select appropriate stock item when activity changes
  useEffect(() => {
    const usesStock = doesActivityUseStock(selectedMachinery);
    setDeductFromStock(usesStock);
    if (usesStock && availableStockItems.length > 0) {
      const lower = selectedMachinery.toLowerCase();
      let preferred: StockItem | undefined;
      if (lower.includes('यूरिया') || lower.includes('fertiliser')) {
        preferred = availableStockItems.find(
          (s) =>
            s.name.toLowerCase().includes('urea') ||
            s.name.includes('यूरिया') ||
            s.category === 'khad'
        );
      } else if (
        lower.includes('जिंक') ||
        lower.includes('foliar') ||
        lower.includes('फोलियर')
      ) {
        preferred = availableStockItems.find(
          (s) =>
            s.name.toLowerCase().includes('zinc') ||
            s.name.includes('जिंक') ||
            s.category === 'spray'
        );
      } else if (
        lower.includes('spray') ||
        lower.includes('स्प्रे') ||
        lower.includes('drone') ||
        lower.includes('boom')
      ) {
        preferred = availableStockItems.find((s) => s.category === 'spray');
      } else if (
        lower.includes('seeder') ||
        lower.includes('drill') ||
        lower.includes('बीज')
      ) {
        preferred = availableStockItems.find((s) => s.category === 'beej');
      }
      setSelectedStockItemId(
        (preferred || availableStockItems[0])?.id || ''
      );
    }
  }, [selectedMachinery, availableStockItems]);

  // Sync local state when switching between Acres (#1, #2, #5, #6...)
  useEffect(() => {
    const nextStatus: AcreStatusType =
      acre.acreStatus ||
      (`${acre.cropVariety || ''} ${acre.cropName || ''}`.includes('खाली')
        ? 'Empty'
        : 'Seeded');
    setAcreStatus(nextStatus);
    setSowingDate(
      acre.sowingDate || (nextStatus === 'Seeded' ? '2026-11-05' : '')
    );
    setSowingMethod(acre.sowingMethod || 'Super Seeder');
    setCropVariety(
      acre.cropVariety && !acre.cropVariety.includes('खाली')
        ? acre.cropVariety
        : WHEAT_DBW_327_LABEL
    );
    setRateInput('');
    setRememberedHint(null);
    setEditingEntryId(null);
  }, [acre.id]);

  const vendorRatesList = useMemo(() => {
    if (store?.vendorRates && store.vendorRates.length > 0) {
      return store.vendorRates;
    }
    try {
      return FarmStorage.load().vendorRates || [];
    } catch {
      return [];
    }
  }, [store?.vendorRates]);

  const rememberedWorkers = useMemo(() => {
    const names = new Set<string>();
    vendorRatesList.forEach((v) => {
      if (v.vendorName && v.vendorName.trim()) {
        names.add(v.vendorName.trim());
      }
    });
    return Array.from(names);
  }, [vendorRatesList]);

  const handleSelectMachinery = (mach: string) => {
    setSelectedMachinery(mach);
    const matchByWorkerAndMach = vendorRatesList.find(
      (v) =>
        v.serviceOrItem.toLowerCase() === mach.toLowerCase() &&
        workerName.trim() &&
        v.vendorName.toLowerCase() === workerName.trim().toLowerCase()
    );
    const matchByMach =
      matchByWorkerAndMach ||
      vendorRatesList.find(
        (v) => v.serviceOrItem.toLowerCase() === mach.toLowerCase()
      );

    if (matchByMach) {
      if (!workerName.trim()) {
        setWorkerName(matchByMach.vendorName);
      }
      setRateInput(String(matchByMach.defaultRate));
      setRememberedHint(
        `⚡ याद किया गया रेट: ${matchByMach.vendorName} — ₹${matchByMach.defaultRate}/${matchByMach.unit === 'hour' ? 'घंटा' : 'एकड़'}`
      );
    } else {
      setRememberedHint(null);
    }
  };

  const handleWorkerNameChange = (nameVal: string) => {
    setWorkerName(nameVal);
    const trimmed = nameVal.trim().toLowerCase();
    if (!trimmed) {
      setRememberedHint(null);
      return;
    }
    const exactMatch =
      vendorRatesList.find(
        (v) =>
          v.vendorName.toLowerCase() === trimmed &&
          v.serviceOrItem.toLowerCase() === selectedMachinery.toLowerCase()
      ) ||
      vendorRatesList.find((v) => v.vendorName.toLowerCase() === trimmed);

    if (exactMatch) {
      setRateInput(String(exactMatch.defaultRate));
      setRememberedHint(
        `⚡ "${exactMatch.vendorName}" का याद किया गया रेट: ₹${exactMatch.defaultRate} (${exactMatch.serviceOrItem})`
      );
    } else {
      setRememberedHint('✨ नया कामगार नाम — सेव करने पर अगली बार के लिए याद रखा जाएगा');
    }
  };

  const liveAgeAndStage = useMemo(
    () => calculateFasalAgeAndStage(acreStatus, sowingDate),
    [acreStatus, sowingDate]
  );

  const buildUpdatedAcreSubPlot = (
    nextExpenseEntries: AcreExpenseEntry[]
  ): AcreSubPlot => {
    const isSeeded = acreStatus === 'Seeded';
    const effectiveSowingDate = isSeeded
      ? sowingDate || new Date().toISOString().split('T')[0]
      : '';
    const ageStage = calculateFasalAgeAndStage(acreStatus, effectiveSowingDate);

    const machExp = nextExpenseEntries
      .filter((e) => e.category === 'machinery')
      .reduce((acc, e) => acc + e.totalAmount, 0);
    const labExp = nextExpenseEntries
      .filter((e) => e.category === 'labour')
      .reduce((acc, e) => acc + e.totalAmount, 0);
    const matExp = nextExpenseEntries
      .filter((e) => e.category === 'chemical_seed')
      .reduce((acc, e) => acc + e.totalAmount, 0);
    const totalExp = machExp + labExp + matExp;

    const statusActivities: string[] = [];
    if (acreStatus === 'Empty') {
      statusActivities.push('खाली खेत (गीला / बतर का इंतजार)');
    } else if (acreStatus === 'Irrigated (Rauni)') {
      statusActivities.push('रौनी / पलेवा सिंचाई (Irrigated / Rauni)');
    } else if (acreStatus === 'Cultivated') {
      statusActivities.push('जुताई व बतर तैयार (Cultivated)');
    } else if (acreStatus === 'Seeded') {
      statusActivities.push(
        `${sowingMethod} से बिजाई (${
          cropVariety.includes('DBW 327')
            ? 'गेहूं DBW 327'
            : cropVariety.split('(')[0].trim()
        })`
      );
    }

    nextExpenseEntries.forEach((entry) => {
      const jobTag = `${entry.machineryOrJob} (${entry.workerName} - ₹${entry.totalAmount})`;
      if (!statusActivities.includes(jobTag)) {
        statusActivities.push(jobTag);
      }
    });

    const effectiveVariety = isSeeded ? cropVariety : WET_EMPTY_ACRE_LABEL;
    const effectiveCropName = isSeeded
      ? cropVariety.includes('DBW 327')
        ? 'गेहूं (DBW 327)'
        : cropVariety.split('(')[0].trim()
      : `खाली खेत (${acreStatus})`;

    return {
      ...acre,
      acreStatus,
      sowingDate: effectiveSowingDate,
      sowingMethod: isSeeded ? sowingMethod : undefined,
      cropVariety: effectiveVariety,
      cropName: effectiveCropName,
      stage: ageStage.stage,
      moisturePct:
        acreStatus === 'Empty' || acreStatus === 'Irrigated (Rauni)'
          ? 92
          : acreStatus === 'Cultivated'
          ? 74
          : 68,
      completedActivities: statusActivities,
      expenseEntries: nextExpenseEntries,
      machineryExpense: machExp,
      labourExpense: labExp,
      materialExpense: matExp,
      allocatedExpense: totalExp,
      estimatedYieldQtl: isSeeded ? Math.round((acre.acres || 1) * 27 * 10) / 10 : 0,
      earnedIncome: isSeeded ? Math.round((acre.acres || 1) * 27 * 2425) : 0,
      notes: isSeeded
        ? `एकड़ #${acre.acreNumber} — ${sowingMethod} से बिजाई (${formatDateDDMMYYYY(
            effectiveSowingDate
          )}) · ${ageStage.fasalAgeText}`
        : `एकड़ #${acre.acreNumber} — स्टेटस: ${acreStatus}`,
    };
  };

  const handleSaveAcreStatusOnly = () => {
    const existingEntries = acre.expenseEntries || [];
    const updatedAcre = buildUpdatedAcreSubPlot(existingEntries);
    const updatedSubPlots = (plot.subPlots || []).map((sp) =>
      sp.id === acre.id ? updatedAcre : sp
    );
    const updatedPlot: FarmPlot = {
      ...plot,
      subPlots: updatedSubPlots,
      currentActivity: `एकड़ #${acre.acreNumber} स्टेटस अपडेट: ${acreStatus}${
        acreStatus === 'Seeded'
          ? ` (${sowingMethod} · ${formatDateDDMMYYYY(updatedAcre.sowingDate)})`
          : ''
      }`,
    };

    const currentStore = store || FarmStorage.load();
    const nextStore: FarmDataStore = {
      ...currentStore,
      plots: currentStore.plots.map((p) =>
        p.id === updatedPlot.id ? updatedPlot : p
      ),
    };
    FarmStorage.save(nextStore);
    onSaveAcreAndStore(
      updatedPlot,
      nextStore,
      `✅ एकड़ #${acre.acreNumber} का स्टेटस (${acreStatus}), बुवाई तारीख (${formatDateDDMMYYYY(
        updatedAcre.sowingDate
      )}) व फसल उम्र (${liveAgeAndStage.fasalAgeText}) बिना किसी ऑटो-खर्च के सेव हो गया!`
    );
    setFeedbackBanner(
      `✅ एकड़ #${acre.acreNumber} का स्टेटस सेव हो गया! (कोई ऑटो-खर्च नहीं जोड़ा गया)`
    );
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  const handleStartEditExpenseEntry = (entry: AcreExpenseEntry) => {
    setEditingEntryId(entry.id);
    setSelectedMachinery(entry.machineryOrJob || 'Super Seeder');
    setWorkerName(entry.workerName || '');
    setRateInput(String(entry.rate || ''));
    setJobDate(entry.date || new Date().toISOString().split('T')[0]);
    setJobTimeSlot(entry.workTimeSlot || 'सुबह (Morning)');
    setIsExpenseFormCollapsed(false);
    setRememberedHint(
      `✏️ एडिट मोड: "${entry.machineryOrJob} (${entry.workerName})" में बदलाव करके अपडेट करें`
    );
  };

  const handleCancelEditExpense = () => {
    setEditingEntryId(null);
    setRateInput('');
    setRememberedHint(null);
  };

  const handleAddExpenseAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericRate = parseFloat(rateInput);
    if (!numericRate || numericRate <= 0) {
      setFeedbackBanner(
        '⚠️ कृपया काम का रेट (Rate ₹) दर्ज करें (बिना पूछे कोई रेट ऑटो-इंसर्ट नहीं होता)।'
      );
      return;
    }

    const cleanWorkerName = workerName.trim() || 'स्वयं / कामगार';
    const effectiveJobDate = jobDate || new Date().toISOString().split('T')[0];
    const acreSize = Math.max(0.1, Number(acre.acres) || 1);
    const totalJobAmount = Math.round(numericRate * acreSize);

    const matchedOption = ALL_MACHINERY_DROPDOWN_OPTIONS.find(
      (opt) => opt.value === selectedMachinery
    );
    const entryCategory: 'machinery' | 'labour' | 'chemical_seed' =
      matchedOption?.category || 'machinery';

    const existingEntries = acre.expenseEntries || [];
    const existingEditingEntry = editingEntryId
      ? existingEntries.find((item) => item.id === editingEntryId)
      : undefined;

    const ledgerRecordId =
      existingEditingEntry?.ledgerRecordId ||
      (entryCategory === 'labour'
        ? `l_acre_${Date.now()}`
        : `m_acre_${Date.now()}`);

    // Check if we also need to deduct Fertiliser / Seed / Spray Chemical from Godown Stock!
    const chosenStockItem = availableStockItems.find(
      (s) => s.id === selectedStockItemId
    );
    const parsedStockQty = Math.max(0, Number(stockQuantityUsed) || 0);
    const shouldDeductStock =
      !existingEditingEntry &&
      deductFromStock &&
      Boolean(chosenStockItem) &&
      parsedStockQty > 0;

    const savedEntry: AcreExpenseEntry = {
      id: existingEditingEntry ? existingEditingEntry.id : `exp_${Date.now()}`,
      machineryOrJob: selectedMachinery,
      workerName: cleanWorkerName,
      rate: numericRate,
      totalAmount: totalJobAmount,
      date: effectiveJobDate,
      workTimeSlot: jobTimeSlot,
      category: entryCategory,
      ledgerRecordId,
      reasonNote:
        shouldDeductStock && chosenStockItem
          ? `साथ में प्रयुक्त: ${parsedStockQty} ${chosenStockItem.unitLabelHi} ${chosenStockItem.name}`
          : undefined,
    };

    let nextEntries = existingEditingEntry
      ? existingEntries.map((item) =>
          item.id === existingEditingEntry.id ? savedEntry : item
        )
      : [...existingEntries, savedEntry];

    let baseStore = store || FarmStorage.load();
    baseStore = FarmStorage.rememberRate(
      baseStore,
      cleanWorkerName,
      entryCategory === 'labour' ? 'labour' : 'machinery',
      selectedMachinery,
      numericRate,
      'acre'
    );

    let nextStockItems =
      baseStore.stockItems && baseStore.stockItems.length > 0
        ? [...baseStore.stockItems]
        : [...DEFAULT_STOCK_ITEMS];
    let nextStockMovements = [...(baseStore.stockMovements || [])];
    let stockFeedbackSuffix = '';

    if (shouldDeductStock && chosenStockItem) {
      const stockResult = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: baseStore.plots,
        stockItemId: chosenStockItem.id,
        itemName: chosenStockItem.name,
        category: chosenStockItem.category,
        quantity: parsedStockQty,
        unit: chosenStockItem.unit,
        ratePerUnit: chosenStockItem.ratePerUnit,
        movementType: 'use_in_acre',
        plotName: plot.name,
        acreNumber: String(acre.acreNumber),
        partyName: cleanWorkerName,
        reasonOrNote: `${selectedMachinery} में प्रयोग`,
        date: effectiveJobDate,
        workTimeSlot: jobTimeSlot,
      });

      nextStockItems = stockResult.nextStockItems;
      nextStockMovements = stockResult.nextStockMovements;

      // Also include the stock-usage entry on this acre so per-acre breakdown stays accurate without double-counting!
      const stockEntryOnAcre: AcreExpenseEntry = {
        id: `acre-stk-${stockResult.movementLog.id}`,
        machineryOrJob: `📦 स्टॉक से: ${stockResult.updatedItem.name} (${parsedStockQty} ${stockResult.updatedItem.unitLabelHi})`,
        workerName: cleanWorkerName,
        rate: stockResult.updatedItem.ratePerUnit,
        totalAmount: stockResult.movementLog.totalValue,
        date: effectiveJobDate,
        workTimeSlot: jobTimeSlot,
        category: 'chemical_seed',
        reasonNote: `${selectedMachinery} के साथ गोदाम स्टॉक से घटाया गया`,
        isFromStockUsage: true,
        stockMovementId: stockResult.movementLog.id,
      };
      nextEntries = [stockEntryOnAcre, ...nextEntries];
      stockFeedbackSuffix = ` | 📦 गोदाम स्टॉक से -${parsedStockQty} ${stockResult.updatedItem.unitLabelHi} (${stockResult.updatedItem.name}) ऑटोमैटिक घटा दिया गया! (बचा: ${stockResult.updatedItem.currentStock} ${stockResult.updatedItem.unitLabelHi})`;
    }

    const updatedAcre = buildUpdatedAcreSubPlot(nextEntries);
    const updatedSubPlots = (plot.subPlots || []).map((sp) =>
      sp.id === acre.id ? updatedAcre : sp
    );

    const updatedPlot: FarmPlot = {
      ...plot,
      subPlots: updatedSubPlots,
      currentActivity: existingEditingEntry
        ? `एकड़ #${acre.acreNumber} में ${selectedMachinery} (${cleanWorkerName}) — ₹${totalJobAmount} अपडेट किया गया`
        : `एकड़ #${acre.acreNumber} में ${selectedMachinery} (${cleanWorkerName}) — ₹${totalJobAmount} दर्ज${stockFeedbackSuffix}`,
    };

    let nextMachineryRecords = baseStore.machineryRecords || [];
    let nextLabourRecords = baseStore.labourRecords || [];

    const noteWithStock =
      shouldDeductStock && chosenStockItem
        ? `एकड़ #${acre.acreNumber} (${jobTimeSlot}) | प्रयुक्त स्टॉक: -${parsedStockQty} ${chosenStockItem.unitLabelHi} ${chosenStockItem.name}`
        : `एकड़ #${acre.acreNumber} (${jobTimeSlot} · ${acreStatus})`;

    if (entryCategory === 'labour') {
      const syncedLabourRecord = {
        id: ledgerRecordId,
        activity: selectedMachinery as any,
        mateName: cleanWorkerName,
        plotName: `${plot.name} - एकड़ #${acre.acreNumber}`,
        workersCount: 1,
        acresCovered: acreSize,
        ratePerWorkerOrAcre: numericRate,
        rateType: 'per_acre' as const,
        totalAmount: totalJobAmount,
        paidAmount: totalJobAmount,
        isPaid: true,
        date: effectiveJobDate,
        workTimeSlot: jobTimeSlot,
        notes: noteWithStock,
      };
      const hasLabourMatch = nextLabourRecords.some(
        (l) => l.id === ledgerRecordId
      );
      nextLabourRecords =
        existingEditingEntry && hasLabourMatch
          ? nextLabourRecords.map((l) =>
              l.id === ledgerRecordId ? syncedLabourRecord : l
            )
          : [syncedLabourRecord, ...nextLabourRecords];
    } else {
      const syncedMachineryRecord: MachineryRecord = {
        id: ledgerRecordId,
        activity: selectedMachinery as MachineryActivity,
        driverName: cleanWorkerName,
        plotName: `${plot.name} - एकड़ #${acre.acreNumber}`,
        acres: acreSize,
        ratePerUnit: numericRate,
        unitType: 'acre',
        totalAmount: totalJobAmount,
        paidAmount: totalJobAmount,
        isPaid: true,
        date: effectiveJobDate,
        workTimeSlot: jobTimeSlot,
        notes: noteWithStock,
      };
      const hasMachMatch = nextMachineryRecords.some(
        (m) => m.id === ledgerRecordId
      );
      nextMachineryRecords =
        existingEditingEntry && hasMachMatch
          ? nextMachineryRecords.map((m) =>
              m.id === ledgerRecordId ? syncedMachineryRecord : m
            )
          : [syncedMachineryRecord, ...nextMachineryRecords];
    }

    const nextStore: FarmDataStore = {
      ...baseStore,
      plots: baseStore.plots.map((p) =>
        p.id === updatedPlot.id ? updatedPlot : p
      ),
      machineryRecords: nextMachineryRecords,
      labourRecords: nextLabourRecords,
      stockItems: nextStockItems,
      stockMovements: nextStockMovements,
    };

    FarmStorage.save(nextStore);
    onSaveAcreAndStore(
      updatedPlot,
      nextStore,
      existingEditingEntry
        ? `✏️ एकड़ #${acre.acreNumber}: ${selectedMachinery} (${cleanWorkerName} · ₹${numericRate}/एकड़) खर्चा अपडेट हो गया!`
        : `✅ एकड़ #${acre.acreNumber}: ${selectedMachinery} (₹${totalJobAmount}) सेव हो गया!${stockFeedbackSuffix}`
    );

    setFeedbackBanner(
      existingEditingEntry
        ? `✏️ ₹${totalJobAmount} (${selectedMachinery} - ${cleanWorkerName}) अपडेट हो गया!`
        : `✅ ₹${totalJobAmount} (${selectedMachinery} - ${cleanWorkerName}) सेव हो गया!${stockFeedbackSuffix}`
    );
    setEditingEntryId(null);
    setRateInput('');
    setRememberedHint(null);
    setTimeout(() => setFeedbackBanner(null), 6000);
  };

  const handleDeleteExpenseEntry = (
    entryId: string,
    ledgerRecordId?: string
  ) => {
    const nextEntries = (acre.expenseEntries || []).filter(
      (e) => e.id !== entryId
    );
    const updatedAcre = buildUpdatedAcreSubPlot(nextEntries);
    const updatedSubPlots = (plot.subPlots || []).map((sp) =>
      sp.id === acre.id ? updatedAcre : sp
    );
    const updatedPlot: FarmPlot = {
      ...plot,
      subPlots: updatedSubPlots,
    };

    const currentStore = store || FarmStorage.load();
    const nextStore: FarmDataStore = {
      ...currentStore,
      plots: currentStore.plots.map((p) =>
        p.id === updatedPlot.id ? updatedPlot : p
      ),
      machineryRecords: ledgerRecordId
        ? (currentStore.machineryRecords || []).filter(
            (m) => m.id !== ledgerRecordId
          )
        : currentStore.machineryRecords,
      labourRecords: ledgerRecordId
        ? (currentStore.labourRecords || []).filter(
            (l) => l.id !== ledgerRecordId
          )
        : currentStore.labourRecords,
    };

    FarmStorage.save(nextStore);
    onSaveAcreAndStore(
      updatedPlot,
      nextStore,
      `🗑️ एकड़ #${acre.acreNumber} से खर्चा हटा दिया गया।`
    );
  };

  const currentEntries = acre.expenseEntries || [];
  const totalAcreLoggedExpense =
    (Number(acre.machineryExpense) || 0) +
    (Number(acre.labourExpense) || 0) +
    (Number(acre.materialExpense) || 0);

  return (
    <div className="rounded-3xl bg-slate-900/95 border-2 border-emerald-500/50 p-4 sm:p-5 text-white shadow-2xl space-y-4">
      {/* Header Banner with Help Popup */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              📋 प्रति-एकड़ फॉर्म (Per-Acre Status, Spray/Broadcasting & Expense)
            </span>
            <SectionHelpPopup
              compact
              titleHi={`एकड़ #${acre.acreNumber} फॉर्म कैसे काम करता है?`}
              subtitleHi="स्टेटस अपडेट, स्प्रे/फोलियर छींटा व गोदाम स्टॉक ऑटो-माइनस"
              bulletsHi={[
                '1. एकड़ स्टेटस (Empty, Rauni, Cultivated, Seeded) और बुवाई तारीख बदलने पर कोई ऑटो-खर्च नहीं जुड़ता।',
                '2. जब भी आप स्प्रे (Manual Spray, Boom Sprayer, Drone Spray), फोलियर स्प्रे (Foliar Spread), खाद/दवाई छींटा (Broadcasting) या बुवाई चुनते हैं, तो नीचे गोदाम स्टॉक आइटम और उसकी मात्रा (Quantity) पूछी जाती है।',
                '3. सेव करते ही वह मात्रा गोदाम स्टॉक से अपने-आप घट (Minus) जाती है और इस एकड़ के हिसाब में जुड़ जाती है!',
              ]}
            />
          </div>
          <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
            एकड़ #{acre.acreNumber} ({acre.acres} एकड़) — {acre.name}
          </h4>
        </div>
        <div className="text-right font-mono">
          <span className="px-2.5 py-1 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-black block">
            कुल दर्ज खर्च: ₹{totalAcreLoggedExpense.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {feedbackBanner && (
        <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 1 (COLLAPSIBLE): ACRE STATUS, SOWING DATE & SOWING METHOD    */}
      {/* ==================================================================== */}
      <div className="rounded-2xl bg-slate-950/70 border border-slate-800 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            <span>1. एकड़ स्टेटस व बुवाई विवरण (Acre Status & Sowing)</span>
          </label>
          <button
            type="button"
            onClick={() =>
              setIsStatusSectionCollapsed(!isStatusSectionCollapsed)
            }
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-black text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            {isStatusSectionCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>🔽 खोलें (Expand)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>🔼 छोटा करें (Collapse)</span>
              </>
            )}
          </button>
        </div>

        {!isStatusSectionCollapsed && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACRE_STATUS_OPTIONS.map((opt) => {
                const isSelected = acreStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setAcreStatus(opt.value);
                      if (opt.value === 'Seeded' && !sowingDate) {
                        setSowingDate('2026-11-05');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? `${opt.badgeColor} font-black shadow-lg scale-[1.02]`
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <div className="leading-tight">
                      <div className="text-xs font-black">{opt.labelEn}</div>
                      <div className="text-[10px] opacity-85">
                        {opt.labelHi.split('(')[1]?.replace(')', '')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {acreStatus === 'Seeded' && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-emerald-300 flex items-center gap-1 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>2. बुवाई तारीख (Sowing Date):</span>
                    </label>
                    <input
                      type="date"
                      value={sowingDate}
                      onChange={(e) => setSowingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-mono font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-emerald-300 flex items-center gap-1 mb-1">
                      <Tractor className="w-3.5 h-3.5" />
                      <span>3. बुवाई विधि (Sowing Method):</span>
                    </label>
                    <select
                      value={sowingMethod}
                      onChange={(e) =>
                        setSowingMethod(e.target.value as SowingMethodType)
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-bold text-white"
                    >
                      {SOWING_METHOD_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-emerald-300 flex items-center gap-1 mb-1">
                      <Sprout className="w-3.5 h-3.5" />
                      <span>फसल व किस्म (Variety):</span>
                    </label>
                    <select
                      value={cropVariety}
                      onChange={(e) => setCropVariety(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-bold text-white"
                    >
                      <option value={WHEAT_DBW_327_LABEL}>
                        🌾 {WHEAT_DBW_327_LABEL}
                      </option>
                      {ALL_CROP_VARIETIES.filter(
                        (v) => v.label !== WHEAT_DBW_327_LABEL
                      ).map((v) => (
                        <option key={v.id} value={v.label}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                  <span className="font-bold text-emerald-200">
                    ⏱️ ऑटो-गणना फसल उम्र:{' '}
                    <strong className="text-amber-300 font-mono">
                      {liveAgeAndStage.fasalAgeText}
                    </strong>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-black">
                    अवस्था: {liveAgeAndStage.stageLabelHi}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSaveAcreStatusOnly}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer transition-all flex items-center justify-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                💾 एकड़ #{acre.acreNumber} का स्टेटस ({acreStatus}) सेव करें (₹0 ऑटो-खर्च)
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2 (COLLAPSIBLE): WORK, SPRAY, FOLIAR BROADCASTING & EXPENSE  */}
      {/* ==================================================================== */}
      <div className="rounded-2xl bg-slate-950/90 border-2 border-amber-500/40 p-3.5 sm:p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
              <Tractor className="w-4 h-4 text-amber-400" />
              <span>
                4. काम, स्प्रे / फोलियर ब्रॉडकास्टिंग व खर्चा जोड़ें (स्टॉक ऑटो-माइनस)
              </span>
            </span>
            <SectionHelpPopup
              compact
              titleHi="स्प्रे, फोलियर छींटा व गोदाम स्टॉक ऑटो-माइनस"
              bulletsHi={[
                'नीचे से कोई भी काम चुनें: सुपर सीडर, रोटावेटर, खाद/यूरिया छींटा, दवाई/जिंक छींटा, पिट्ठू स्प्रे, फोलियर स्प्रे, बूम स्प्रेयर या ड्रोन स्प्रे।',
                'जब भी आप स्प्रे, छींटा या बुवाई चुनते हैं, तो नीचे "गोदाम स्टॉक से दवाई/खाद/बीज घटाएं" बॉक्स खुलता है।',
                'उसमें आइटम और मात्रा (Quantity) चुनते ही वह मात्रा गोदाम के स्टॉक से अपने-आप कम हो जाएगी!',
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsExpenseFormCollapsed(!isExpenseFormCollapsed)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-black text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            {isExpenseFormCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>🔽 खर्चा फॉर्म खोलें (Expand)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>🔼 फॉर्म छोटा करें (Collapse)</span>
              </>
            )}
          </button>
        </div>

        {!isExpenseFormCollapsed && (
          <form onSubmit={handleAddExpenseAndSave} className="space-y-3.5 pt-1">
            {/* Visual Quick-Select Tiles including Spray & Foliar Broadcasting */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-emerald-300 block">
                🎮 1-टैप कार्य चयन (मशीनरी, स्प्रे, फोलियर स्प्रे व खाद/दवाई छींटा):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {ALL_MACHINERY_DROPDOWN_OPTIONS.map((opt) => {
                  const isPicked = selectedMachinery === opt.value;
                  const isLabourBroadcast = opt.category === 'labour';
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelectMachinery(opt.value)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isPicked
                          ? isLabourBroadcast
                            ? 'bg-emerald-500 text-slate-950 border-white font-black shadow-md'
                            : 'bg-amber-400 text-slate-950 border-white font-black shadow-md'
                          : isLabourBroadcast
                          ? 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-200 border-emerald-500/40'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                    >
                      <span className="text-base shrink-0">{opt.icon}</span>
                      <div className="min-w-0 leading-tight">
                        <div className="text-[11px] font-black truncate">
                          {opt.shortGameLabel}
                        </div>
                        <div className="text-[9px] opacity-75 truncate">
                          {isLabourBroadcast ? '🖐️ छींटा/स्प्रे' : '🚜 मशीनरी'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STOCK ITEM & QUANTITY DEDUCTION PANEL (Auto-Shown for Spray, Foliar Broadcasting & Sowing!) */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs font-black text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromStock}
                    onChange={(e) => setDeductFromStock(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500"
                  />
                  <span>
                    🧪 इस काम/स्प्रे/छींटा में प्रयुक्त खाद, बीज या दवाई गोदाम स्टॉक से घटाएं (Minus Stock)
                  </span>
                </label>
                {doesActivityUseStock(selectedMachinery) && (
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black">
                    स्प्रे / छींटा / बुवाई स्टॉक लिंक
                  </span>
                )}
              </div>

              {deductFromStock && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      📦 कौन-सी दवाई / खाद / बीज लगा? (Stock Item):
                    </label>
                    <select
                      value={selectedStockItemId}
                      onChange={(e) => setSelectedStockItemId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-xs font-bold text-white"
                    >
                      <option value="">-- कोई सामान नहीं (Skip) --</option>
                      {availableStockItems.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} (बचा: {st.currentStock} {st.unitLabelHi})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      ⚖️ कितनी मात्रा लगी? (Quantity to Minus from Stock):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={stockQuantityUsed}
                        onChange={(e) => setStockQuantityUsed(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-emerald-400 text-xs font-mono font-black text-emerald-300"
                        placeholder="जैसे: 1 बैग या 0.5 लीटर"
                      />
                      {['0.5', '1', '2'].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setStockQuantityUsed(q)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-mono font-black text-slate-200 cursor-pointer shrink-0"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 4.1 Machinery / Work Dropdown */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  1. चयनित काम / स्प्रे / छींटा:
                </label>
                <select
                  value={selectedMachinery}
                  onChange={(e) => handleSelectMachinery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                >
                  {ALL_MACHINERY_DROPDOWN_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4.2 Worker Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. 👤 किसने किया (Worker / Driver Name):</span>
                </label>
                <input
                  type="text"
                  list={`workers-datalist-${acre.id}`}
                  value={workerName}
                  onChange={(e) => handleWorkerNameChange(e.target.value)}
                  placeholder="जैसे: रमेश / राजू छींटा / स्वयं"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                />
                <datalist id={`workers-datalist-${acre.id}`}>
                  {rememberedWorkers.map((wName) => (
                    <option key={wName} value={wName} />
                  ))}
                </datalist>

                {rememberedWorkers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {rememberedWorkers.slice(0, 6).map((wName) => (
                      <button
                        key={wName}
                        type="button"
                        onClick={() => handleWorkerNameChange(wName)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                          workerName === wName
                            ? 'bg-emerald-500 text-slate-950 border-white font-black'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {wName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4.3 Rate */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1 mb-1">
                  <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. 💰 काम/स्प्रे/छींटा रेट (₹ प्रति एकड़):</span>
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  placeholder="रेट दर्ज करें (जैसे: 1400 या छींटा 150)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-400/60 text-xs font-mono font-black text-amber-300"
                />
              </div>

              {/* 4.4 Date & Time */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
                  <span>4. 📅 काम कब हुआ (तारीख व समय):</span>
                  <span className="font-mono text-[10px] text-amber-300">
                    {formatDateDDMMYYYY(jobDate)} · {jobTimeSlot.split(' ')[0]}
                  </span>
                </label>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setJobDate(new Date().toISOString().split('T')[0])
                    }
                    className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-black cursor-pointer"
                  >
                    आज
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setJobDate(d.toISOString().split('T')[0]);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[10px] font-bold cursor-pointer"
                  >
                    कल
                  </button>
                  {['🌅 सुबह', '☀️ दोपहर', '🌇 शाम'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setJobTimeSlot(slot)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                        jobTimeSlot.startsWith(slot.split(' ')[0])
                          ? 'bg-amber-400 text-slate-950 border-white font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={jobDate}
                  onChange={(e) => setJobDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-white"
                />
              </div>
            </div>

            {rememberedHint && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{rememberedHint}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {editingEntryId && (
                <button
                  type="button"
                  onClick={handleCancelEditExpense}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>रद्द करें</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-xs cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {editingEntryId ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>✏️ बदलाव सेव करें</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      + एकड़ #{acre.acreNumber} में काम/खर्चा सेव करें{' '}
                      {deductFromStock && selectedStockItemId
                        ? '(+ स्टॉक ऑटो-घटाएं)'
                        : ''}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Logged Expenses List for this Specific Acre */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-300">
            🧾 एकड़ #{acre.acreNumber} में दर्ज काम व खर्चे ({currentEntries.length}):
          </span>
          <span className="font-mono font-black text-amber-400">
            कुल: ₹{totalAcreLoggedExpense.toLocaleString('en-IN')}
          </span>
        </div>

        {currentEntries.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 text-[11px] text-slate-400 text-center">
            कोई खर्चा दर्ज नहीं (₹0)
          </div>
        ) : (
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {currentEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                  editingEntryId === entry.id
                    ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-slate-800/90 border-slate-700'
                }`}
              >
                <div>
                  <div className="font-black text-white flex items-center gap-1.5">
                    <span>
                      {entry.category === 'labour'
                        ? '🖐️'
                        : entry.category === 'chemical_seed'
                        ? '🧪'
                        : '🚜'}{' '}
                      {entry.machineryOrJob}
                    </span>
                    <span className="text-emerald-400">
                      • {entry.workerName}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    📅 {formatDateDDMMYYYY(entry.date)}
                    {entry.workTimeSlot ? ` (${entry.workTimeSlot})` : ''} · रेट: ₹
                    {entry.rate}
                    {entry.reasonNote ? ` · ${entry.reasonNote}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-amber-300 mr-1">
                    ₹{entry.totalAmount.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEditExpenseEntry(entry)}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    title="एडिट करें (Edit)"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>एडिट</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteExpenseEntry(entry.id, entry.ledgerRecordId)
                    }
                    className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold text-[10px] cursor-pointer flex items-center gap-1"
                    title="हटाएं (Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>हटाएं</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
