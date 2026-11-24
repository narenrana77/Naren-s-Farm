import React, { useState, useMemo } from 'react';
import {
  FarmDataStore,
  StockItem,
  StockCategory,
  MachineryActivity,
  LabourActivity,
  MachineryRecord,
  LabourRecord,
  AcreExpenseEntry,
  AcreStatusType,
} from '../types/farm';
import {
  DEFAULT_STOCK_ITEMS,
  applyStockOutTransaction,
  applyStockInTransaction,
} from '../utils/stockUtils';
import { generateAcreSubPlots } from '../utils/acreUtils';
import { SectionHelpPopup } from './SectionHelpPopup';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Play,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

interface SequentialFarmWorkPlanProps {
  store: FarmDataStore;
  onSaveStore: (newStore: FarmDataStore) => void;
  defaultCollapsed?: boolean;
}

export interface FarmSequenceStage {
  stepNumber: number;
  id: string;
  titleHi: string;
  timingHi: string;
  icon: string;
  categoryBadgeHi: string;
  whatHappensHi: string;
  recommendedWorkType: 'machinery' | 'labour' | 'harvest';
  machineryActivity?: MachineryActivity;
  labourActivity?: LabourActivity;
  targetAcreStatus: AcreStatusType;
  defaultRatePerAcre: number;
  stockNeededCategory?: StockCategory;
  defaultStockItemHint?: string;
  defaultStockQtyPerAcre?: number;
}

