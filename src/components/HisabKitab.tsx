import React, { useState, useEffect, useMemo } from 'react';
import {
  FarmDataStore,
  MachineryRecord,
  MachineryActivity,
  LabourRecord,
  LabourActivity,
  MaterialRecord,
  MaterialType,
  AadtiRecord,
  AcreSubPlot,
  AcreExpenseEntry,
  StockItem,
} from '../types/farm';
import {
  Tractor,
  FlaskConical,
  Store,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Pencil,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  SprayCan,
  Package,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { SectionHelpPopup } from './SectionHelpPopup';
import {
  exportFarmDataToExcel,
  exportFarmDataToCSV,
  exportFarmDataToPDF,
} from '../utils/exportUtils';
import {
  DEFAULT_STOCK_ITEMS,
  mapMaterialTypeToStockCategory,
  findMatchingStockItem,
  applyStockInTransaction,
  applyStockOutTransaction,
} from '../utils/stockUtils';

interface HisabKitabProps {
  store: FarmDataStore;
  onSaveStore: (newStore: FarmDataStore) => void;
  language: 'hi' | 'en';
  defaultPlotPrefill?: string;
  defaultCategoryPrefill?: 'machinery' | 'labour' | 'chemical_seed';
  onOpenStock?: () => void;
}

type GameTab = 'machinery' | 'labour' | 'materials' | 'mandi';

const formatIndianDate = (isoDate?: string): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const getOffsetIsoDate = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const TIME_SLOTS = [
  { id: '🌅 सुबह (Morning)', label: '🌅 सुबह' },
  { id: '☀️ दोपहर (Afternoon)', label: '☀️ दोपहर' },
  { id: '🌇 शाम (Evening)', label: '🌇 शाम' },
  { id: '🌙 रात (Night)', label: '🌙 रात' },
];

// All 21 possible Machinery & Tractor options mapped to MachineryActivity
const ALL_MACHINERY_GAME_TILES: {
  activity: MachineryActivity;
  icon: string;
  shortHi: string;
  defaultRate: number;
  group: 'sowing' | 'tillage' | 'spray_water' | 'harvest';
}[] = [
  // Sowing
  { activity: 'Super Seeder', icon: '🌱', shortHi: 'सुपर सीडर बुवाई', defaultRate: 2200, group: 'sowing' },
  { activity: 'Happy Seeder', icon: '🌾', shortHi: 'हैप्पी सीडर', defaultRate: 2000, group: 'sowing' },
  { activity: 'Zero Till Drill', icon: '🚜', shortHi: 'जीरो टिल ड्रिल', defaultRate: 1200, group: 'sowing' },
  { activity: 'Seed Drill', icon: '🌿', shortHi: 'सीड ड्रिल बिजाई', defaultRate: 1000, group: 'sowing' },
  // Tillage & Land Prep
  { activity: 'Rotavator', icon: '🚜', shortHi: 'रोटावेटर जुताई', defaultRate: 1200, group: 'tillage' },
  { activity: 'Cultivator', icon: '⚙️', shortHi: 'कल्टीवेटर (हल)', defaultRate: 700, group: 'tillage' },
  { activity: 'Disc Harrow', icon: '💿', shortHi: 'तवियां (डिस्क हैरो)', defaultRate: 900, group: 'tillage' },
  { activity: 'MB Plough / Deep Plough', icon: '⛏️', shortHi: 'एम.बी. प्लाऊ (गहरा हल)', defaultRate: 1800, group: 'tillage' },
  { activity: 'Chisel Plough / Subsoiler', icon: '🔩', shortHi: 'सबसॉयलर (तोता हल)', defaultRate: 1500, group: 'tillage' },
  { activity: 'Laser Land Leveler', icon: '📐', shortHi: 'कंप्यूटर गोड़ी (लेजर)', defaultRate: 1100, group: 'tillage' },
  { activity: 'Suhaga / Plank', icon: '🪵', shortHi: 'सुहागा / पाटा लगाना', defaultRate: 400, group: 'tillage' },
  { activity: 'Bund Maker / Ridger', icon: '⛰️', shortHi: 'मेड़ / डॉल मशीन', defaultRate: 500, group: 'tillage' },
  // Spray & Irrigation
  { activity: 'Boom Sprayer', icon: '🚿', shortHi: 'ट्रैक्टर बूम स्प्रे पंप', defaultRate: 400, group: 'spray_water' },
  { activity: 'Drone Spray', icon: '🚁', shortHi: 'ड्रोन फोलियर स्प्रे', defaultRate: 500, group: 'spray_water' },
  { activity: 'Foliar Spread', icon: '✨', shortHi: 'फोलियर स्प्रे / ब्रॉडकास्टर', defaultRate: 350, group: 'spray_water' },
  { activity: 'Rauni Irrigation', icon: '💧', shortHi: 'रौनी / ट्यूबवेल सिंचाई', defaultRate: 500, group: 'spray_water' },
  // Harvest & Transport
  { activity: 'Combine Harvester', icon: '🌾', shortHi: 'कंबाइन कटाई', defaultRate: 2000, group: 'harvest' },
  { activity: 'Straw Reaper', icon: '🌪️', shortHi: 'भूसा रीपर (तूड़ी मशीन)', defaultRate: 1800, group: 'harvest' },
  { activity: 'Baler / Parali Gaanth', icon: '📦', shortHi: 'पराली बेलर (गांठ)', defaultRate: 1500, group: 'harvest' },
  { activity: 'Mulcher / Shredder', icon: '🔪', shortHi: 'मल्चर / पराली कटर', defaultRate: 1400, group: 'harvest' },
  { activity: 'Thresher', icon: '⚙️', shortHi: 'थ्रेशर निकासी', defaultRate: 1500, group: 'harvest' },
  { activity: 'Trolley / Transport', icon: '🛞', shortHi: 'ट्रॉली ढुलाई (मंडी)', defaultRate: 800, group: 'harvest' },
];

// Human Broadcasting, Spray & Manual Labour Game Tiles mapped to LabourActivity
const ALL_LABOUR_GAME_TILES: {
  activity: LabourActivity;
  icon: string;
  shortHi: string;
  subHi: string;
  defaultRate: number;
  defaultRateType: LabourRecord['rateType'];
  isBroadcastingOrSpray?: boolean;
}[] = [
  {
    activity: 'Fertiliser Broadcasting (खाद/यूरिया छींटा)',
    icon: '🖐️',
    shortHi: 'खाद / यूरिया छींटा (Broadcasting)',
    subHi: 'इंसान से खाद/यूरिया छींटा लगवाने का खर्च + स्टॉक माइनस',
    defaultRate: 100,
    defaultRateType: 'per_acre',
    isBroadcastingOrSpray: true,
  },
  {
    activity: 'Pesticide Broadcasting (दवाई/जिंक छींटा)',
    icon: '🛡️',
    shortHi: 'दवाई / जिंक छींटा (Broadcasting)',
    subHi: 'इंसान से दानेदार दवाई/जिंक छींटा + स्टॉक माइनस',
    defaultRate: 120,
    defaultRateType: 'per_acre',
    isBroadcastingOrSpray: true,
  },
  {
    activity: 'Foliar Spread',
    icon: '✨',
    shortHi: 'फोलियर स्प्रे / ब्रॉडकास्टिंग (Foliar Spray)',
    subHi: 'NPK 19:19:19, 0:52:34, जिंक या टॉनिक फोलियर स्प्रे + स्टॉक माइनस',
    defaultRate: 180,
    defaultRateType: 'per_acre',
    isBroadcastingOrSpray: true,
  },
  {
    activity: 'Manual Spray (पिट्ठू/बैटरी पंप स्प्रे)',
    icon: '🎒',
    shortHi: 'इंसान से पिट्ठू / बैटरी पंप स्प्रे',
    subHi: 'मजदूर द्वारा बैटरी/हैंड पंप से दवाई स्प्रे + स्टॉक माइनस',
    defaultRate: 40,
    defaultRateType: 'per_tank',
    isBroadcastingOrSpray: true,
  },
  {
    activity: 'Seed Broadcasting (बीज छींटा बिजाई)',
    icon: '🌾',
    shortHi: 'इंसान से बीज छींटा बिजाई',
    subHi: 'हाथ से खेत में बीज छींटा लगाने का चार्ज + बीज स्टॉक माइनस',
    defaultRate: 150,
    defaultRateType: 'per_acre',
    isBroadcastingOrSpray: true,
  },
  {
    activity: 'Irrigation / Sinchai',
    icon: '💧',
    shortHi: 'कस्सी से पानी / सिंचाई',
    subHi: 'क्यारी में पानी मोड़ने की मजदूरी',
    defaultRate: 300,
    defaultRateType: 'per_acre',
  },
  {
    activity: 'Weed Management',
    icon: '🌱',
    shortHi: 'निराई-गुड़ाई / घास निकालना',
    subHi: 'खेत से खरपतवार साफ करने की मजदूरी',
    defaultRate: 450,
    defaultRateType: 'per_worker',
  },
  {
    activity: 'Harvesting',
    icon: '🌾',
    shortHi: 'हाथ से फसल कटाई',
    subHi: 'दरांती से कटाई या पुलियां बांधना',
    defaultRate: 3500,
    defaultRateType: 'per_acre',
  },
  {
    activity: 'Transplantation',
    icon: '🌿',
    shortHi: 'धान रोपाई / पौध लगाना',
    subHi: 'मजदूर टोली द्वारा खेत में रोपाई',
    defaultRate: 3200,
    defaultRateType: 'per_acre',
  },
  {
    activity: 'Other',
    icon: '📦',
    shortHi: 'बोरी भराई / मेड़ सफाई / अन्य',
    subHi: 'अनाज बोरी लोडिंग या मेड़ सफाई कार्य',
    defaultRate: 500,
    defaultRateType: 'contract_lump',
  },
];

// Quick Material Presets for Seeds, Fertilizers & Sprays
const MATERIAL_GAME_PRESETS: {
  name: string;
  type: MaterialType;
  icon: string;
  unit: MaterialRecord['unit'];
  unitLabelHi: string;
  defaultRate: number;
}[] = [
  { name: 'यूरिया खाद (Urea 45kg)', type: 'fertiliser', icon: '🛍️', unit: 'bag', unitLabelHi: 'कट्टा/बोरी', defaultRate: 270 },
  { name: 'डीएपी खाद (DAP 50kg)', type: 'fertiliser', icon: '📦', unit: 'bag', unitLabelHi: 'कट्टा/बोरी', defaultRate: 1350 },
  { name: 'जिंक सल्फेट (Zinc)', type: 'fertiliser', icon: '⚡', unit: 'kg', unitLabelHi: 'किलो', defaultRate: 180 },
  { name: 'पोटाश खाद (MOP)', type: 'fertiliser', icon: '🧪', unit: 'bag', unitLabelHi: 'कट्टा/बोरी', defaultRate: 1700 },
  { name: 'गेहूं / धान प्रमाणित बीज', type: 'seed', icon: '🌾', unit: 'bag', unitLabelHi: 'कट्टा/बोरी', defaultRate: 1400 },
  { name: 'खरपतवार नाशक दवाई (Weedicide)', type: 'pesticide', icon: '🧴', unit: 'litre', unitLabelHi: 'लीटर', defaultRate: 650 },
  { name: 'कीटनाशक स्प्रे दवाई (Pesticide)', type: 'pesticide', icon: '🛡️', unit: 'litre', unitLabelHi: 'लीटर', defaultRate: 850 },
  { name: 'फंगीसाइड दवाई (Fungicide)', type: 'pesticide', icon: '🍄', unit: 'packet', unitLabelHi: 'पैकेट', defaultRate: 550 },
];

export const HisabKitab: React.FC<HisabKitabProps> = ({
  store,
  onSaveStore,
  defaultPlotPrefill,
  defaultCategoryPrefill,
  onOpenStock,
}) => {
  const [activeTab, setActiveTab] = useState<GameTab>('machinery');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Common Form State
  const [selectedPlotName, setSelectedPlotName] = useState<string>(
    defaultPlotPrefill || store.plots[0]?.name || ''
  );
  const [selectedAcreNum, setSelectedAcreNum] = useState<string>('0'); // '0' = पूरा खेत (All Acres)
  const [expenseDate, setExpenseDate] = useState<string>(getOffsetIsoDate(0));
  const [workTimeSlot, setWorkTimeSlot] = useState<string>('🌅 सुबह (Morning)');
  const [isPaidStatus, setIsPaidStatus] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // 1. Machinery Specific State
  const [machActivity, setMachActivity] = useState<MachineryActivity>('Super Seeder');
  const [machGroupFilter, setMachGroupFilter] = useState<
    'all' | 'sowing' | 'tillage' | 'spray_water' | 'harvest'
  >('all');
  const [machDriverName, setMachDriverName] = useState<string>('');
  const [machAcresCovered, setMachAcresCovered] = useState<string>('1');
  const [machRateValue, setMachRateValue] = useState<string>('2200');

  // 2. Human Broadcasting, Spray & Labour Specific State
  const [labActivity, setLabActivity] = useState<LabourActivity>(
    'Fertiliser Broadcasting (खाद/यूरिया छींटा)'
  );
  const [labWorkerName, setLabWorkerName] = useState<string>('');
  const [labRateType, setLabRateType] = useState<LabourRecord['rateType']>('per_acre');
  const [labUnitCount, setLabUnitCount] = useState<string>('1'); // acres OR bags OR tanks OR workers
  const [labRatePerUnit, setLabRatePerUnit] = useState<string>('100');

  // 3. Materials (Seed/Fertilizer/Pesticide Purchase) Specific State
  const [matType, setMatType] = useState<MaterialType>('fertiliser');
  const [matItemName, setMatItemName] = useState<string>('यूरिया खाद (Urea 45kg)');
  const [matVendor, setMatVendor] = useState<string>('');
  const [matQuantity, setMatQuantity] = useState<string>('2');
  const [matUnit, setMatUnit] = useState<MaterialRecord['unit']>('bag');
  const [matRatePerUnit, setMatRatePerUnit] = useState<string>('270');

  // 4. Mandi / Arthiya State (uses store.aadtiRecords)
  const [aadtiName, setAadtiName] = useState<string>(
    store.aadtiRecords[0]?.aadtiName || 'चौधरी ट्रेडिंग कंपनी, मंडी'
  );
  const [txDate, setTxDate] = useState<string>(getOffsetIsoDate(0));
  const [txType, setTxType] = useState<AadtiRecord['type']>('credit');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txDescription, setTxDescription] = useState<string>('');

  // Collapse / Expand Toggles for all forms
  const [isMainFormCollapsed, setIsMainFormCollapsed] = useState<boolean>(false);
  const [isMandiFormCollapsed, setIsMandiFormCollapsed] = useState<boolean>(false);

  // Linked Stock Item & Quantity Deduction for Spray / Foliar Broadcasting / Sowing Jobs
  const availableStockItems: StockItem[] = useMemo(() => {
    return store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;
  }, [store.stockItems]);

  const [useStockInJob, setUseStockInJob] = useState<boolean>(true);
  const [selectedJobStockId, setSelectedJobStockId] = useState<string>(
    availableStockItems[0]?.id || ''
  );
  const [jobStockQuantity, setJobStockQuantity] = useState<string>('1');

  // Auto-select matching Godown Stock item when user changes Machinery or Labour/Spray/Broadcasting activity
  useEffect(() => {
    if (activeTab === 'machinery') {
      const mAct = machActivity.toLowerCase();
      const needsStock =
        mAct.includes('seeder') ||
        mAct.includes('drill') ||
        mAct.includes('spray') ||
        mAct.includes('drone') ||
        mAct.includes('foliar');
      setUseStockInJob(needsStock);
      if (needsStock && availableStockItems.length > 0) {
        const match = mAct.includes('spray') || mAct.includes('drone') || mAct.includes('foliar')
          ? availableStockItems.find((s) => s.category === 'spray')
          : availableStockItems.find((s) => s.category === 'beej' || s.category === 'khad');
        setSelectedJobStockId((match || availableStockItems[0]).id);
      }
    } else if (activeTab === 'labour') {
      const lAct = labActivity.toLowerCase();
      const needsStock =
        lAct.includes('broadcasting') ||
        lAct.includes('छींटा') ||
        lAct.includes('spray') ||
        lAct.includes('स्प्रे') ||
        lAct.includes('foliar');
      setUseStockInJob(needsStock);
      if (needsStock && availableStockItems.length > 0) {
        let match: StockItem | undefined;
        if (lAct.includes('यूरिया') || lAct.includes('fertiliser')) {
          match = availableStockItems.find(
            (s) => s.name.includes('यूरिया') || s.category === 'khad'
          );
        } else if (lAct.includes('बीज') || lAct.includes('seed')) {
          match = availableStockItems.find((s) => s.category === 'beej');
        } else if (lAct.includes('जिंक') || lAct.includes('foliar')) {
          match = availableStockItems.find(
            (s) => s.name.includes('जिंक') || s.category === 'spray'
          );
        } else {
          match = availableStockItems.find((s) => s.category === 'spray');
        }
        setSelectedJobStockId((match || availableStockItems[0]).id);
      }
    }
  }, [activeTab, machActivity, labActivity, availableStockItems]);

  // Sync prefill from other tabs
  useEffect(() => {
    if (defaultPlotPrefill) {
      setSelectedPlotName(defaultPlotPrefill);
    }
    if (defaultCategoryPrefill === 'machinery') {
      setActiveTab('machinery');
    } else if (defaultCategoryPrefill === 'labour') {
      setActiveTab('labour');
    } else if (defaultCategoryPrefill === 'chemical_seed') {
      setActiveTab('materials');
    }
  }, [defaultPlotPrefill, defaultCategoryPrefill]);

  // Active Plot & SubPlots for the Instagram Story Circular Scroller
  const activePlotObj = useMemo(
    () =>
      store.plots.find((p) => p.name === selectedPlotName) ||
      store.plots[0] ||
      null,
    [store.plots, selectedPlotName]
  );

  const activeSubPlots: AcreSubPlot[] = useMemo(
    () => activePlotObj?.subPlots || [],
    [activePlotObj]
  );

  // Remembered Worker / Driver Names for 1-Tap Selection
  const rememberedNames = useMemo(() => {
    const names = new Set<string>();
    store.machineryRecords.forEach((r) => {
      if (r.driverName && r.driverName.trim()) names.add(r.driverName.trim());
    });
    store.labourRecords.forEach((r) => {
      if (r.mateName && r.mateName.trim()) names.add(r.mateName.trim());
    });
    store.plots.forEach((p) =>
      (p.subPlots || []).forEach((sp) =>
        (sp.expenseEntries || []).forEach((e) => {
          if (e.workerName && e.workerName.trim()) names.add(e.workerName.trim());
        })
      )
    );
    return Array.from(names).slice(0, 10);
  }, [store.machineryRecords, store.labourRecords, store.plots]);

  const showQuickSuccess = (msg: string) => {
    setSavedToast(msg);
    window.setTimeout(() => setSavedToast(null), 3500);
  };

  // Sync an expense into the specific AcreSubPlot's `expenseEntries` array if a specific Acre (#1, #2...) is selected
  const syncAcreSubPlotExpense = (
    currentPlots: FarmDataStore['plots'],
    plotName: string,
    acreNumStr: string,
    ledgerRecId: string,
    jobTitle: string,
    workerName: string,
    rateVal: number,
    totalVal: number,
    date: string,
    timeSlot: string,
    category: AcreExpenseEntry['category']
  ) => {
    if (!acreNumStr || acreNumStr === '0') return currentPlots;
    return currentPlots.map((p) => {
      if (p.name !== plotName) return p;
      const nextSubPlots = (p.subPlots || []).map((sp) => {
        if (String(sp.acreNumber) !== String(acreNumStr)) return sp;
        const existingList = sp.expenseEntries || [];
        const exists = existingList.some(
          (e) => e.ledgerRecordId === ledgerRecId || e.id === ledgerRecId
        );
        const newEntry: AcreExpenseEntry = {
          id: `acre-exp-${ledgerRecId}`,
          machineryOrJob: jobTitle,
          workerName: workerName || 'किसान / मजदूर',
          rate: rateVal,
          totalAmount: totalVal,
          date,
          workTimeSlot: timeSlot,
          category,
          ledgerRecordId: ledgerRecId,
        };
        return {
          ...sp,
          expenseEntries: exists
            ? existingList.map((e) =>
                e.ledgerRecordId === ledgerRecId || e.id === ledgerRecId ? newEntry : e
              )
            : [newEntry, ...existingList],
        };
      });
      return { ...p, subPlots: nextSubPlots };
    });
  };

  // Live Calculated Totals for the 3 Game Boards
  const calculatedMachineryTotal = useMemo(() => {
    const rate = Number(machRateValue) || 0;
    const acres = Number(machAcresCovered) || 1;
    return Math.round(acres * rate);
  }, [machAcresCovered, machRateValue]);

  const calculatedLabourTotal = useMemo(() => {
    const rate = Number(labRatePerUnit) || 0;
    const units = Number(labUnitCount) || 1;
    if (labRateType === 'contract_lump') {
      return Math.round(rate);
    }
    return Math.round(units * rate);
  }, [labRateType, labUnitCount, labRatePerUnit]);

  const calculatedMaterialTotal = useMemo(() => {
    const qty = Number(matQuantity) || 0;
    const rate = Number(matRatePerUnit) || 0;
    return Math.round(qty * rate);
  }, [matQuantity, matRatePerUnit]);

  // Save Machinery Record (with optional Automatic Stock Deduction for Sowing, Boom Sprayer, Drone Spray, Foliar Spread)
  const handleSaveMachinery = (e: React.FormEvent) => {
    e.preventDefault();
    const recId = editingRecordId || `mach-${Date.now()}`;
    const acresVal =
      selectedAcreNum !== '0'
        ? 1
        : Math.max(0.25, Number(machAcresCovered) || activePlotObj?.acres || 1);
    const rateVal = Number(machRateValue) || 0;
    const plotLabel =
      selectedAcreNum !== '0'
        ? `${selectedPlotName} (एकड़ #${selectedAcreNum})`
        : selectedPlotName;

    const tile = ALL_MACHINERY_GAME_TILES.find((t) => t.activity === machActivity);

    const chosenStock = availableStockItems.find(
      (s) => s.id === selectedJobStockId
    );
    const stockQty = Math.max(0, Number(jobStockQuantity) || 0);
    const shouldDeduct = !editingRecordId && useStockInJob && chosenStock && stockQty > 0;

    let nextStockItems = [...availableStockItems];
    let nextStockMovements = [...(store.stockMovements || [])];
    let currentPlots = [...store.plots];
    let stockNoteSuffix = '';

    if (shouldDeduct && chosenStock) {
      const stockRes = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: currentPlots,
        stockItemId: chosenStock.id,
        itemName: chosenStock.name,
        category: chosenStock.category,
        quantity: stockQty,
        unit: chosenStock.unit,
        ratePerUnit: chosenStock.ratePerUnit,
        movementType: 'use_in_acre',
        plotName: selectedPlotName,
        acreNumber: selectedAcreNum,
        partyName: machDriverName.trim() || 'ट्रैक्टर कार्य',
        reasonOrNote: `${tile?.shortHi || machActivity} में प्रयोग`,
        date: expenseDate,
        workTimeSlot,
      });
      nextStockItems = stockRes.nextStockItems;
      nextStockMovements = stockRes.nextStockMovements;
      currentPlots = stockRes.nextPlots;
      stockNoteSuffix = ` | 📦 स्टॉक से घटा: -${stockQty} ${stockRes.updatedItem.unitLabelHi} ${stockRes.updatedItem.name}`;
    }

    const record: MachineryRecord = {
      id: recId,
      activity: machActivity,
      driverName: machDriverName.trim() || 'किराए का ट्रैक्टर / अपना ट्रैक्टर',
      plotName: plotLabel,
      acres: acresVal,
      ratePerUnit: rateVal,
      unitType: 'acre',
      totalAmount: calculatedMachineryTotal,
      paidAmount: isPaidStatus ? calculatedMachineryTotal : 0,
      isPaid: isPaidStatus,
      date: expenseDate,
      workTimeSlot,
      notes: `${
        notes.trim() || `${tile?.shortHi || machActivity} • ${workTimeSlot}`
      }${stockNoteSuffix}`,
    };

    const nextMachinery = editingRecordId
      ? store.machineryRecords.map((r) => (r.id === editingRecordId ? record : r))
      : [record, ...store.machineryRecords];

    const nextPlots = syncAcreSubPlotExpense(
      currentPlots,
      selectedPlotName,
      selectedAcreNum,
      recId,
      `${tile?.shortHi || machActivity} (${machActivity})`,
      record.driverName,
      rateVal,
      record.totalAmount,
      expenseDate,
      workTimeSlot,
      'machinery'
    );

    onSaveStore({
      ...store,
      machineryRecords: nextMachinery,
      plots: nextPlots,
      stockItems: nextStockItems,
      stockMovements: nextStockMovements,
    });

    setEditingRecordId(null);
    setNotes('');
    showQuickSuccess(
      editingRecordId
        ? '✅ मशीनरी खर्चा सफलतापूर्वक अपडेट हो गया!'
        : `✅ ₹${record.totalAmount.toLocaleString('en-IN')} मशीनरी खर्चा जुड़ गया!${stockNoteSuffix}`
    );
  };

  // Save Human Broadcasting / Spray / Foliar / Labour Record (with Automatic Stock Deduction!)
  const handleSaveLabour = (e: React.FormEvent) => {
    e.preventDefault();
    const recId = editingRecordId || `lab-${Date.now()}`;
    const unitsVal = Number(labUnitCount) || 1;
    const rateVal = Number(labRatePerUnit) || 0;
    const plotLabel =
      selectedAcreNum !== '0'
        ? `${selectedPlotName} (एकड़ #${selectedAcreNum})`
        : selectedPlotName;

    let rateDesc = '';
    if (labRateType === 'per_acre') rateDesc = `${unitsVal} एकड़ × ₹${rateVal}/एकड़`;
    else if (labRateType === 'per_bag') rateDesc = `${unitsVal} बोरी छींटा × ₹${rateVal}/बोरी`;
    else if (labRateType === 'per_tank') rateDesc = `${unitsVal} टंकी स्प्रे × ₹${rateVal}/टंकी`;
    else if (labRateType === 'per_worker') rateDesc = `${unitsVal} मजदूर × ₹${rateVal}/मजदूर`;
    else rateDesc = `ठेका ₹${rateVal}`;

    const chosenStock = availableStockItems.find(
      (s) => s.id === selectedJobStockId
    );
    const stockQty = Math.max(0, Number(jobStockQuantity) || 0);
    const shouldDeduct = !editingRecordId && useStockInJob && chosenStock && stockQty > 0;

    let nextStockItems = [...availableStockItems];
    let nextStockMovements = [...(store.stockMovements || [])];
    let currentPlots = [...store.plots];
    let stockNoteSuffix = '';

    if (shouldDeduct && chosenStock) {
      const stockRes = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: currentPlots,
        stockItemId: chosenStock.id,
        itemName: chosenStock.name,
        category: chosenStock.category,
        quantity: stockQty,
        unit: chosenStock.unit,
        ratePerUnit: chosenStock.ratePerUnit,
        movementType: 'use_in_acre',
        plotName: selectedPlotName,
        acreNumber: selectedAcreNum,
        partyName: labWorkerName.trim() || 'स्प्रे / छींटा कार्य',
        reasonOrNote: `${labActivity} में प्रयोग`,
        date: expenseDate,
        workTimeSlot,
      });
      nextStockItems = stockRes.nextStockItems;
      nextStockMovements = stockRes.nextStockMovements;
      currentPlots = stockRes.nextPlots;
      stockNoteSuffix = ` | 📦 स्टॉक से घटा: -${stockQty} ${stockRes.updatedItem.unitLabelHi} ${stockRes.updatedItem.name}`;
    }

    const record: LabourRecord = {
      id: recId,
      activity: labActivity,
      mateName: labWorkerName.trim() || 'खेत मजदूर / छींटा लगाने वाला',
      plotName: plotLabel,
      workersCount: labRateType === 'per_worker' ? unitsVal : 1,
      acresCovered: labRateType === 'per_acre' ? unitsVal : undefined,
      bagsOrTanksCount:
        labRateType === 'per_bag' || labRateType === 'per_tank' ? unitsVal : undefined,
      ratePerWorkerOrAcre: rateVal,
      rateType: labRateType,
      totalAmount: calculatedLabourTotal,
      paidAmount: isPaidStatus ? calculatedLabourTotal : 0,
      isPaid: isPaidStatus,
      date: expenseDate,
      workTimeSlot,
      notes: `${
        notes.trim() ? `${notes.trim()} (${rateDesc})` : `${rateDesc} • ${workTimeSlot}`
      }${stockNoteSuffix}`,
    };

    const nextLabour = editingRecordId
      ? store.labourRecords.map((r) => (r.id === editingRecordId ? record : r))
      : [record, ...store.labourRecords];

    const nextPlots = syncAcreSubPlotExpense(
      currentPlots,
      selectedPlotName,
      selectedAcreNum,
      recId,
      labActivity,
      record.mateName,
      rateVal,
      record.totalAmount,
      expenseDate,
      workTimeSlot,
      'labour'
    );

    onSaveStore({
      ...store,
      labourRecords: nextLabour,
      plots: nextPlots,
      stockItems: nextStockItems,
      stockMovements: nextStockMovements,
    });

    setEditingRecordId(null);
    setNotes('');
    showQuickSuccess(
      editingRecordId
        ? '✅ छींटा / स्प्रे / मजदूरी खर्चा अपडेट हो गया!'
        : `✅ ₹${record.totalAmount.toLocaleString('en-IN')} छींटा / स्प्रे खर्चा जुड़ गया!${stockNoteSuffix}`
    );
  };

  // Save Seed / Fertilizer / Pesticide Material Record (with Automatic Stock Sync & Zero Double-Counting)
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const recId = editingRecordId || `mat-${Date.now()}`;
    const qtyVal = Number(matQuantity) || 1;
    const rateVal = Number(matRatePerUnit) || 0;
    const stockCat = mapMaterialTypeToStockCategory(matType);
    const currentStockList = store.stockItems || [];
    const currentMovements = store.stockMovements || [];

    // Case 1: Editing an existing material record
    if (editingRecordId) {
      const plotLabel =
        selectedAcreNum !== '0'
          ? `${selectedPlotName} (एकड़ #${selectedAcreNum})`
          : selectedPlotName;
      const record: MaterialRecord = {
        id: recId,
        type: matType,
        itemName: matItemName.trim() || 'खाद / बीज / दवाई',
        quantity: qtyVal,
        unit: matUnit,
        vendor: matVendor.trim() || 'खाद-बीज दुकान',
        ratePerUnit: rateVal,
        totalAmount: calculatedMaterialTotal,
        plotName: plotLabel,
        date: expenseDate,
        workTimeSlot,
        notes: notes.trim() || `${qtyVal} ${matUnit} × ₹${rateVal} • ${workTimeSlot}`,
      };
      const nextMats = (store.materialRecords || []).map((r) =>
        r.id === editingRecordId ? record : r
      );
      const nextPlots = syncAcreSubPlotExpense(
        store.plots,
        selectedPlotName,
        selectedAcreNum,
        recId,
        `${record.itemName} (${record.quantity} ${record.unit})`,
        record.vendor,
        rateVal,
        record.totalAmount,
        expenseDate,
        workTimeSlot,
        'chemical_seed'
      );
      onSaveStore({
        ...store,
        materialRecords: nextMats,
        plots: nextPlots,
      });
      setEditingRecordId(null);
      setNotes('');
      showQuickSuccess('✅ खाद / बीज / दवाई खर्चा अपडेट हो गया!');
      return;
    }

    // Case 2: Used in a Specific Acre (selectedAcreNum !== '0') -> Deduct from Godown Stock if available & DO NOT double-count in Purchase Ledger!
    const existingStock = findMatchingStockItem(
      currentStockList,
      matItemName,
      stockCat
    );
    if (
      selectedAcreNum !== '0' &&
      existingStock &&
      existingStock.currentStock > 0
    ) {
      const { nextStockItems, nextStockMovements, nextPlots, updatedItem } =
        applyStockOutTransaction({
          stockItems: currentStockList,
          stockMovements: currentMovements,
          plots: store.plots,
          stockItemId: existingStock.id,
          itemName: matItemName.trim() || existingStock.name,
          category: stockCat,
          quantity: qtyVal,
          unit: matUnit,
          ratePerUnit: rateVal || existingStock.ratePerUnit,
          movementType: 'use_in_acre',
          plotName: selectedPlotName,
          acreNumber: selectedAcreNum,
          partyName: matVendor.trim() || 'गोदाम स्टॉक से उपयोग',
          reasonOrNote: notes.trim() || 'गोदाम स्टॉक से खेत में डाला',
          date: expenseDate,
          workTimeSlot,
        });

      onSaveStore({
        ...store,
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: nextPlots,
      });

      setNotes('');
      showQuickSuccess(
        `✅ गोदाम स्टॉक से -${qtyVal} ${updatedItem.unitLabelHi} घटा दिया गया और एकड़ #${selectedAcreNum} के हिसाब में जुड़ गया (बिना डबल-काउंटिंग)!`
      );
      return;
    }

    // Case 3: New Purchase for Whole Farm / Godown Stock (selectedAcreNum === '0' or not in stock yet)
    const plotLabel =
      selectedAcreNum !== '0'
        ? `${selectedPlotName} (एकड़ #${selectedAcreNum})`
        : `${selectedPlotName} (गोदाम स्टॉक खरीद)`;

    const record: MaterialRecord = {
      id: recId,
      type: matType,
      itemName: matItemName.trim() || 'खाद / बीज / दवाई',
      quantity: qtyVal,
      unit: matUnit,
      vendor: matVendor.trim() || 'खाद-बीज दुकान',
      ratePerUnit: rateVal,
      totalAmount: calculatedMaterialTotal,
      plotName: plotLabel,
      date: expenseDate,
      workTimeSlot,
      notes: notes.trim() || `${qtyVal} ${matUnit} × ₹${rateVal} • ${workTimeSlot}`,
    };

    const nextMats = [record, ...(store.materialRecords || [])];

    // Automatically add to Godown Stock on Purchase!
    const { nextStockItems, nextStockMovements, updatedItem } =
      applyStockInTransaction({
        stockItems: currentStockList,
        stockMovements: currentMovements,
        category: stockCat,
        itemName: record.itemName,
        quantity: qtyVal,
        unit: matUnit,
        ratePerUnit: rateVal,
        movementType: 'purchase_in',
        partyName: record.vendor,
        reasonOrNote: notes.trim() || 'नई खरीद से स्टॉक में जमा',
        date: expenseDate,
        workTimeSlot,
      });

    // If they also selected a specific acre at the moment of fresh purchase, deduct that used portion immediately
    let finalStockItems = nextStockItems;
    let finalStockMovements = nextStockMovements;
    let finalPlots = store.plots;

    if (selectedAcreNum !== '0') {
      const usedRes = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: store.plots,
        stockItemId: updatedItem.id,
        itemName: updatedItem.name,
        category: stockCat,
        quantity: qtyVal,
        unit: matUnit,
        ratePerUnit: rateVal,
        movementType: 'use_in_acre',
        plotName: selectedPlotName,
        acreNumber: selectedAcreNum,
        partyName: record.vendor,
        reasonOrNote: notes.trim() || 'सीधी खरीद व एकड़ में उपयोग',
        date: expenseDate,
        workTimeSlot,
      });
      finalStockItems = usedRes.nextStockItems;
      finalStockMovements = usedRes.nextStockMovements;
      finalPlots = usedRes.nextPlots;
    }

    onSaveStore({
      ...store,
      materialRecords: nextMats,
      stockItems: finalStockItems,
      stockMovements: finalStockMovements,
      plots: finalPlots,
    });

    setEditingRecordId(null);
    setNotes('');
    showQuickSuccess(
      selectedAcreNum === '0'
        ? `✅ ₹${record.totalAmount.toLocaleString('en-IN')} खरीद दर्ज और +${qtyVal} ${updatedItem.unitLabelHi} गोदाम स्टॉक में जुड़ गया!`
        : `✅ ₹${record.totalAmount.toLocaleString('en-IN')} खरीद व एकड़ #${selectedAcreNum} में उपयोग दर्ज!`
    );
  };

  // Load any record into the top Game Board for Editing
  const extractBasePlotAndAcre = (rawPlotName?: string) => {
    if (!rawPlotName) {
      return { basePlot: store.plots[0]?.name || '', acreStr: '0' };
    }
    const match = rawPlotName.match(/^(.*?)\s*\(एकड़\s*#([0-9.]+)\)$/);
    if (match) {
      return { basePlot: match[1].trim(), acreStr: match[2] };
    }
    return { basePlot: rawPlotName, acreStr: '0' };
  };

  const handleEditMachinery = (rec: MachineryRecord) => {
    const { basePlot, acreStr } = extractBasePlotAndAcre(rec.plotName);
    setActiveTab('machinery');
    setEditingRecordId(rec.id);
    setSelectedPlotName(basePlot);
    setSelectedAcreNum(acreStr);
    setExpenseDate(rec.date);
    setWorkTimeSlot(rec.workTimeSlot || '🌅 सुबह (Morning)');
    setMachActivity(rec.activity);
    setMachDriverName(rec.driverName);
    setMachAcresCovered(String(rec.acres || 1));
    setMachRateValue(String(rec.ratePerUnit || rec.totalAmount));
    setIsPaidStatus(rec.isPaid);
    setNotes(rec.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditLabour = (rec: LabourRecord) => {
    const { basePlot, acreStr } = extractBasePlotAndAcre(rec.plotName);
    setActiveTab('labour');
    setEditingRecordId(rec.id);
    setSelectedPlotName(basePlot);
    setSelectedAcreNum(acreStr);
    setExpenseDate(rec.date);
    setWorkTimeSlot(rec.workTimeSlot || '🌅 सुबह (Morning)');
    setLabActivity(rec.activity);
    setLabWorkerName(rec.mateName);
    setLabRateType(rec.rateType);
    const units =
      rec.bagsOrTanksCount || rec.acresCovered || rec.workersCount || 1;
    setLabUnitCount(String(units));
    setLabRatePerUnit(String(rec.ratePerWorkerOrAcre || rec.totalAmount));
    setIsPaidStatus(rec.isPaid);
    setNotes(rec.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditMaterial = (rec: MaterialRecord) => {
    const { basePlot, acreStr } = extractBasePlotAndAcre(rec.plotName);
    setActiveTab('materials');
    setEditingRecordId(rec.id);
    setSelectedPlotName(basePlot);
    setSelectedAcreNum(acreStr);
    setExpenseDate(rec.date);
    setWorkTimeSlot(rec.workTimeSlot || '🌅 सुबह (Morning)');
    setMatType(rec.type);
    setMatItemName(rec.itemName);
    setMatVendor(rec.vendor || '');
    setMatQuantity(String(rec.quantity));
    setMatUnit(rec.unit);
    setMatRatePerUnit(String(rec.ratePerUnit));
    setNotes(rec.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete handlers (Automatically captured by undoManager for Undo recovery!)
  const handleDeleteMachinery = (id: string) => {
    onSaveStore({
      ...store,
      machineryRecords: store.machineryRecords.filter((r) => r.id !== id),
    });
  };

  const handleDeleteLabour = (id: string) => {
    onSaveStore({
      ...store,
      labourRecords: store.labourRecords.filter((r) => r.id !== id),
    });
  };

  const handleDeleteMaterial = (id: string) => {
    onSaveStore({
      ...store,
      materialRecords: (store.materialRecords || []).filter((r) => r.id !== id),
    });
  };

  // Toggle Paid / Unpaid with 1 tap
  const toggleMachineryPaid = (id: string) => {
    onSaveStore({
      ...store,
      machineryRecords: store.machineryRecords.map((r) =>
        r.id === id
          ? {
              ...r,
              isPaid: !r.isPaid,
              paidAmount: !r.isPaid ? r.totalAmount : 0,
            }
          : r
      ),
    });
  };

  const toggleLabourPaid = (id: string) => {
    onSaveStore({
      ...store,
      labourRecords: store.labourRecords.map((r) =>
        r.id === id
          ? {
              ...r,
              isPaid: !r.isPaid,
              paidAmount: !r.isPaid ? r.totalAmount : 0,
            }
          : r
      ),
    });
  };

  // Mandi / Aadti Handlers
  const handleAddAadtiRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount) return;
    const newRec: AadtiRecord = {
      id: `aadti-${Date.now()}`,
      date: txDate,
      aadtiName: aadtiName.trim() || 'आढ़ती सेठ, मंडी',
      type: txType,
      description:
        txDescription.trim() ||
        (txType === 'credit' ? '🌾 फसल बिक्री जमा' : '💸 आढ़ती से नकद/खाद उधार लिया'),
      amount: Number(txAmount) || 0,
    };
    onSaveStore({
      ...store,
      aadtiRecords: [newRec, ...(store.aadtiRecords || [])],
    });
    setTxAmount('');
    setTxDescription('');
    showQuickSuccess('✅ आढ़ती / मंडी खाता एंट्री सेव हो गई!');
  };

  const handleDeleteAadtiRecord = (id: string) => {
    onSaveStore({
      ...store,
      aadtiRecords: (store.aadtiRecords || []).filter((r) => r.id !== id),
    });
  };

  // Summary Totals
  const totalMachineryCost = store.machineryRecords.reduce(
    (s, r) => s + r.totalAmount,
    0
  );
  const totalLabourCost = store.labourRecords.reduce(
    (s, r) => s + r.totalAmount,
    0
  );
  const totalMaterialCost = (store.materialRecords || []).reduce(
    (s, r) => s + r.totalAmount,
    0
  );
  const totalUnpaidAmount =
    store.machineryRecords
      .filter((r) => !r.isPaid)
      .reduce((s, r) => s + (r.totalAmount - (r.paidAmount || 0)), 0) +
    store.labourRecords
      .filter((r) => !r.isPaid)
      .reduce((s, r) => s + (r.totalAmount - (r.paidAmount || 0)), 0);

  return (
    <div className="space-y-5 max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {savedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{savedToast}</span>
        </div>
      )}

      {/* 1. CLEAN FARMER EXPENSE HEADER + EXPORT + HELP */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl sm:text-3xl">📖</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  खर्चा खाता (मशीनरी, स्प्रे व खाद-बीज)
                </h2>
                <SectionHelpPopup
                  compact
                  titleHi="खर्चा, स्प्रे/छींटा व गोदाम स्टॉक गाइड"
                  subtitleHi="खर्चा लिखें और गोदाम स्टॉक अपने-आप अपडेट करें"
                  bulletsHi={[
                    '1. ऊपर 4 आसान बटन दिए हैं: ट्रैक्टर/मशीनरी, स्प्रे/छींटा/लेबर, खाद-बीज खरीद, और आढ़ती खाता।',
                    '2. स्प्रे, फोलियर स्प्रे, खाद छींटा या बुवाई लिखते समय फॉर्म आपसे इस्तेमाल हुई दवाई/खाद की मात्रा पूछेगा और गोदाम स्टॉक से अपने-आप घटा (Minus) देगा।',
                    '3. Excel और PDF बटन से पूरा हिसाब-किताब 1 क्लिक में डाउनलोड या प्रिंट करें।',
                  ]}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                कुल दर्ज खर्च:{' '}
                <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                  ₹
                  {(
                    totalMachineryCost +
                    totalLabourCost +
                    totalMaterialCost
                  ).toLocaleString('en-IN')}
                </strong>
                {totalUnpaidAmount > 0 && (
                  <>
                    {' '}
                    · देना बाकी:{' '}
                    <strong className="font-mono text-rose-600 dark:text-rose-400">
                      ₹{totalUnpaidAmount.toLocaleString('en-IN')}
                    </strong>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenStock && (
              <button
                type="button"
                onClick={onOpenStock}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>गोदाम स्टॉक देखें →</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => exportFarmDataToExcel(store)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => exportFarmDataToCSV(store)}
              className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black cursor-pointer"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() => exportFarmDataToPDF(store)}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* 2. 4 SIMPLE, CLEAR EXPENSE TABS (NO DUPLICATE STOCK TAB) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('machinery');
              setEditingRecordId(null);
            }}
            className={`min-h-[64px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeTab === 'machinery'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-slate-900 dark:text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <Tractor className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>1. ट्रैक्टर / मशीनरी</span>
            </div>
            <div className="text-sm font-mono font-black text-amber-700 dark:text-amber-300 mt-1 tabular-nums">
              ₹{totalMachineryCost.toLocaleString('en-IN')}{' '}
              <span className="text-[11px] font-sans font-semibold text-slate-500">
                ({store.machineryRecords.length})
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('labour');
              setEditingRecordId(null);
            }}
            className={`min-h-[64px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeTab === 'labour'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-slate-900 dark:text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <SprayCan className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>2. स्प्रे / छींटा / लेबर</span>
            </div>
            <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">
              ₹{totalLabourCost.toLocaleString('en-IN')}{' '}
              <span className="text-[11px] font-sans font-semibold text-slate-500">
                ({store.labourRecords.length})
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('materials');
              setEditingRecordId(null);
            }}
            className={`min-h-[64px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeTab === 'materials'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-slate-900 dark:text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>3. खाद / बीज खरीद</span>
            </div>
            <div className="text-sm font-mono font-black text-purple-700 dark:text-purple-300 mt-1 tabular-nums">
              ₹{totalMaterialCost.toLocaleString('en-IN')}{' '}
              <span className="text-[11px] font-sans font-semibold text-slate-500">
                ({(store.materialRecords || []).length})
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('mandi');
              setEditingRecordId(null);
            }}
            className={`min-h-[64px] p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
              activeTab === 'mandi'
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/60 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="text-xs sm:text-sm font-black flex items-center gap-1.5">
              <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>4. आढ़ती / मंडी खाता</span>
            </div>
            <div className="text-sm font-mono font-black text-indigo-700 dark:text-indigo-300 mt-1 tabular-nums">
              {(store.aadtiRecords || []).length} एंट्री
            </div>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SHARED STEP 1 (FOR MACHINERY, LABOUR & MATERIALS):                   */}
      {/* COLLAPSIBLE FORM WITH ACRE SELECTOR & HELP POPUP                     */}
      {/* ==================================================================== */}
      {activeTab !== 'mandi' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {activeTab === 'machinery'
                  ? '🚜 ट्रैक्टर व मशीनरी खर्चा एंट्री फॉर्म'
                  : activeTab === 'labour'
                  ? '🖐️ स्प्रे, फोलियर छींटा (Broadcasting) व लेबर फॉर्म'
                  : '🧪 खाद, बीज व स्प्रे केमिकल खरीद फॉर्म'}
              </span>
              <SectionHelpPopup
                compact
                titleHi={
                  activeTab === 'machinery'
                    ? 'ट्रैक्टर व मशीनरी फॉर्म गाइड'
                    : activeTab === 'labour'
                    ? 'स्प्रे, फोलियर ब्रॉडकास्टिंग व छींटा गाइड'
                    : 'खाद, बीज व स्प्रे खरीद गाइड'
                }
                bulletsHi={[
                  'सबसे पहले गोल एकड़ बटन से चुनें कि काम पूरे खेत में हुआ या किसी खास एकड़ (#1 से #9) में।',
                  'जब भी आप स्प्रे (Manual/Boom/Drone/Foliar), खाद/दवाई छींटा या बुवाई चुनते हैं, तो नीचे गोदाम स्टॉक से इस्तेमाल हुई दवाई/खाद/बीज और उसकी मात्रा (Quantity) पूछी जाती है।',
                  'सेव करते ही वह मात्रा गोदाम स्टॉक से अपने-आप घट (Minus) जाएगी!',
                ]}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsMainFormCollapsed(!isMainFormCollapsed)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
            >
              {isMainFormCollapsed ? (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>🔽 फॉर्म खोलें (Expand Form)</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>🔼 फॉर्म छोटा करें (Collapse Form)</span>
                </>
              )}
            </button>
          </div>

          {!isMainFormCollapsed && (
            <>
              {editingRecordId && (
                <div className="p-3 rounded-2xl bg-amber-500/20 border-2 border-amber-500 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
                    <Pencil className="w-4 h-4 shrink-0" />
                    <span>
                      ✏️ आप पुराना खर्चा एडिट (Edit) कर रहे हैं — नीचे बदलाव करके सेव दबाएं
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingRecordId(null)}
                    className="px-3 py-1 rounded-xl bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    रद्द करें (Cancel)
                  </button>
                </div>
              )}

              {/* STEP 1: Plot & Instagram Story Circular Acre Scroller */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">
                    🌾 खेत व एकड़ चुनें (पूरा खेत या एकड़ #1 से #9):
                  </span>

                  {store.plots.length > 1 && (
                    <select
                      value={selectedPlotName}
                      onChange={(e) => {
                        setSelectedPlotName(e.target.value);
                        setSelectedAcreNum('0');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                    >
                      {store.plots.map((p) => (
                        <option key={p.id} value={p.name}>
                          🌾 {p.name} ({p.acres} एकड़)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Instagram Story Circular Tiles Scroller */}
                <div className="flex items-start gap-3 overflow-x-auto pb-2 pt-1">
              {/* "पूरा खेत" Circular Tile */}
              <button
                type="button"
                onClick={() => {
                  setSelectedAcreNum('0');
                  if (activePlotObj) {
                    setMachAcresCovered(String(activePlotObj.acres));
                  }
                }}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
              >
                <div
                  className={`p-[3px] rounded-full transition-all ${
                    selectedAcreNum === '0'
                      ? 'bg-gradient-to-tr from-amber-400 via-emerald-400 to-teal-400 ring-2 ring-amber-400 scale-105 shadow-md'
                      : 'bg-slate-300 dark:bg-slate-700 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-13 h-13 rounded-full flex flex-col items-center justify-center border-2 border-white dark:border-slate-950 ${
                      selectedAcreNum === '0'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    <span className="text-[11px] font-black leading-none">🌾 पूरा</span>
                    <span className="text-[9px] font-bold mt-0.5">
                      {activePlotObj?.acres || 1} एकड़
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold whitespace-nowrap ${
                    selectedAcreNum === '0'
                      ? 'text-emerald-600 dark:text-emerald-400 font-black'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  पूरा खेत
                </span>
              </button>

              {/* Individual Acre #1, #2, #3... Circular Story Tiles */}
              {activeSubPlots.map((sp: AcreSubPlot) => {
                const isSelected = String(selectedAcreNum) === String(sp.acreNumber);
                const isSeeded =
                  sp.acreStatus === 'Seeded' ||
                  (!sp.acreStatus &&
                    !`${sp.cropVariety || ''} ${sp.cropName || ''}`.includes('खाली'));
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      setSelectedAcreNum(String(sp.acreNumber));
                      setMachAcresCovered('1');
                      if (labRateType === 'per_acre') {
                        setLabUnitCount('1');
                      }
                    }}
                    className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <div
                      className={`p-[3px] rounded-full transition-all ${
                        isSelected
                          ? 'bg-gradient-to-tr from-amber-400 via-yellow-400 to-emerald-400 ring-2 ring-amber-400 scale-105 shadow-md'
                          : isSeeded
                          ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-85 hover:opacity-100'
                          : 'bg-gradient-to-tr from-sky-400 to-blue-500 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div
                        className={`w-13 h-13 rounded-full flex flex-col items-center justify-center border-2 border-white dark:border-slate-950 ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        <span className="text-xs font-mono font-black leading-none">
                          #{sp.acreNumber}
                        </span>
                        <span className="text-[9px] font-bold mt-0.5">
                          {isSeeded ? '🌾 बोया' : '💧 खाली'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono whitespace-nowrap ${
                        isSelected
                          ? 'text-amber-600 dark:text-amber-400 font-black'
                          : 'text-slate-500 dark:text-slate-400 font-bold'
                      }`}
                    >
                      एकड़ #{sp.acreNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ================================================================ */}
          {/* TAB 1: 🚜 TRACTOR & ALL 21 MACHINERY OPTIONS GAME BOARD           */}
          {/* ================================================================ */}
          {activeTab === 'machinery' && (
            <form
              onSubmit={handleSaveMachinery}
              className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">
                    🚜 मशीनरी व ट्रैक्टर कार्य
                  </span>

                  {/* Category Filter Pills for 21 Machines */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {[
                      { id: 'all', label: 'सभी (21)' },
                      { id: 'sowing', label: '🌱 बिजाई' },
                      { id: 'tillage', label: '🚜 जुताई/तवियां' },
                      { id: 'spray_water', label: '🚿 स्प्रे/सिंचाई' },
                      { id: 'harvest', label: '🌾 कटाई/रीपर' },
                    ].map((grp) => (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() =>
                          setMachGroupFilter(grp.id as typeof machGroupFilter)
                        }
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-all ${
                          machGroupFilter === grp.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {grp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Big Visual 1-Tap Picture Tiles for All Machinery */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-1">
                  {ALL_MACHINERY_GAME_TILES.filter(
                    (m) => machGroupFilter === 'all' || m.group === machGroupFilter
                  ).map((m) => {
                    const isSelected = machActivity === m.activity;
                    return (
                      <button
                        key={m.activity}
                        type="button"
                        onClick={() => {
                          setMachActivity(m.activity);
                          setMachRateValue(String(m.defaultRate));
                        }}
                        className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-slate-900 dark:text-white shadow-md scale-[1.02]'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-400'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{m.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black leading-tight truncate">
                            {m.shortHi}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                            ~₹{m.defaultRate}/एकड़
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">
                  📋 कार्य विवरण व दर
                </div>

                {/* खर्चा कब हुआ (Date + Time of Day) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      📅 खर्चा किस तारीख को हुआ? (Date):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '⚡ आज (Today)', date: getOffsetIsoDate(0) },
                        { label: '⏪ कल (Yesterday)', date: getOffsetIsoDate(1) },
                        { label: '📅 परसों', date: getOffsetIsoDate(2) },
                      ].map((d) => (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => setExpenseDate(d.date)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            expenseDate === d.date
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      ⏰ किस समय काम हुआ? (Time of Day):
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setWorkTimeSlot(slot.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            workTimeSlot === slot.id
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Driver Name + Rate Calculation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      🚜 ट्रैक्टर मालिक / ड्राइवर का नाम:
                    </label>
                    <input
                      type="text"
                      value={machDriverName}
                      onChange={(e) => setMachDriverName(e.target.value)}
                      placeholder="जैसे: रमेश ट्रैक्टर / अपना ट्रैक्टर"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    {rememberedNames.length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5">
                        {rememberedNames.map((nm) => (
                          <button
                            key={nm}
                            type="button"
                            onClick={() => setMachDriverName(nm)}
                            className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer hover:bg-amber-400 hover:text-slate-950"
                          >
                            👤 {nm}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      🌾 कितने एकड़ में काम हुआ?
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={machAcresCovered}
                      onChange={(e) => setMachAcresCovered(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      💰 प्रति एकड़ रेट (₹):
                    </label>
                    <input
                      type="number"
                      value={machRateValue}
                      onChange={(e) => setMachRateValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-amber-400 text-base font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Linked Godown Stock Item & Quantity Deduction for Sowing / Boom Sprayer / Drone Spray / Foliar Spread */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useStockInJob}
                      onChange={(e) => setUseStockInJob(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    <span>
                      🧪 इस बुवाई / स्प्रे / ब्रॉडकास्टिंग में लगी खाद, बीज या दवाई को गोदाम स्टॉक से घटाएं (Minus from Stock)
                    </span>
                  </label>

                  {useStockInJob && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          📦 कौन-सा बीज / खाद / स्प्रे दवाई इस्तेमाल हुई?
                        </label>
                        <select
                          value={selectedJobStockId}
                          onChange={(e) => setSelectedJobStockId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/50 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {availableStockItems.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} (बचा स्टॉक: {st.currentStock} {st.unitLabelHi})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          ⚖️ कितनी मात्रा लगी? (Quantity Used):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={jobStockQuantity}
                            onChange={(e) => setJobStockQuantity(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-sm font-mono font-black text-slate-900 dark:text-white"
                          />
                          {['0.5', '1', '2', '5'].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setJobStockQuantity(q)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-xs font-mono font-black cursor-pointer shrink-0"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Status + Total & Big Save Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPaidStatus(true)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        isPaidStatus
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      ✅ नकद दे दिया (Paid)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaidStatus(false)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        !isPaidStatus
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      ⏳ अभी बाकी है (उधार)
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:from-amber-300 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-xl flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>
                      {editingRecordId
                        ? `💾 बदलाव सेव करें (₹${calculatedMachineryTotal.toLocaleString('en-IN')})`
                        : `💾 मशीनरी खर्चा जोड़ें (₹${calculatedMachineryTotal.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 2: 🖐️ HUMAN BROADCASTING (खाद/दवाई छींटा), SPRAY & LABOUR   */}
          {/* ================================================================ */}
          {activeTab === 'labour' && (
            <form
              onSubmit={handleSaveLabour}
              className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                    🖐️ छींटा (Broadcasting), स्प्रे व मजदूरी कार्य
                  </span>
                </div>

                {/* Big Visual Tiles for Human Broadcasting, Spray & Labour */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ALL_LABOUR_GAME_TILES.map((tile) => {
                    const isSelected = labActivity === tile.activity;
                    return (
                      <button
                        key={tile.activity}
                        type="button"
                        onClick={() => {
                          setLabActivity(tile.activity);
                          setLabRateType(tile.defaultRateType);
                          setLabRatePerUnit(String(tile.defaultRate));
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white shadow-md scale-[1.01]'
                            : tile.isBroadcastingOrSpray
                            ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/40 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl shrink-0">
                          {tile.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-black leading-tight">
                              {tile.shortHi}
                            </p>
                            {tile.isBroadcastingOrSpray && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black">
                                छींटा / स्प्रे
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {tile.subHi}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    🧮 दर का प्रकार (Rate Type):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'per_acre', label: '🌾 प्रति एकड़ रेट', sub: 'Per Acre' },
                      {
                        id: 'per_bag',
                        label: '🛍️ प्रति बोरी छींटा',
                        sub: 'Per Bag Broadcast',
                      },
                      {
                        id: 'per_tank',
                        label: '🎒 प्रति टंकी स्प्रे',
                        sub: 'Per Spray Tank',
                      },
                      {
                        id: 'per_worker',
                        label: '👷 प्रति मजदूर दिहाड़ी',
                        sub: 'Per Worker',
                      },
                      {
                        id: 'contract_lump',
                        label: '🤝 सीधा कुल ठेका',
                        sub: 'Lump Sum',
                      },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setLabRateType(mode.id as LabourRecord['rateType'])
                        }
                        className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                          labRateType === mode.id
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-sm'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-bold'
                        }`}
                      >
                        <div className="text-xs leading-tight">{mode.label}</div>
                        <div className="text-[9px] opacity-75">{mode.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* खर्चा कब हुआ (Date + Time of Day) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      📅 छींटा / मजदूरी किस तारीख को हुई? (Date):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '⚡ आज (Today)', date: getOffsetIsoDate(0) },
                        { label: '⏪ कल (Yesterday)', date: getOffsetIsoDate(1) },
                        { label: '📅 परसों', date: getOffsetIsoDate(2) },
                      ].map((d) => (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => setExpenseDate(d.date)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            expenseDate === d.date
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      ⏰ किस समय काम हुआ? (Time of Day):
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setWorkTimeSlot(slot.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            workTimeSlot === slot.id
                              ? 'bg-amber-400 text-slate-950 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Worker Name + Units + Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      👷 छींटा लगाने वाले / मजदूर का नाम:
                    </label>
                    <input
                      type="text"
                      value={labWorkerName}
                      onChange={(e) => setLabWorkerName(e.target.value)}
                      placeholder="जैसे: राजू / बिरजू टोली"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    {rememberedNames.length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5">
                        {rememberedNames.map((nm) => (
                          <button
                            key={nm}
                            type="button"
                            onClick={() => setLabWorkerName(nm)}
                            className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap cursor-pointer hover:bg-emerald-400 hover:text-slate-950"
                          >
                            👤 {nm}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {labRateType !== 'contract_lump' && (
                    <div>
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                        {labRateType === 'per_acre'
                          ? '🌾 कितने एकड़ में छींटा/काम हुआ?'
                          : labRateType === 'per_bag'
                          ? '🛍️ कितनी बोरी/कट्टे का छींटा लगा?'
                          : labRateType === 'per_tank'
                          ? '🎒 कितनी टंकी/पंप स्प्रे लगी?'
                          : '👷 कितने मजदूर लगे?'}
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={labUnitCount}
                        onChange={(e) => setLabUnitCount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      {labRateType === 'per_acre'
                        ? '💰 प्रति एकड़ चार्ज (₹):'
                        : labRateType === 'per_bag'
                        ? '💰 प्रति बोरी छींटा चार्ज (₹):'
                        : labRateType === 'per_tank'
                        ? '💰 प्रति टंकी स्प्रे चार्ज (₹):'
                        : labRateType === 'per_worker'
                        ? '💰 प्रति मजदूर दिहाड़ी (₹):'
                        : '💰 कुल ठेका राशि (₹):'}
                    </label>
                    <input
                      type="number"
                      value={labRatePerUnit}
                      onChange={(e) => setLabRatePerUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-base font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Linked Godown Stock Item & Quantity Deduction for Spray & Foliar Broadcasting */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useStockInJob}
                      onChange={(e) => setUseStockInJob(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500"
                    />
                    <span>
                      🧪 इस स्प्रे / फोलियर ब्रॉडकास्टिंग / छींटा में कौन-सी दवाई, खाद या बीज लगा? (गोदाम स्टॉक से ऑटो-माइनस)
                    </span>
                  </label>

                  {useStockInJob && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          📦 गोदाम स्टॉक में से दवाई / खाद / बीज चुनें:
                        </label>
                        <select
                          value={selectedJobStockId}
                          onChange={(e) => setSelectedJobStockId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/50 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {availableStockItems.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.name} (बचा स्टॉक: {st.currentStock} {st.unitLabelHi})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          ⚖️ कितनी मात्रा लगी? (Quantity Used — स्टॉक से घटेगी):
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={jobStockQuantity}
                            onChange={(e) => setJobStockQuantity(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-sm font-mono font-black text-slate-900 dark:text-white"
                          />
                          {['0.5', '1', '2', '5'].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setJobStockQuantity(q)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-xs font-mono font-black cursor-pointer shrink-0"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Status + Save Button */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPaidStatus(true)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        isPaidStatus
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      ✅ नकद दे दिया (Paid)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaidStatus(false)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                        !isPaidStatus
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      ⏳ अभी बाकी है (उधार)
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 text-slate-950 font-black text-sm shadow-xl flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>
                      {editingRecordId
                        ? `💾 बदलाव सेव करें (₹${calculatedLabourTotal.toLocaleString('en-IN')})`
                        : `💾 छींटा / मजदूरी जोड़ें (₹${calculatedLabourTotal.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* TAB 3: 🧪 SEEDS, FERTILIZERS & PESTICIDES PURCHASE GAME BOARD    */}
          {/* ================================================================ */}
          {activeTab === 'materials' && (
            <form
              onSubmit={handleSaveMaterial}
              className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800"
            >
              <div className="space-y-2.5">
                <span className="text-xs sm:text-sm font-black text-purple-600 dark:text-purple-400">
                  🧪 खाद, बीज व स्प्रे दवाई चयन
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MATERIAL_GAME_PRESETS.map((preset) => {
                    const isSelected = matItemName === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setMatItemName(preset.name);
                          setMatType(preset.type);
                          setMatUnit(preset.unit);
                          setMatRatePerUnit(String(preset.defaultRate));
                        }}
                        className={`p-2.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-2 ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500 text-slate-900 dark:text-white shadow-md scale-[1.02]'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                        }`}
                      >
                        <span className="text-2xl shrink-0">{preset.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-black leading-tight truncate">
                            {preset.name.split('(')[0].trim()}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400">
                            ₹{preset.defaultRate}/{preset.unitLabelHi}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3.5">
                {/* खर्चा कब हुआ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      📅 कब खरीदा / कब डाला? (Date):
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: '⚡ आज', date: getOffsetIsoDate(0) },
                        { label: '⏪ कल', date: getOffsetIsoDate(1) },
                        { label: '📅 परसों', date: getOffsetIsoDate(2) },
                      ].map((d) => (
                        <button
                          key={d.label}
                          type="button"
                          onClick={() => setExpenseDate(d.date)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
                            expenseDate === d.date
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                      ⏰ समय (Time):
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setWorkTimeSlot(slot.id)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-black cursor-pointer ${
                            workTimeSlot === slot.id
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      🧪 सामान का नाम:
                    </label>
                    <input
                      type="text"
                      value={matItemName}
                      onChange={(e) => setMatItemName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      🏪 दुकान / कंपनी का नाम:
                    </label>
                    <input
                      type="text"
                      value={matVendor}
                      onChange={(e) => setMatVendor(e.target.value)}
                      placeholder="जैसे: इफको / किसान एग्रो स्टोर"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      📦 मात्रा ({matUnit}):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={matQuantity}
                      onChange={(e) => setMatQuantity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      💰 प्रति यूनिट रेट (₹):
                    </label>
                    <input
                      type="number"
                      value={matRatePerUnit}
                      onChange={(e) => setMatRatePerUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border-2 border-purple-500 text-base font-mono font-black text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-sm shadow-xl flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>
                      {editingRecordId
                        ? `💾 बदलाव सेव करें (₹${calculatedMaterialTotal.toLocaleString('en-IN')})`
                        : `💾 खाद/बीज खर्चा जोड़ें (₹${calculatedMaterialTotal.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
            </>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISUAL GAME CARDS LIST FOR LOGGED EXPENSES (EDIT + DELETE + WHEN)     */}
      {/* ==================================================================== */}
      {activeTab === 'machinery' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                🚜 दर्ज किए गए ट्रैक्टर व मशीनरी खर्चे ({store.machineryRecords.length})
              </span>
            </h3>
          </div>

          {store.machineryRecords.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm font-bold">
              अभी कोई ट्रैक्टर/मशीनरी खर्चा दर्ज नहीं है। ऊपर से 1-टैप में जोड़ें!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {store.machineryRecords.map((rec) => {
                const tile = ALL_MACHINERY_GAME_TILES.find(
                  (t) => t.activity === rec.activity
                );
                return (
                  <div
                    key={rec.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400/70 p-4 shadow-sm flex flex-col justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl shrink-0">
                          {tile?.icon || '🚜'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                            {tile?.shortHi || rec.activity} ({rec.activity})
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                              🌾 {rec.plotName} ({rec.acres || 1} एकड़)
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-black flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                कब हुआ: {formatIndianDate(rec.date)}{' '}
                                {rec.workTimeSlot
                                  ? `• ${rec.workTimeSlot.split('(')[0]}`
                                  : ''}
                              </span>
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1.5">
                            👤 किसने किया:{' '}
                            <span className="text-slate-900 dark:text-white font-black">
                              {rec.driverName}
                            </span>
                            {rec.notes ? ` • ${rec.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white">
                          ₹{rec.totalAmount.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[10px] font-mono text-slate-500">
                          ₹{rec.ratePerUnit}/एकड़
                        </span>
                      </div>
                    </div>

                    {/* 3 Clear Action Buttons: Paid/Unpaid, Edit, Delete */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleMachineryPaid(rec.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          rec.isPaid
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {rec.isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✅ नकद दे दिया (Paid)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>⏳ बाकी है (Unpaid)</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditMachinery(rec)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>✏️ एडिट करें</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMachinery(rec.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>🗑️ हटाएं</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'labour' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                🖐️ दर्ज किए गए छींटा, स्प्रे व मजदूरी खर्चे (
                {store.labourRecords.length})
              </span>
            </h3>
          </div>

          {store.labourRecords.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm font-bold">
              अभी कोई छींटा, स्प्रे या मजदूरी खर्चा दर्ज नहीं है। ऊपर से 1-टैप में जोड़ें!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {store.labourRecords.map((rec) => {
                const tile = ALL_LABOUR_GAME_TILES.find(
                  (t) => t.activity === rec.activity
                );
                return (
                  <div
                    key={rec.id}
                    className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-400/70 p-4 shadow-sm flex flex-col justify-between gap-3 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                          {tile?.icon || '🖐️'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                            {tile?.shortHi || rec.activity}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black">
                              🌾 {rec.plotName}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-black flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                कब हुआ: {formatIndianDate(rec.date)}{' '}
                                {rec.workTimeSlot
                                  ? `• ${rec.workTimeSlot.split('(')[0]}`
                                  : ''}
                              </span>
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1.5">
                            👷 किसने किया:{' '}
                            <span className="text-slate-900 dark:text-white font-black">
                              {rec.mateName}
                            </span>
                            {rec.notes ? ` • ${rec.notes}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white">
                          ₹{rec.totalAmount.toLocaleString('en-IN')}
                        </p>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {rec.rateType === 'per_acre'
                            ? `₹${rec.ratePerWorkerOrAcre}/एकड़`
                            : rec.rateType === 'per_bag'
                            ? `₹${rec.ratePerWorkerOrAcre}/बोरी छींटा`
                            : rec.rateType === 'per_tank'
                            ? `₹${rec.ratePerWorkerOrAcre}/टंकी स्प्रे`
                            : `₹${rec.ratePerWorkerOrAcre}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleLabourPaid(rec.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                          rec.isPaid
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {rec.isPaid ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✅ दे दिया (Paid)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            <span>⏳ बाकी है (Unpaid)</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditLabour(rec)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>✏️ एडिट करें</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLabour(rec.id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>🗑️ हटाएं</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>
                🧪 दर्ज किए गए खाद, बीज व दवाई खर्चे (
                {(store.materialRecords || []).length})
              </span>
            </h3>
          </div>

          {(store.materialRecords || []).length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm font-bold">
              अभी कोई खाद, बीज या दवाई खर्चा दर्ज नहीं है। ऊपर से 1-टैप में जोड़ें!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(store.materialRecords || []).map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-purple-400/70 p-4 shadow-sm flex flex-col justify-between gap-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
                        🧪
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                          {rec.itemName} ({rec.quantity} {rec.unit})
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {rec.plotName && (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[11px] font-black">
                              🌾 {rec.plotName}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-black flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              कब हुआ: {formatIndianDate(rec.date)}{' '}
                              {rec.workTimeSlot
                                ? `• ${rec.workTimeSlot.split('(')[0]}`
                                : ''}
                            </span>
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1.5">
                          🏪 दुकान/ब्रांड:{' '}
                          <span className="text-slate-900 dark:text-white font-black">
                            {rec.vendor || 'किसान स्टोर'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white">
                        ₹{rec.totalAmount.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500">
                        ₹{rec.ratePerUnit}/{rec.unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleEditMaterial(rec)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>✏️ एडिट करें</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(rec.id)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-600 text-rose-600 dark:text-rose-300 hover:text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>🗑️ हटाएं</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: 🏪 MANDI / ARTHIYA SIMPLE PASSBOOK                            */}
      {/* ==================================================================== */}
      {activeTab === 'mandi' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  🏪 आढ़ती / मंडी गल्ला पासबुक (Aadti Hisab)
                </h3>
                <SectionHelpPopup
                  compact
                  titleHi="मंडी आढ़ती पासबुक गाइड"
                  bulletsHi={[
                    'जब आप मंडी में फसल बेचते हैं तो "फसल बिक्री जमा (+)" चुनें।',
                    'जब आढ़ती से नकद या खाद-डीजल के लिए एडवांस लेते हैं तो "उधार लिया (-)" चुनें।',
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMandiFormCollapsed(!isMandiFormCollapsed)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                {isMandiFormCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>🔽 फॉर्म खोलें</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>🔼 फॉर्म छोटा करें</span>
                  </>
                )}
              </button>
            </div>

            {!isMandiFormCollapsed && (
              <form
                onSubmit={handleAddAadtiRecord}
                className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800"
              >
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">
                    आढ़ती / फर्म का नाम:
                  </label>
                  <input
                    type="text"
                    value={aadtiName}
                    onChange={(e) => setAadtiName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">
                    लेन-देन का प्रकार:
                  </label>
                  <select
                    value={txType}
                    onChange={(e) =>
                      setTxType(e.target.value as AadtiRecord['type'])
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white"
                  >
                    <option value="credit">🌾 फसल बिक्री जमा (+)</option>
                    <option value="debit">💸 आढ़ती से नकद/उधार लिया (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">
                    राशि (₹):
                  </label>
                  <input
                    type="number"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="जैसे: 25000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1">
                    विवरण (किस बात के पैसे):
                  </label>
                  <input
                    type="text"
                    value={txDescription}
                    onChange={(e) => setTxDescription(e.target.value)}
                    placeholder="जैसे: गेहूं बिक्री / डीजल के लिए"
                    className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-md"
                  >
                    💾 पासबुक में जोड़ें
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2 pt-2">
              {(store.aadtiRecords || []).map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl ${
                          isCredit
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                          {tx.description} •{' '}
                          <span className="text-indigo-500">{tx.aadtiName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          📅 कब हुआ: {formatIndianDate(tx.date)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-sm sm:text-base font-mono font-black ${
                          isCredit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAadtiRecord(tx.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>हटाएं</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
