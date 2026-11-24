import {
  StockCategory,
  StockItem,
  StockMovementLog,
  MaterialType,
  MaterialRecord,
  FarmPlot,
  AcreExpenseEntry,
} from '../types/farm';

export const UNIT_LABELS_HI: Record<StockItem['unit'], string> = {
  bag: 'बैग/कट्टा',
  kg: 'किलो',
  litre: 'लीटर',
  packet: 'पैकेट',
  quintal: 'क्विंटल',
};

export const STOCK_CATEGORY_META: Record<
  StockCategory,
  {
    labelHi: string;
    shortHi: string;
    icon: string;
    badgeClass: string;
    defaultUnit: StockItem['unit'];
  }
> = {
  khad: {
    labelHi: 'खाद / उर्वरक (Fertilizer)',
    shortHi: 'खाद (Khad)',
    icon: '🛍️',
    badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40',
    defaultUnit: 'bag',
  },
  beej: {
    labelHi: 'बीज (Seeds)',
    shortHi: 'बीज (Beej)',
    icon: '🌱',
    badgeClass: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40',
    defaultUnit: 'bag',
  },
  spray: {
    labelHi: 'स्प्रे केमिकल / दवाई (Spray)',
    shortHi: 'स्प्रे दवाई (Spray)',
    icon: '🧴',
    badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40',
    defaultUnit: 'litre',
  },
  grain: {
    labelHi: 'अनाज / फसल उपज (Grain)',
    shortHi: 'अनाज (Grain)',
    icon: '🌾',
    badgeClass: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40',
    defaultUnit: 'quintal',
  },
};

export const COMMON_EXPENSE_REASONS_HI = [
  '🌱 सामान्य बुवाई / पहली खुराक (Normal Dose)',
  '🟡 पीलापन / जिंक-यूरिया की अतिरिक्त खुराक (Yellowing)',
  '🌿 ज्यादा खरपतवार / दोबारा स्प्रे (Heavy Weeds)',
  '💧 नीची जमीन / नमी की वजह से दोबारा जुताई-बुवाई',
  '🐛 कीट / सुंडी / फंगस की रोकथाम स्प्रे',
  '🌾 कमजोर फुटाव / ग्रोथ बढ़ाने के लिए टॉनिक-खाद',
];

export const DEFAULT_STOCK_ITEMS: StockItem[] = [
  {
    id: 'stk-urea',
    category: 'khad',
    name: 'यूरिया खाद (Urea 45kg)',
    unit: 'bag',
    unitLabelHi: 'बैग/कट्टा',
    totalPurchasedOrHarvested: 15,
    totalUsedInFarm: 8,
    totalSold: 0,
    currentStock: 7,
    ratePerUnit: 270,
    lastUpdated: '2026-11-10',
  },
  {
    id: 'stk-dap',
    category: 'khad',
    name: 'डीएपी खाद (DAP 50kg)',
    unit: 'bag',
    unitLabelHi: 'बैग/कट्टा',
    totalPurchasedOrHarvested: 12,
    totalUsedInFarm: 7,
    totalSold: 0,
    currentStock: 5,
    ratePerUnit: 1350,
    lastUpdated: '2026-11-10',
  },
  {
    id: 'stk-zinc',
    category: 'khad',
    name: 'जिंक सल्फेट (Zinc)',
    unit: 'kg',
    unitLabelHi: 'किलो',
    totalPurchasedOrHarvested: 25,
    totalUsedInFarm: 10,
    totalSold: 0,
    currentStock: 15,
    ratePerUnit: 180,
    lastUpdated: '2026-11-08',
  },
  {
    id: 'stk-wheat-seed',
    category: 'beej',
    name: 'गेहूं बीज (DBW 327 / PBW 550)',
    unit: 'bag',
    unitLabelHi: 'बैग (40kg)',
    totalPurchasedOrHarvested: 9,
    totalUsedInFarm: 2,
    totalSold: 0,
    currentStock: 7,
    ratePerUnit: 1680,
    lastUpdated: '2026-11-05',
  },
  {
    id: 'stk-mustard-seed',
    category: 'beej',
    name: 'सरसों बीज (Pusa Bold)',
    unit: 'kg',
    unitLabelHi: 'किलो',
    totalPurchasedOrHarvested: 10,
    totalUsedInFarm: 7,
    totalSold: 0,
    currentStock: 3,
    ratePerUnit: 280,
    lastUpdated: '2026-09-28',
  },
  {
    id: 'stk-coragen',
    category: 'spray',
    name: 'कोराजन कीटनाशक (Coragen Spray)',
    unit: 'litre',
    unitLabelHi: 'लीटर',
    totalPurchasedOrHarvested: 2,
    totalUsedInFarm: 1,
    totalSold: 0,
    currentStock: 1,
    ratePerUnit: 2450,
    lastUpdated: '2026-10-25',
  },
  {
    id: 'stk-weedicide',
    category: 'spray',
    name: 'खरपतवार नाशक दवाई (Weedicide)',
    unit: 'packet',
    unitLabelHi: 'पैकेट',
    totalPurchasedOrHarvested: 8,
    totalUsedInFarm: 3,
    totalSold: 0,
    currentStock: 5,
    ratePerUnit: 550,
    lastUpdated: '2026-11-01',
  },
  {
    id: 'stk-paddy-grain',
    category: 'grain',
    name: 'बासमती धान 1509 (Paddy Grain)',
    unit: 'quintal',
    unitLabelHi: 'क्विंटल',
    totalPurchasedOrHarvested: 110,
    totalUsedInFarm: 0,
    totalSold: 92,
    currentStock: 18,
    ratePerUnit: 3650,
    lastUpdated: '2026-10-20',
  },
  {
    id: 'stk-wheat-grain',
    category: 'grain',
    name: 'गेहूं अनाज घर/बीज स्टॉक (Wheat Grain)',
    unit: 'quintal',
    unitLabelHi: 'क्विंटल',
    totalPurchasedOrHarvested: 25,
    totalUsedInFarm: 3,
    totalSold: 10,
    currentStock: 12,
    ratePerUnit: 2450,
    lastUpdated: '2026-10-15',
  },
];