export const FARM_SEQUENTIAL_WORK_STAGES: FarmSequenceStage[] = [
  {
    stepNumber: 1,
    id: 'stage-1-rauni-level',
    titleHi: 'चरण 1: खेत की तैयारी, लेजर लेवलर व पलेवा (रौनी सिंचाई)',
    timingHi: 'बुवाई से 10–15 दिन पहले (Pre-Sowing)',
    icon: '💧',
    categoryBadgeHi: 'तैयारी व रौनी',
    whatHappensHi:
      'पिछली फसल के बाद हैरो/मलचर चलाकर मिट्टी समतल करना और पलेवा (रौनी पानी) लगाना ताकि बतर में नमी बनी रहे।',
    recommendedWorkType: 'machinery',
    machineryActivity: 'Rauni Irrigation',
    targetAcreStatus: 'Irrigated (Rauni)',
    defaultRatePerAcre: 600,
  },
  {
    stepNumber: 2,
    id: 'stage-2-battar-basal',
    titleHi: 'चरण 2: बतर जुताई व बेसल खाद (DAP / पोटाश छींटा)',
    timingHi: 'बतर आने पर (बुवाई से 1 दिन पहले)',
    icon: '🚜',
    categoryBadgeHi: 'बतर व बेसल खाद',
    whatHappensHi:
      'रौनी सूखने (बतर आने) पर रोटावेटर/कल्टीवेटर चलाना और गोदाम स्टॉक से प्रति एकड़ 1 बैग डीएपी (DAP) या पोटाश डालना।',
    recommendedWorkType: 'machinery',
    machineryActivity: 'Rotavator',
    targetAcreStatus: 'Cultivated',
    defaultRatePerAcre: 1200,
    stockNeededCategory: 'khad',
    defaultStockItemHint: 'डीएपी खाद (DAP 50kg)',
    defaultStockQtyPerAcre: 1,
  },
  {
    stepNumber: 3,
    id: 'stage-3-sowing-seed',
    titleHi: 'चरण 3: बीज उपचार व सुपर सीडर / ड्रिल बिजाई (Sowing)',
    timingHi: 'दिन 0 (बिजाई दिवस)',
    icon: '🌱',
    categoryBadgeHi: 'बिजाई + बीज स्टॉक',
    whatHappensHi:
      'सुपर सीडर, हैप्पी सीडर या सीड ड्रिल से गेहूं/सरसों की बिजाई। गोदाम से बीज (40kg बैग) और साथ में डीएपी ऑटोमैटिक घटेगा।',
    recommendedWorkType: 'machinery',
    machineryActivity: 'Super Seeder',
    targetAcreStatus: 'Seeded',
    defaultRatePerAcre: 2300,
    stockNeededCategory: 'beej',
    defaultStockItemHint: 'गेहूं बीज (DBW 327 / PBW 550)',
    defaultStockQtyPerAcre: 1,
  },
  {
    stepNumber: 4,
    id: 'stage-4-cri-urea-zinc',
    titleHi: 'चरण 4: पहली सिंचाई (कोर पानी) + यूरिया व जिंक छींटा (Broadcasting)',
    timingHi: 'बुवाई के 21–25 दिन बाद (CRI Stage)',
    icon: '🖐️',
    categoryBadgeHi: 'कोर सिंचाई + यूरिया छींटा',
    whatHappensHi:
      'जड़ बनने (CRI अवस्था) पर पहला हल्का पानी और यूरिया खाद (1 बैग) + जिंक सल्फेट का छींटा (Broadcasting)। गोदाम स्टॉक से खाद घटेगी।',
    recommendedWorkType: 'labour',
    labourActivity: 'Fertiliser Broadcasting (खाद/यूरिया छींटा)',
    targetAcreStatus: 'Seeded',
    defaultRatePerAcre: 150,
    stockNeededCategory: 'khad',
    defaultStockItemHint: 'यूरिया खाद (Urea 45kg)',
    defaultStockQtyPerAcre: 1,
  },
  {
    stepNumber: 5,
    id: 'stage-5-weedicide-spray',
    titleHi: 'चरण 5: खरपतवार नियंत्रण स्प्रे (Weedicide Spray)',
    timingHi: 'बुवाई के 30–35 दिन बाद (पहली सिंचाई की नमी पर)',
    icon: '🎒',
    categoryBadgeHi: 'खरपतवार स्प्रे + दवाई स्टॉक',
    whatHappensHi:
      'गुल्ली-डंडा व चौड़ी पत्ती के खरपतवार रोकने के लिए पिट्ठू/बैटरी पंप या बूम स्प्रेयर से स्प्रे। गोदाम से खरपतवार दवाई पैकेट घटेगा।',
    recommendedWorkType: 'labour',
    labourActivity: 'Manual Spray (पिट्ठू/बैटरी पंप स्प्रे)',
    targetAcreStatus: 'Seeded',
    defaultRatePerAcre: 250,
    stockNeededCategory: 'spray',
    defaultStockItemHint: 'खरपतवार नाशक दवाई (Weedicide)',
    defaultStockQtyPerAcre: 1,
  },
  {
    stepNumber: 6,
    id: 'stage-6-foliar-tillering',
    titleHi: 'चरण 6: फुटाव व बढ़वार — फोलियर स्प्रे (Foliar Spray) व दूसरी यूरिया',
    timingHi: 'बुवाई के 45–60 दिन बाद (कल्ले फूटने की अवस्था)',
    icon: '✨',
    categoryBadgeHi: 'फोलियर स्प्रे / ब्रॉडकास्टिंग',
    whatHappensHi:
      'अधिक कल्ले व हरापन लाने के लिए फोलियर स्प्रे (NPK 19:19:19 / जिंक / सल्फर) या दूसरी यूरिया छींटा। स्टॉक से दवाई/खाद घटेगी।',
    recommendedWorkType: 'labour',
    labourActivity: 'Foliar Spread',
    targetAcreStatus: 'Seeded',
    defaultRatePerAcre: 250,
    stockNeededCategory: 'khad',
    defaultStockItemHint: 'जिंक सल्फेट (Zinc)',
    defaultStockQtyPerAcre: 2,
  },
  {
    stepNumber: 7,
    id: 'stage-7-fungicide-booting',
    titleHi: 'चरण 7: गभोट व बालियां निकलना — फंगीसाइड व कीटनाशक स्प्रे',
    timingHi: 'बुवाई के 75–95 दिन बाद (Heading & Grain Filling)',
    icon: '🛡️',
    categoryBadgeHi: 'पीला रतुआ / सुंडी सुरक्षा स्प्रे',
    whatHappensHi:
      'बालियां निकलते समय फंगस (Yellow Rust) व तेला/सुंडी से बचाव हेतु कोराजन/टिल्ट स्प्रे व 0:52:34 फोलियर स्प्रे।',
    recommendedWorkType: 'labour',
    labourActivity: 'Spray',
    targetAcreStatus: 'Seeded',
    defaultRatePerAcre: 300,
    stockNeededCategory: 'spray',
    defaultStockItemHint: 'कोराजन कीटनाशक (Coragen Spray)',
    defaultStockQtyPerAcre: 0.25,
  },
  {
    stepNumber: 8,
    id: 'stage-8-harvest-mandi',
    titleHi: 'चरण 8: कंबाइन कटाई, तूड़ी रीपर व अनाज गोदाम साइलो में जमा',
    timingHi: 'बुवाई के 120–135 दिन बाद (Harvest & Storage)',
    icon: '🌾',
    categoryBadgeHi: 'कटाई + अनाज स्टॉक इन',
    whatHappensHi:
      'कंबाइन हार्वेस्टर से कटाई, स्ट्रॉ रीपर से तूड़ी बनाना और निकले अनाज (क्विंटल) को गोदाम साइलो या मंडी आढ़ती खाते में जोड़ना।',
    recommendedWorkType: 'harvest',
    machineryActivity: 'Combine Harvester',
    targetAcreStatus: 'Empty',
    defaultRatePerAcre: 2200,
    stockNeededCategory: 'grain',
    defaultStockItemHint: 'गेहूं अनाज घर/बीज स्टॉक (Wheat Grain)',
    defaultStockQtyPerAcre: 22,
  },
];

export const SequentialFarmWorkPlan: React.FC<SequentialFarmWorkPlanProps> = ({
  store,
  onSaveStore,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedPlotId, setSelectedPlotId] = useState<string>(
    store.plots[0]?.id || ''
  );
  const [selectedAcreNum, setSelectedAcreNum] = useState<string>('5');
  const [activeModalStage, setActiveModalStage] =
    useState<FarmSequenceStage | null>(null);

  // Quick execution modal states
  const [workerName, setWorkerName] = useState<string>('राजू / स्वयं ट्रैक्टर');
  const [workRate, setWorkRate] = useState<string>('1200');
  const [selectedStockItemId, setSelectedStockItemId] = useState<string>('');
  const [stockQtyUsed, setStockQtyUsed] = useState<string>('1');
  const [executionDate, setExecutionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const stockItems: StockItem[] = useMemo(() => {
    return store.stockItems && store.stockItems.length > 0
      ? store.stockItems
      : DEFAULT_STOCK_ITEMS;
  }, [store.stockItems]);

  const activePlot =
    store.plots.find((p) => p.id === selectedPlotId) || store.plots[0];

  const activeSubPlots = useMemo(() => {
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

  const selectedAcreObj =
    activeSubPlots.find(
      (sp) => String(sp.acreNumber) === String(selectedAcreNum)
    ) || activeSubPlots[0];

  // Smartly determine which sequential step is recommended next for the selected Acre!
  const recommendedNextStepNumber = useMemo(() => {
    if (!selectedAcreObj) return 1;
    const status = selectedAcreObj.acreStatus || 'Empty';
    const entries = selectedAcreObj.expenseEntries || [];
    const hasWeedicide = entries.some(
      (e) =>
        e.machineryOrJob.toLowerCase().includes('weed') ||
        e.machineryOrJob.includes('खरपतवार') ||
        e.machineryOrJob.includes('स्प्रे')
    );
    const hasUreaBroadcast = entries.some(
      (e) =>
        e.machineryOrJob.includes('छींटा') ||
        e.machineryOrJob.includes('यूरिया')
    );

    if (status === 'Empty') return 1;
    if (status === 'Irrigated (Rauni)') return 2;
    if (status === 'Cultivated') return 3;
    if (status === 'Seeded') {
      if (!hasUreaBroadcast) return 4;
      if (!hasWeedicide) return 5;
      return 6;
    }
    return 1;
  }, [selectedAcreObj]);

  const handleOpenStageExecution = (stage: FarmSequenceStage) => {
    setActiveModalStage(stage);
    setWorkRate(String(stage.defaultRatePerAcre));
    setWorkerName(
      stage.recommendedWorkType === 'labour'
        ? 'राजू टोली (छींटा/स्प्रे)'
        : 'नरेंदर जी / ड्राइवर'
    );

    if (stage.stockNeededCategory) {
      const match =
        stockItems.find(
          (s) =>
            stage.defaultStockItemHint &&
            s.name
              .toLowerCase()
              .includes(stage.defaultStockItemHint.split(' ')[0].toLowerCase())
        ) ||
        stockItems.find((s) => s.category === stage.stockNeededCategory) ||
        stockItems[0];
      setSelectedStockItemId(match ? match.id : '');
      setStockQtyUsed(String(stage.defaultStockQtyPerAcre || 1));
    } else {
      setSelectedStockItemId('');
      setStockQtyUsed('0');
    }
  };

  const handleConfirmExecuteStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalStage || !activePlot || !selectedAcreObj) return;

    const rateNum = Math.max(0, Number(workRate) || 0);
    const qtyNum = Math.max(0, Number(stockQtyUsed) || 0);
    const chosenStock = stockItems.find((s) => s.id === selectedStockItemId);

    let nextStockItems = [...stockItems];
    let nextStockMovements = [...(store.stockMovements || [])];
    let nextPlots = [...store.plots];
    let stockNoteSuffix = '';

    // 1. If stage uses stock (Sowing Seed, Basal DAP, Urea Broadcast, Weedicide/Foliar Spray), deduct from Godown Stock!
    if (
      activeModalStage.recommendedWorkType !== 'harvest' &&
      chosenStock &&
      qtyNum > 0
    ) {
      const stockOutResult = applyStockOutTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: nextPlots,
        stockItemId: chosenStock.id,
        itemName: chosenStock.name,
        category: chosenStock.category,
        quantity: qtyNum,
        unit: chosenStock.unit,
        ratePerUnit: chosenStock.ratePerUnit,
        movementType: 'use_in_acre',
        plotName: activePlot.name,
        acreNumber: String(selectedAcreObj.acreNumber),
        partyName: workerName,
        reasonOrNote: `${activeModalStage.titleHi} में प्रयोग`,
        date: executionDate,
      });
      nextStockItems = stockOutResult.nextStockItems;
      nextStockMovements = stockOutResult.nextStockMovements;
      nextPlots = stockOutResult.nextPlots;
      stockNoteSuffix = ` | 📦 स्टॉक से घटा: -${qtyNum} ${chosenStock.unitLabelHi} ${chosenStock.name}`;
    }

    // 2. If stage is Harvest (Stage 8), ADD harvested grain to Godown Silo!
    if (
      activeModalStage.recommendedWorkType === 'harvest' &&
      chosenStock &&
      qtyNum > 0
    ) {
      const stockInResult = applyStockInTransaction({
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        category: 'grain',
        itemName: chosenStock.name,
        quantity: qtyNum,
        unit: 'quintal',
        ratePerUnit: chosenStock.ratePerUnit,
        movementType: 'harvest_in',
        partyName: `एकड़ #${selectedAcreObj.acreNumber} कटाई उपज`,
        reasonOrNote: `चरण 8 कटाई उपज गोदाम साइलो में जमा`,
        date: executionDate,
      });
      nextStockItems = stockInResult.nextStockItems;
      nextStockMovements = stockInResult.nextStockMovements;
      stockNoteSuffix = ` | 🌾 गोदाम साइलो में जमा: +${qtyNum} क्विंटल ${chosenStock.name}`;
    }

    // 3. Log the Machinery or Labour/Spray/Broadcasting work expense + update Acre Status
    const newLedgerId = `seq-${Date.now()}`;
    let nextMachineryRecords = [...store.machineryRecords];
    let nextLabourRecords = [...store.labourRecords];

    const jobTitle =
      activeModalStage.recommendedWorkType === 'labour'
        ? activeModalStage.labourActivity || 'Spray'
        : activeModalStage.machineryActivity || 'Super Seeder';

    if (activeModalStage.recommendedWorkType === 'labour') {
      const labRec: LabourRecord = {
        id: newLedgerId,
        activity: (activeModalStage.labourActivity || 'Spray') as LabourActivity,
        mateName: workerName.trim() || 'मजदूर टोली',
        plotName: `${activePlot.name} — एकड़ #${selectedAcreObj.acreNumber}`,
        workersCount: 1,
        acresCovered: 1,
        ratePerWorkerOrAcre: rateNum,
        rateType: 'per_acre',
        totalAmount: rateNum,
        paidAmount: rateNum,
        isPaid: true,
        date: executionDate,
        notes: `${activeModalStage.titleHi}${stockNoteSuffix}`,
      };
      nextLabourRecords = [labRec, ...nextLabourRecords];
    } else {
      const machRec: MachineryRecord = {
        id: newLedgerId,
        activity: (activeModalStage.machineryActivity ||
          'Super Seeder') as MachineryActivity,
        driverName: workerName.trim() || 'ट्रैक्टर ड्राइवर',
        plotName: `${activePlot.name} — एकड़ #${selectedAcreObj.acreNumber}`,
        acres: 1,
        ratePerUnit: rateNum,
        unitType: 'acre',
        totalAmount: rateNum,
        paidAmount: rateNum,
        isPaid: true,
        date: executionDate,
        notes: `${activeModalStage.titleHi}${stockNoteSuffix}`,
      };
      nextMachineryRecords = [machRec, ...nextMachineryRecords];
    }

    // Update Acre status and append work expense entry
    nextPlots = nextPlots.map((p) => {
      if (p.id !== activePlot.id) return p;
      const baseSubs =
        p.subPlots && p.subPlots.length > 0 ? p.subPlots : activeSubPlots;
      const updatedSubs = baseSubs.map((sp) => {
        if (String(sp.acreNumber) !== String(selectedAcreObj.acreNumber)) {
          return sp;
        }
        const workEntry: AcreExpenseEntry = {
          id: `acre-seq-${Date.now()}`,
          machineryOrJob: `${jobTitle}${
            chosenStock && qtyNum > 0
              ? ` + ${chosenStock.name.split('(')[0]} (${qtyNum} ${chosenStock.unitLabelHi})`
              : ''
          }`,
          workerName: workerName.trim() || 'किसान',
          rate: rateNum,
          totalAmount: rateNum,
          date: executionDate,
          category:
            activeModalStage.recommendedWorkType === 'labour'
              ? 'labour'
              : 'machinery',
          ledgerRecordId: newLedgerId,
          reasonNote: activeModalStage.titleHi,
        };
        const nextEntries = [workEntry, ...(sp.expenseEntries || [])];
        const mach = nextEntries
          .filter((en) => en.category === 'machinery')
          .reduce((a, b) => a + b.totalAmount, 0);
        const lab = nextEntries
          .filter((en) => en.category === 'labour')
          .reduce((a, b) => a + b.totalAmount, 0);
        const mat = nextEntries
          .filter((en) => en.category === 'chemical_seed')
          .reduce((a, b) => a + b.totalAmount, 0);

        return {
          ...sp,
          acreStatus: activeModalStage.targetAcreStatus,
          cropName:
            activeModalStage.targetAcreStatus === 'Seeded'
              ? sp.cropName || 'गेहूं DBW 327 (करण शिवानी)'
              : sp.cropName,
          sowingDate:
            activeModalStage.stepNumber === 3
              ? executionDate
              : sp.sowingDate,
          expenseEntries: nextEntries,
          machineryExpense: mach,
          labourExpense: lab,
          materialExpense: mat,
          allocatedExpense: mach + lab + mat,
        };
      });
      return {
        ...p,
        subPlots: updatedSubs,
      };
    });

    onSaveStore({
      ...store,
      plots: nextPlots,
      machineryRecords: nextMachineryRecords,
      labourRecords: nextLabourRecords,
      stockItems: nextStockItems,
      stockMovements: nextStockMovements,
    });

    setToastMsg(
      `✅ एकड़ #${selectedAcreObj.acreNumber} में "${activeModalStage.titleHi}" दर्ज हो गया!${stockNoteSuffix}`
    );
    setTimeout(() => setToastMsg(null), 5000);
    setActiveModalStage(null);
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950/90 to-slate-900 border-2 border-emerald-500/50 p-4 sm:p-6 text-white shadow-xl space-y-4">
      {toastMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header with Help Popup + Collapse/Expand Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-400 text-slate-950 flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
            🧭
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                संपूर्ण कृषि कार्य-चक्र (Step-by-Step Farm Workflow)
              </span>
              <SectionHelpPopup
                titleHi="संपूर्ण कृषि कार्य-चक्र (8-Stage Sequential Farm Plan)"
                subtitleHi="रौनी से लेकर कटाई व मंडी बिक्री तक क्रमवार गाइड"
                bulletsHi={[
                  'खेती में काम हमेशा एक निश्चित क्रम (Sequence) में होते हैं: 1. रौनी पलेवा ➔ 2. बतर जुताई व बेसल DAP ➔ 3. बीज बिजाई ➔ 4. कोर सिंचाई व यूरिया/जिंक छींटा ➔ 5. खरपतवार स्प्रे ➔ 6. फोलियर स्प्रे ➔ 7. फंगीसाइड/कीटनाशक ➔ 8. कटाई व मंडी।',
                  'नीचे जिस भी एकड़ (#1 से #9) को चुनेंगे, ऐप खुद बताएगा कि उस एकड़ में अगला काम कौन-सा होना चाहिए।',
                  'किसी भी चरण पर "⚡ यह काम दर्ज करें" दबाते ही वह काम, उसका खर्च और उसमें लगी खाद/बीज/स्प्रे दवाई गोदाम स्टॉक से अपने-आप घट (Minus) जाएगी!',
                ]}
              />
            </div>
            <h3 className="text-base sm:text-xl font-black text-white mt-1">
              🌾 खेती का सीक्वेंस वर्क-प्लान (रौनी ➔ बिजाई ➔ छींटा/स्प्रे ➔ कटाई)
            </h3>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-black text-amber-300 flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          {isCollapsed ? (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>🔽 वर्क-प्लान खोलें (Expand)</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>🔼 छोटा करें (Collapse)</span>
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 pt-2 border-t border-white/15">
          {/* Acre Selector Bar to check which stage each acre is in */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>किस एकड़ का अगला सीक्वेंस काम देखना व दर्ज करना है?</span>
              </span>
              {selectedAcreObj && (
                <p className="text-xs text-slate-300">
                  एकड़ <b className="text-amber-300">#{selectedAcreObj.acreNumber}</b> की वर्तमान स्थिति:{' '}
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    {selectedAcreObj.acreStatus || 'Empty (खाली)'}
                  </span>{' '}
                  • अनुशंसित अगला कदम:{' '}
                  <b className="text-amber-300">
                    चरण #{recommendedNextStepNumber}
                  </b>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {activeSubPlots.map((sp) => {
                const isSel =
                  String(selectedAcreNum) === String(sp.acreNumber);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSelectedAcreNum(String(sp.acreNumber))}
                    className={`px-3 py-1.5 rounded-xl font-mono font-black text-xs cursor-pointer border transition-all shrink-0 ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 border-white scale-105 shadow-md'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:border-amber-400/50'
                    }`}
                  >
                    एकड़ #{sp.acreNumber}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 8 Symmetrical 2-Column Stage Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {FARM_SEQUENTIAL_WORK_STAGES.map((stage) => {
              const isNextRecommended =
                stage.stepNumber === recommendedNextStepNumber;
              const isCompleted =
                stage.stepNumber < recommendedNextStepNumber;

              return (
                <div
                  key={stage.id}
                  className={`rounded-2xl p-4 border-2 flex flex-col justify-between gap-3 transition-all ${
                    isNextRecommended
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg ring-1 ring-amber-400/40'
                      : isCompleted
                      ? 'bg-emerald-950/50 border-emerald-500/40'
                      : 'bg-slate-900/80 border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-slate-950 border border-white/15 flex items-center justify-center text-lg shrink-0">
                          {stage.icon}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black text-amber-300">
                              {stage.categoryBadgeHi}
                            </span>
                            {isNextRecommended && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                अगला जरूरी काम (Next Step)
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                                ✅ पूर्ण
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs sm:text-sm font-black text-white mt-1 leading-snug">
                            {stage.titleHi}
                          </h4>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {stage.whatHappensHi}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-mono text-emerald-300 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{stage.timingHi}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenStageExecution(stage)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                        isNextRecommended
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md'
                          : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>
                        ⚡ एकड़ #{selectedAcreNum} में यह काम दर्ज करें
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1-Click Stage Execution + Stock Deduction Popup Modal */}
      {activeModalStage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          onClick={() => setActiveModalStage(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleConfirmExecuteStage}
            className="w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-400 p-5 sm:p-6 text-white shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">
                  सीक्वेंस वर्कफ़्लो एंट्री + ऑटो स्टॉक अपडेट
                </span>
                <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
                  {activeModalStage.icon} {activeModalStage.titleHi}
                </h4>
                <p className="text-xs text-emerald-300 font-bold mt-0.5">
                  🌾 खेत: {activePlot?.name} — एकड़ #{selectedAcreNum}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalStage(null)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  👷 किसने काम किया (ड्राइवर / मजदूर):
                </label>
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  💰 काम/मशीनरी/छींटा रेट (₹ प्रति एकड़):
                </label>
                <input
                  type="number"
                  value={workRate}
                  onChange={(e) => setWorkRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-400 text-sm font-mono font-black text-amber-300"
                />
              </div>
            </div>

            {/* Stock Item & Quantity Selector if this stage uses Seed/Fertiliser/Spray or Harvests Grain */}
            {activeModalStage.stockNeededCategory && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-3">
                <div className="text-xs font-black text-emerald-300">
                  {activeModalStage.recommendedWorkType === 'harvest'
                    ? '🌾 कटाई में कितना अनाज निकला? (गोदाम साइलो में जुड़ेगा +)'
                    : '🧪 इस काम में कौन-सी खाद / बीज / स्प्रे दवाई लगी? (गोदाम स्टॉक से घटेगा -)'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      गोदाम स्टॉक आइटम चुनें:
                    </label>
                    <select
                      value={selectedStockItemId}
                      onChange={(e) => setSelectedStockItemId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                    >
                      <option value="">-- कोई स्टॉक आइटम नहीं (Skip) --</option>
                      {stockItems.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} (बचा: {st.currentStock} {st.unitLabelHi})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      मात्रा (Quantity):
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={stockQtyUsed}
                      onChange={(e) => setStockQtyUsed(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-400 text-sm font-mono font-black text-emerald-300"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                📅 तारीख (Date):
              </label>
              <input
                type="date"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-bold text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModalStage(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
              >
                ✅ काम, खर्च व स्टॉक एक साथ सेव करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