export const DEFAULT_STOCK_MOVEMENTS: StockMovementLog[] = [
  {
    id: 'mov-init-1',
    stockItemId: 'stk-dap',
    itemName: 'डीएपी खाद (DAP 50kg)',
    category: 'khad',
    movementType: 'purchase_in',
    quantity: 12,
    unitLabelHi: 'बैग/कट्टा',
    ratePerUnit: 1350,
    totalValue: 16200,
    partyName: 'किसान कृषि केंद्र (शर्मा जी)',
    reasonOrNote: 'रबी सीजन के लिए गोदाम स्टॉक खरीद',
    date: '2026-10-17',
  },
  {
    id: 'mov-init-2',
    stockItemId: 'stk-dap',
    itemName: 'डीएपी खाद (DAP 50kg)',
    category: 'khad',
    movementType: 'use_in_acre',
    quantity: 2,
    unitLabelHi: 'बैग/कट्टा',
    ratePerUnit: 1350,
    totalValue: 2700,
    plotName: 'खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)',
    acreNumber: '5',
    reasonOrNote: 'सुपर सीडर बुवाई के साथ बेसल खुराक',
    date: '2026-11-05',
  },
  {
    id: 'mov-init-3',
    stockItemId: 'stk-paddy-grain',
    itemName: 'बासमती धान 1509 (Paddy Grain)',
    category: 'grain',
    movementType: 'sell_out',
    quantity: 92,
    unitLabelHi: 'क्विंटल',
    ratePerUnit: 3650,
    totalValue: 335800,
    partyName: 'M/s Aggarwal & Brothers Aadti',
    reasonOrNote: 'करनाल मंडी बिक्री (J-Form #882)',
    date: '2026-10-20',
  },
];

export function mapMaterialTypeToStockCategory(type: MaterialType): StockCategory {
  if (type === 'seed') return 'beej';
  if (type === 'pesticide') return 'spray';
  return 'khad';
}

export function findMatchingStockItem(
  stockItems: StockItem[],
  itemName: string,
  category?: StockCategory
): StockItem | undefined {
  const clean = itemName.trim().toLowerCase();
  // Exact or substring match
  return stockItems.find((item) => {
    const n = item.name.toLowerCase();
    if (n === clean || n.includes(clean) || clean.includes(n)) return true;
    if ((clean.includes('urea') || clean.includes('यूरिया')) && (n.includes('urea') || n.includes('यूरिया'))) {
      return true;
    }
    if ((clean.includes('dap') || clean.includes('डीएपी')) && (n.includes('dap') || n.includes('डीएपी'))) {
      return true;
    }
    if ((clean.includes('zinc') || clean.includes('जिंक')) && (n.includes('zinc') || n.includes('जिंक'))) {
      return true;
    }
    if ((clean.includes('potash') || clean.includes('पोटाश') || clean.includes('mop')) && (n.includes('potash') || n.includes('पोटाश') || n.includes('mop'))) {
      return true;
    }
    if ((clean.includes('coragen') || clean.includes('कोराजन')) && (n.includes('coragen') || n.includes('कोराजन'))) {
      return true;
    }
    if (category && item.category === category && clean.split(' ')[0] === n.split(' ')[0]) {
      return true;
    }
    return false;
  });
}

/**
 * 1) STOCK IN (Purchase of Khad/Beej/Spray OR Harvest of Grain)
 * Automatically increases `currentStock` and `totalPurchasedOrHarvested`.
 */
export function applyStockInTransaction(params: {
  stockItems: StockItem[];
  stockMovements: StockMovementLog[];
  category: StockCategory;
  itemName: string;
  quantity: number;
  unit: StockItem['unit'];
  ratePerUnit: number;
  movementType: 'purchase_in' | 'harvest_in';
  partyName?: string;
  reasonOrNote?: string;
  date: string;
  workTimeSlot?: string;
}): {
  nextStockItems: StockItem[];
  nextStockMovements: StockMovementLog[];
  updatedItem: StockItem;
  movementLog: StockMovementLog;
} {
  const {
    stockItems,
    stockMovements,
    category,
    itemName,
    quantity,
    unit,
    ratePerUnit,
    movementType,
    partyName,
    reasonOrNote,
    date,
    workTimeSlot,
  } = params;

  const validQty = Math.max(0.01, Number(quantity) || 0);
  const validRate = Math.max(0, Number(ratePerUnit) || 0);
  const unitLabelHi = UNIT_LABELS_HI[unit] || unit;

  const existing = findMatchingStockItem(stockItems, itemName, category);
  let updatedItem: StockItem;
  let nextStockItems: StockItem[];

  if (existing) {
    updatedItem = {
      ...existing,
      totalPurchasedOrHarvested: Number(
        (existing.totalPurchasedOrHarvested + validQty).toFixed(2)
      ),
      currentStock: Number((existing.currentStock + validQty).toFixed(2)),
      ratePerUnit: validRate > 0 ? validRate : existing.ratePerUnit,
      lastUpdated: date,
    };
    nextStockItems = stockItems.map((it) => (it.id === existing.id ? updatedItem : it));
  } else {
    updatedItem = {
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      name: itemName.trim(),
      unit,
      unitLabelHi,
      totalPurchasedOrHarvested: validQty,
      totalUsedInFarm: 0,
      totalSold: 0,
      currentStock: validQty,
      ratePerUnit: validRate,
      lastUpdated: date,
    };
    nextStockItems = [updatedItem, ...stockItems];
  }

  const movementLog: StockMovementLog = {
    id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    stockItemId: updatedItem.id,
    itemName: updatedItem.name,
    category,
    movementType,
    quantity: validQty,
    unitLabelHi: updatedItem.unitLabelHi,
    ratePerUnit: updatedItem.ratePerUnit,
    totalValue: Math.round(validQty * updatedItem.ratePerUnit),
    partyName,
    reasonOrNote,
    date,
    workTimeSlot,
  };

  return {
    nextStockItems,
    nextStockMovements: [movementLog, ...stockMovements],
    updatedItem,
    movementLog,
  };
}

/**
 * 2) STOCK OUT (Use in Acre OR Sell in Mandi)
 * Automatically decreases `currentStock` and updates `totalUsedInFarm` or `totalSold`.
 * When `movementType === 'use_in_acre'`, also appends an AcreExpenseEntry to that specific Acre
 * with `isFromStockUsage: true` so it NEVER double-counts in the Farm Purchase Ledger!
 */
export function applyStockOutTransaction(params: {
  stockItems: StockItem[];
  stockMovements: StockMovementLog[];
  plots: FarmPlot[];
  stockItemId?: string;
  itemName: string;
  category: StockCategory;
  quantity: number;
  unit?: StockItem['unit'];
  ratePerUnit?: number;
  movementType: 'use_in_acre' | 'sell_out';
  plotName?: string;
  acreNumber?: string;
  partyName?: string;
  reasonOrNote?: string;
  date: string;
  workTimeSlot?: string;
}): {
  nextStockItems: StockItem[];
  nextStockMovements: StockMovementLog[];
  nextPlots: FarmPlot[];
  updatedItem: StockItem;
  movementLog: StockMovementLog;
} {
  const {
    stockItems,
    stockMovements,
    plots,
    stockItemId,
    itemName,
    category,
    quantity,
    unit = 'bag',
    ratePerUnit = 0,
    movementType,
    plotName,
    acreNumber,
    partyName,
    reasonOrNote,
    date,
    workTimeSlot,
  } = params;

  const validQty = Math.max(0.01, Number(quantity) || 0);
  const existing =
    (stockItemId ? stockItems.find((s) => s.id === stockItemId) : undefined) ||
    findMatchingStockItem(stockItems, itemName, category);

  let updatedItem: StockItem;
  let nextStockItems: StockItem[];

  if (existing) {
    const effectiveRate = ratePerUnit && ratePerUnit > 0 ? ratePerUnit : existing.ratePerUnit;
    updatedItem = {
      ...existing,
      totalUsedInFarm:
        movementType === 'use_in_acre'
          ? Number((existing.totalUsedInFarm + validQty).toFixed(2))
          : existing.totalUsedInFarm,
      totalSold:
        movementType === 'sell_out'
          ? Number((existing.totalSold + validQty).toFixed(2))
          : existing.totalSold,
      currentStock: Number(Math.max(0, existing.currentStock - validQty).toFixed(2)),
      ratePerUnit: effectiveRate,
      lastUpdated: date,
    };
    nextStockItems = stockItems.map((it) => (it.id === existing.id ? updatedItem : it));
  } else {
    const unitLabelHi = UNIT_LABELS_HI[unit] || unit;
    updatedItem = {
      id: `stk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category,
      name: itemName.trim(),
      unit,
      unitLabelHi,
      totalPurchasedOrHarvested: validQty,
      totalUsedInFarm: movementType === 'use_in_acre' ? validQty : 0,
      totalSold: movementType === 'sell_out' ? validQty : 0,
      currentStock: 0,
      ratePerUnit: Math.max(0, Number(ratePerUnit) || 0),
      lastUpdated: date,
    };
    nextStockItems = [updatedItem, ...stockItems];
  }

  const totalValue = Math.round(validQty * updatedItem.ratePerUnit);
  const movementId = `mov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const movementLog: StockMovementLog = {
    id: movementId,
    stockItemId: updatedItem.id,
    itemName: updatedItem.name,
    category,
    movementType,
    quantity: validQty,
    unitLabelHi: updatedItem.unitLabelHi,
    ratePerUnit: updatedItem.ratePerUnit,
    totalValue,
    plotName,
    acreNumber,
    partyName,
    reasonOrNote,
    date,
    workTimeSlot,
  };

  let nextPlots = plots;
  if (movementType === 'use_in_acre' && plotName && acreNumber && acreNumber !== '0') {
    nextPlots = plots.map((p) => {
      if (p.name !== plotName) return p;
      const nextSubPlots = (p.subPlots || []).map((sp) => {
        if (String(sp.acreNumber) !== String(acreNumber)) return sp;
        const newEntry: AcreExpenseEntry = {
          id: `acre-stk-${movementId}`,
          machineryOrJob: `📦 स्टॉक से: ${updatedItem.name} (${validQty} ${updatedItem.unitLabelHi})`,
          workerName: partyName || 'गोदाम स्टॉक उपयोग',
          rate: updatedItem.ratePerUnit,
          totalAmount: totalValue,
          date,
          workTimeSlot,
          category: 'chemical_seed',
          reasonNote: reasonOrNote || 'गोदाम स्टॉक से खेत में डाला',
          isFromStockUsage: true,
          stockMovementId: movementId,
        };
        const nextEntries = [newEntry, ...(sp.expenseEntries || [])];
        const mach = nextEntries
          .filter((e) => e.category === 'machinery')
          .reduce((a, b) => a + b.totalAmount, 0);
        const lab = nextEntries
          .filter((e) => e.category === 'labour')
          .reduce((a, b) => a + b.totalAmount, 0);
        const mat = nextEntries
          .filter((e) => e.category === 'chemical_seed')
          .reduce((a, b) => a + b.totalAmount, 0);
        return {
          ...sp,
          expenseEntries: nextEntries,
          machineryExpense: mach,
          labourExpense: lab,
          materialExpense: mat,
          allocatedExpense: mach + lab + mat,
        };
      });
      return { ...p, subPlots: nextSubPlots };
    });
  }

  return {
    nextStockItems,
    nextStockMovements: [movementLog, ...stockMovements],
    nextPlots,
    updatedItem,
    movementLog,
  };
}

/**
 * 3) PER-ACRE DIAGNOSTIC & "WHY EXPENSE WAS HIGHER" ANALYZER
 * Keeps Per-Acre tracking purely for diagnostic insight (which acre cost how much and why)
 * without ever double-counting against the main Farm Purchase Ledger.
 */
export interface AcreDiagnosticItem {
  acreId: string;
  acreNumber: string | number;
  acreName: string;
  totalExpense: number;
  machineryCost: number;
  labourCost: number;
  materialCost: number;
  diffFromAverage: number;
  isHigherThanAvg: boolean;
  reasons: string[];
  entriesCount: number;
}

export function computePerAcreDiagnosticSummary(plot?: FarmPlot | null): {
  items: AcreDiagnosticItem[];
  averagePerActiveAcre: number;
  highestAcre: AcreDiagnosticItem | null;
} {
  if (!plot || !plot.subPlots || plot.subPlots.length === 0) {
    return { items: [], averagePerActiveAcre: 0, highestAcre: null };
  }

  const rawItems = plot.subPlots.map((sp) => {
    const entries = sp.expenseEntries || [];
    const machineryCost = entries
      .filter((e) => e.category === 'machinery')
      .reduce((s, e) => s + e.totalAmount, 0);
    const labourCost = entries
      .filter((e) => e.category === 'labour')
      .reduce((s, e) => s + e.totalAmount, 0);
    const materialCost = entries
      .filter((e) => e.category === 'chemical_seed')
      .reduce((s, e) => s + e.totalAmount, 0);
    const totalExpense = machineryCost + labourCost + materialCost;

    const reasons: string[] = [];
    entries.forEach((e) => {
      if (e.reasonNote && !reasons.includes(e.reasonNote)) {
        reasons.push(`${e.machineryOrJob}: ${e.reasonNote} (₹${e.totalAmount})`);
      } else if (e.totalAmount > 0) {
        reasons.push(`${e.machineryOrJob} — ₹${e.totalAmount}`);
      }
    });

    return {
      acreId: sp.id,
      acreNumber: sp.acreNumber,
      acreName: sp.name,
      totalExpense,
      machineryCost,
      labourCost,
      materialCost,
      entriesCount: entries.length,
      reasons,
    };
  });

  const activeItems = rawItems.filter((it) => it.totalExpense > 0);
  const averagePerActiveAcre =
    activeItems.length > 0
      ? Math.round(
          activeItems.reduce((s, it) => s + it.totalExpense, 0) / activeItems.length
        )
      : 0;

  let highestAcre: AcreDiagnosticItem | null = null;

  const items: AcreDiagnosticItem[] = rawItems.map((it) => {
    const diffFromAverage =
      averagePerActiveAcre > 0 ? it.totalExpense - averagePerActiveAcre : 0;
    const isHigherThanAvg =
      averagePerActiveAcre > 0 && it.totalExpense > averagePerActiveAcre * 1.05;

    const fullItem: AcreDiagnosticItem = {
      ...it,
      diffFromAverage,
      isHigherThanAvg,
    };

    if (!highestAcre || fullItem.totalExpense > highestAcre.totalExpense) {
      if (fullItem.totalExpense > 0) {
        highestAcre = fullItem;
      }
    }

    return fullItem;
  });

  return {
    items,
    averagePerActiveAcre,
    highestAcre,
  };
}
