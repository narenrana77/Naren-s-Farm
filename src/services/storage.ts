import { FarmDataStore, MachineryRecord, LabourRecord, MaterialRecord, AadtiRecord, FarmPlot, VendorRateMemory, FarmTask } from '../types/farm';
import {
  generateAcreSubPlots,
  applyNarenBattarPresetToSubPlots,
  WHEAT_DBW_327_LABEL,
} from '../utils/acreUtils';
import {
  DEFAULT_STOCK_ITEMS,
  DEFAULT_STOCK_MOVEMENTS,
} from '../utils/stockUtils';

const STORAGE_KEY = 'naren_farm_tracker_store_v1';

const defaultPlots: FarmPlot[] = [
  {
    id: 'plot-1',
    name: 'खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)',
    crop: WHEAT_DBW_327_LABEL,
    acres: 8.5,
    stage: 'sowing',
    progressPct: 35,
    soilHealth: 92,
    moisturePct: 86,
    sowingDate: '2026-11-05',
    expectedHarvestDate: '2027-04-12',
    currentActivity: 'एकड़ #5 व #6 में गेहूं DBW 327 बुवाई पूर्ण — बाकी एकड़ों में बतर का इंतजार',
    notes: 'एकड़ #5 और #6 में गेहूं DBW 327 की बिजाई हो चुकी है; बाकी सभी एकड़ गीला होने की वजह से खाली हैं (बतर आते ही बिजाई करेंगे)।',
    coordinates: { lat: 29.6872, lng: 76.9890 },
    subPlots: generateAcreSubPlots('plot-1', 'खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)', 8.5, 29.6872, 76.9890, WHEAT_DBW_327_LABEL),
  },
  {
    id: 'plot-2',
    name: 'Khet No. 2 (Tube-well Wala)',
    crop: 'Mustard (सरसों - Pusa Bold)',
    acres: 3.5,
    stage: 'flowering',
    progressPct: 80,
    soilHealth: 88,
    moisturePct: 62,
    sowingDate: '2026-09-28',
    expectedHarvestDate: '2026-03-15',
    currentActivity: 'Aphid Pest Inspection',
    notes: 'Good vegetative canopy, minimal pest detected.',
    coordinates: { lat: 29.6845, lng: 76.9920 },
  },
  {
    id: 'plot-3',
    name: 'Khet No. 3 (Sadak Paar Khet)',
    crop: 'Sugarcane (गन्ना - Co-0238)',
    acres: 4.0,
    stage: 'growing',
    progressPct: 45,
    soilHealth: 95,
    moisturePct: 84,
    sowingDate: '2026-08-10',
    expectedHarvestDate: '2026-11-20',
    currentActivity: 'Urea Top Dressing',
    notes: 'Intercropping vegetables planned between rows.',
    coordinates: { lat: 29.6820, lng: 76.9870 },
  },
  {
    id: 'plot-4',
    name: 'Khet No. 4 (Purana Bagh Plot)',
    crop: 'Fallow / Pre-sowing (जुताई चालू)',
    acres: 2.5,
    stage: 'tilling',
    progressPct: 20,
    soilHealth: 85,
    moisturePct: 50,
    sowingDate: '2026-11-12',
    expectedHarvestDate: '2026-04-25',
    currentActivity: 'Rotavator & Laser Leveling',
    notes: 'Preparing soil for organic pulses / seasonal greens.',
    coordinates: { lat: 29.6890, lng: 76.9940 },
  },
];

const defaultVendorRates: VendorRateMemory[] = [
  {
    id: 'vm-1',
    vendorName: 'Ramesh Tractor Works',
    category: 'machinery',
    serviceOrItem: 'Rotavator',
    defaultRate: 850,
    unit: 'acre',
    phone: '9876543210',
    lastUpdated: '2026-10-15',
  },
  {
    id: 'vm-2',
    vendorName: 'Ramesh Tractor Works',
    category: 'machinery',
    serviceOrItem: 'Jutayi',
    defaultRate: 600,
    unit: 'acre',
    phone: '9876543210',
    lastUpdated: '2026-10-15',
  },
  {
    id: 'vm-3',
    vendorName: 'Gurdeep Laser Leveler',
    category: 'machinery',
    serviceOrItem: 'Leveling',
    defaultRate: 1100,
    unit: 'hour',
    phone: '9812345678',
    lastUpdated: '2026-10-12',
  },
  {
    id: 'vm-4',
    vendorName: 'Jagjit Super Seeder',
    category: 'machinery',
    serviceOrItem: 'Super Seeder',
    defaultRate: 1400,
    unit: 'acre',
    phone: '9845671234',
    lastUpdated: '2026-10-20',
  },
  {
    id: 'vm-4b',
    vendorName: 'Jagjit Super Seeder',
    category: 'machinery',
    serviceOrItem: 'Happy Seeder',
    defaultRate: 1300,
    unit: 'acre',
    phone: '9845671234',
    lastUpdated: '2026-10-20',
  },
  {
    id: 'vm-4c',
    vendorName: 'Ramesh Tractor Works',
    category: 'machinery',
    serviceOrItem: 'Cultivator',
    defaultRate: 600,
    unit: 'acre',
    phone: '9876543210',
    lastUpdated: '2026-10-20',
  },
  {
    id: 'vm-4d',
    vendorName: 'Balwinder Tractor Works',
    category: 'machinery',
    serviceOrItem: 'Seed Drill',
    defaultRate: 800,
    unit: 'acre',
    phone: '9812098765',
    lastUpdated: '2026-10-22',
  },
  {
    id: 'vm-4e',
    vendorName: 'Suresh Labour Mate',
    category: 'machinery',
    serviceOrItem: 'Foliar Spread',
    defaultRate: 300,
    unit: 'acre',
    phone: '9728012345',
    lastUpdated: '2026-10-25',
  },
  {
    id: 'vm-5',
    vendorName: 'Suresh Labour Mate',
    category: 'labour',
    serviceOrItem: 'Spray',
    defaultRate: 200,
    unit: 'acre',
    phone: '9728012345',
    lastUpdated: '2026-10-25',
  },
  {
    id: 'vm-6',
    vendorName: 'Kisan Krishi Kendra (Sharma Ji)',
    category: 'chemical_seed',
    serviceOrItem: 'Urea (IFFCO 45kg)',
    defaultRate: 266.5,
    unit: 'bag',
    phone: '9416098765',
    lastUpdated: '2026-10-10',
  },
  {
    id: 'vm-7',
    vendorName: 'Kisan Krishi Kendra (Sharma Ji)',
    category: 'chemical_seed',
    serviceOrItem: 'DAP (50kg)',
    defaultRate: 1350,
    unit: 'bag',
    phone: '9416098765',
    lastUpdated: '2026-10-10',
  },
  {
    id: 'vm-8',
    vendorName: 'M/s Aggarwal & Brothers Aadti',
    category: 'aadti',
    serviceOrItem: 'Karnal Grain Market',
    defaultRate: 0,
    unit: 'account',
    phone: '9896011223',
    lastUpdated: '2026-10-01',
  },
];

const defaultMachinery: MachineryRecord[] = [
  {
    id: 'm-1',
    activity: 'Jutayi',
    driverName: 'Ramesh Tractor Works',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    acres: 6.5,
    ratePerUnit: 600,
    unitType: 'acre',
    totalAmount: 3900,
    paidAmount: 3900,
    isPaid: true,
    date: '2026-10-12',
    notes: '2 cross deep tillings with cultivator before sowing.',
  },
  {
    id: 'm-2',
    activity: 'Leveling',
    driverName: 'Gurdeep Laser Leveler',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    acres: 6.5,
    hours: 5,
    ratePerUnit: 1100,
    unitType: 'hour',
    totalAmount: 5500,
    paidAmount: 5500,
    isPaid: true,
    date: '2026-10-14',
    notes: 'Laser leveling to save 30% irrigation water.',
  },
  {
    id: 'm-3',
    activity: 'Rotavator',
    driverName: 'Ramesh Tractor Works',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    acres: 6.5,
    ratePerUnit: 850,
    unitType: 'acre',
    totalAmount: 5525,
    paidAmount: 5000,
    isPaid: false,
    date: '2026-10-16',
    notes: 'Soil fine pulverization done. ₹525 balance remaining.',
  },
  {
    id: 'm-4',
    activity: 'Super Seeder',
    driverName: 'Jagjit Super Seeder',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    acres: 6.5,
    ratePerUnit: 1400,
    unitType: 'acre',
    totalAmount: 9100,
    paidAmount: 9100,
    isPaid: true,
    date: '2026-10-18',
    notes: 'Wheat sowing directly into paddy straw mulch.',
  },
  {
    id: 'm-5',
    activity: 'Ploughing',
    driverName: 'Ramesh Tractor Works',
    plotName: 'Khet No. 4 (Purana Bagh Plot)',
    acres: 2.5,
    ratePerUnit: 700,
    unitType: 'acre',
    totalAmount: 1750,
    paidAmount: 0,
    isPaid: false,
    date: '2026-11-04',
    notes: 'Deep disc ploughing for soil aeration.',
  },
];

const defaultLabour: LabourRecord[] = [
  {
    id: 'l-1',
    activity: 'Transplantation',
    mateName: 'Suresh Labour Mate',
    plotName: 'Khet No. 3 (Sadak Paar Khet)',
    workersCount: 8,
    acresCovered: 4.0,
    ratePerWorkerOrAcre: 800,
    rateType: 'per_acre',
    totalAmount: 3200,
    paidAmount: 3200,
    isPaid: true,
    date: '2026-08-11',
    notes: 'Sugarcane setts planting with furrow trenching.',
  },
  {
    id: 'l-2',
    activity: 'Weed Management',
    mateName: 'Kamlesh Labour Group',
    plotName: 'Khet No. 2 (Tube-well Wala)',
    workersCount: 4,
    acresCovered: 3.5,
    ratePerWorkerOrAcre: 450,
    rateType: 'per_worker',
    totalAmount: 1800,
    paidAmount: 1800,
    isPaid: true,
    date: '2026-10-24',
    notes: 'Manual weeding around mustard rows.',
  },
  {
    id: 'l-3',
    activity: 'Spray',
    mateName: 'Suresh Labour Mate',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    workersCount: 2,
    acresCovered: 6.5,
    ratePerWorkerOrAcre: 180,
    rateType: 'per_acre',
    totalAmount: 1170,
    paidAmount: 1170,
    isPaid: true,
    date: '2026-11-01',
    notes: 'Weedicide spray (Sulfosulfuron) applied with battery sprayer.',
  },
  {
    id: 'l-4',
    activity: 'Foliar Spread',
    mateName: 'Raju Mate',
    plotName: 'Khet No. 2 (Tube-well Wala)',
    workersCount: 2,
    acresCovered: 3.5,
    ratePerWorkerOrAcre: 150,
    rateType: 'per_acre',
    totalAmount: 525,
    paidAmount: 525,
    isPaid: true,
    date: '2026-11-05',
    notes: 'Sulphur + Micronutrient foliar nutrition spray.',
  },
];

const defaultMaterials: MaterialRecord[] = [
  {
    id: 'mat-1',
    type: 'seed',
    itemName: 'Wheat Seed PBW-550',
    variety: 'PBW 550 Certified',
    quantity: 260,
    unit: 'kg',
    vendor: 'Kisan Krishi Kendra (Sharma Ji)',
    ratePerUnit: 42,
    totalAmount: 10920,
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    date: '2026-10-15',
    notes: 'Treated with Carboxin + Thiram before sowing.',
  },
  {
    id: 'mat-2',
    type: 'seed',
    itemName: 'Mustard Seed Pusa Bold',
    variety: 'Pusa Bold High Yield',
    quantity: 7,
    unit: 'kg',
    vendor: 'Kisan Krishi Kendra (Sharma Ji)',
    ratePerUnit: 280,
    totalAmount: 1960,
    plotName: 'Khet No. 2 (Tube-well Wala)',
    date: '2026-09-25',
    notes: 'Certified seed packet with 90% germination.',
  },
  {
    id: 'mat-3',
    type: 'fertiliser',
    itemName: 'DAP (Di-Ammonium Phosphate)',
    quantity: 7,
    unit: 'bag',
    vendor: 'Kisan Krishi Kendra (Sharma Ji)',
    ratePerUnit: 1350,
    totalAmount: 9450,
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    date: '2026-10-17',
    notes: 'Basal dose applied during Super Seeder operation.',
  },
  {
    id: 'mat-4',
    type: 'fertiliser',
    itemName: 'Urea (Neem Coated)',
    quantity: 8,
    unit: 'bag',
    vendor: 'Kisan Krishi Kendra (Sharma Ji)',
    ratePerUnit: 266.5,
    totalAmount: 2132,
    plotName: 'Khet No. 1 & 3',
    date: '2026-11-02',
    notes: 'First top dressing after 1st kor sinchai.',
  },
  {
    id: 'mat-5',
    type: 'pesticide',
    itemName: 'Coragen (Chlorantraniliprole)',
    quantity: 1,
    unit: 'litre',
    vendor: 'Chaudhary Agro Chemicals',
    ratePerUnit: 2450,
    totalAmount: 2450,
    plotName: 'Khet No. 3 (Sadak Paar Khet)',
    date: '2026-08-25',
    notes: 'Root borer control for sugarcane.',
  },
];

const defaultAadti: AadtiRecord[] = [
  {
    id: 'a-1',
    date: '2026-09-15',
    aadtiName: 'M/s Aggarwal & Brothers Aadti',
    type: 'debit',
    description: 'Advance Cash taken for diesel and seasonal preparation',
    amount: 25000,
    runningBalance: -25000,
    voucherNo: 'VR-109',
  },
  {
    id: 'a-2',
    date: '2026-10-20',
    aadtiName: 'M/s Aggarwal & Brothers Aadti',
    type: 'credit',
    cropName: 'Paddy / Basmati 1509 (धान)',
    quantityQuintal: 92,
    ratePerQuintal: 3650,
    description: 'Sold 92 Quintals Basmati 1509 at Karnal Mandi (Gate Pass #4412)',
    amount: 335800,
    runningBalance: 310800,
    voucherNo: 'J-FORM-882',
  },
  {
    id: 'a-3',
    date: '2026-10-25',
    aadtiName: 'M/s Aggarwal & Brothers Aadti',
    type: 'debit',
    description: 'Payment transferred to Naren Bank Account (NEFT)',
    amount: 200000,
    runningBalance: 110800,
    voucherNo: 'NEFT-5591',
  },
  {
    id: 'a-4',
    date: '2026-11-02',
    aadtiName: 'M/s Aggarwal & Brothers Aadti',
    type: 'debit',
    description: 'Bags of DAP & Urea supplied via Aadti account credit',
    amount: 11582,
    runningBalance: 99218,
    voucherNo: 'BIL-4421',
  },
];

const defaultTasks: FarmTask[] = [
  {
    id: 'task-1',
    title: 'रमेश ट्रैक्टर वर्क्स - रोटावेटर की बकाया रकम ₹525 का भुगतान करें',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    category: 'ledger_payment',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: false,
    priority: 'high',
    pendingAmount: 525,
    vendorName: 'Ramesh Tractor Works',
  },
  {
    id: 'task-2',
    title: 'खेत नं. 1 - द्वितीय कोर सिंचाई (2nd Kor Sinchai) ट्यूबवेल पानी चलाएं',
    plotName: 'Khet No. 1 (Bada Khet - Canal Side)',
    category: 'irrigation',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: false,
    priority: 'high',
  },
  {
    id: 'task-3',
    title: 'सरसों खेत - माहू (Aphid) कीट निरीक्षण एवं सुरक्षा स्प्रे',
    plotName: 'Khet No. 2 (Tube-well Wala)',
    category: 'spray',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: false,
    priority: 'medium',
  },
  {
    id: 'task-4',
    title: 'खेत नं. 4 - डिस्क प्लाऊ जुताई के बाद लेजर लेवलिंग (Laser Leveling) बुकिंग',
    plotName: 'Khet No. 4 (Purana Bagh Plot)',
    category: 'machinery',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: false,
    priority: 'medium',
  },
  {
    id: 'task-5',
    title: 'मंडी आढ़ती पासबुक - बासमती 1509 अंतिम वाउचर J-FORM-882 मिलान',
    category: 'ledger_payment',
    dueDate: new Date().toISOString().split('T')[0],
    isCompleted: true,
    priority: 'low',
    completedAt: new Date().toISOString(),
  },
];

const defaultStore: FarmDataStore = {
  machineryRecords: defaultMachinery,
  labourRecords: defaultLabour,
  materialRecords: defaultMaterials,
  aadtiRecords: defaultAadti,
  stockItems: DEFAULT_STOCK_ITEMS,
  stockMovements: DEFAULT_STOCK_MOVEMENTS,
  plots: defaultPlots,
  vendorRates: defaultVendorRates,
  tasks: defaultTasks,
  farmSettings: {
    farmName: "Naren's Farm Tracker",
    ownerName: 'Naren Rana',
    location: 'Karnal, Haryana',
    currency: '₹',
    language: 'hi',
    darkMode: true,
    autoCloudBackup: true,
    pushNotificationsEnabled: true,
    dailyReminderTime: '07:00',
    lastCloudBackup: new Date().toISOString(),
  },
};

export const FarmStorage = {
  load(): FarmDataStore {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        this.save(defaultStore);
        return defaultStore;
      }
      const parsed = JSON.parse(stored);
      const isBattarMigrated =
        localStorage.getItem('naren_battar_dbw327_migrated_v1') === 'true';
      const isZeroAutoExpenseMigrated =
        localStorage.getItem('naren_zero_auto_expense_v2') === 'true';

      // Ensure plots have coordinates and per-acre demarcation sub-plots
      const loadedPlots = (parsed.plots || defaultPlots).map(
        (p: FarmPlot, idx: number) => {
          const updatedPlot = { ...p };
          if (!updatedPlot.coordinates && defaultPlots[idx]?.coordinates) {
            updatedPlot.coordinates = defaultPlots[idx].coordinates;
          }
          // Ensure 8.5-acre plot and subPlots are initialized
          if (
            updatedPlot.id === 'plot-1' &&
            (updatedPlot.acres === 6.5 ||
              !updatedPlot.subPlots ||
              updatedPlot.subPlots.length === 0)
          ) {
            updatedPlot.name = 'खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)';
            updatedPlot.acres = 8.5;
            updatedPlot.crop = WHEAT_DBW_327_LABEL;
            updatedPlot.subPlots = generateAcreSubPlots(
              'plot-1',
              updatedPlot.name,
              8.5,
              updatedPlot.coordinates?.lat || 29.6872,
              updatedPlot.coordinates?.lng || 76.989,
              WHEAT_DBW_327_LABEL,
              updatedPlot.boundaries
            );
          } else if (
            !updatedPlot.subPlots ||
            updatedPlot.subPlots.length === 0
          ) {
            updatedPlot.subPlots = generateAcreSubPlots(
              updatedPlot.id,
              updatedPlot.name,
              updatedPlot.acres,
              updatedPlot.coordinates?.lat || 29.6872,
              updatedPlot.coordinates?.lng || 76.989,
              updatedPlot.crop,
              updatedPlot.boundaries
            );
          }

          // One-time migration for existing localStorage so Acre #5 & #6 = Wheat DBW 327 and remaining acres = Wet/Empty (Waiting for Battar)
          if (
            !isBattarMigrated &&
            (updatedPlot.id === 'plot-1' ||
              updatedPlot.id === parsed?.farmSettings?.activeWeatherPlotId ||
              idx === 0) &&
            updatedPlot.subPlots &&
            updatedPlot.subPlots.length > 0
          ) {
            updatedPlot.crop = WHEAT_DBW_327_LABEL;
            updatedPlot.stage = 'sowing';
            updatedPlot.currentActivity =
              'एकड़ #5 व #6 में गेहूं DBW 327 बुवाई पूर्ण — बाकी एकड़ों में बतर का इंतजार';
            updatedPlot.subPlots = applyNarenBattarPresetToSubPlots(
              updatedPlot.subPlots
            );
          }

          // Strip out any previously auto-inserted expenses so expenses are ONLY added when the farmer enters them via the Per-Acre Form!
          if (!isZeroAutoExpenseMigrated && updatedPlot.subPlots) {
            updatedPlot.subPlots = updatedPlot.subPlots.map((sp, spIdx) => {
              const num = Number(sp.acreNumber) || spIdx + 1;
              const isEmptyText = `${sp.cropVariety || ''} ${
                sp.cropName || ''
              }`.includes('खाली');
              const entries = sp.expenseEntries || [];
              const mach = entries
                .filter((e) => e.category === 'machinery')
                .reduce((a, b) => a + b.totalAmount, 0);
              const lab = entries
                .filter((e) => e.category === 'labour')
                .reduce((a, b) => a + b.totalAmount, 0);
              const mat = entries
                .filter((e) => e.category === 'chemical_seed')
                .reduce((a, b) => a + b.totalAmount, 0);
              return {
                ...sp,
                acreStatus:
                  sp.acreStatus ||
                  (isEmptyText ? 'Empty' : num === 5 || num === 6 ? 'Seeded' : 'Empty'),
                sowingMethod:
                  sp.sowingMethod ||
                  (isEmptyText ? undefined : 'Super Seeder'),
                expenseEntries: entries,
                machineryExpense: mach,
                labourExpense: lab,
                materialExpense: mat,
                allocatedExpense: mach + lab + mat,
              };
            });
          }

          return updatedPlot;
        }
      );

      // Merge defaultVendorRates items if missing
      const existingRateIds = new Set(
        (parsed.vendorRates || []).map((v: VendorRateMemory) => v.id)
      );
      const mergedVendorRates: VendorRateMemory[] = [
        ...(parsed.vendorRates || []),
        ...defaultVendorRates.filter((v) => !existingRateIds.has(v.id)),
      ];

      const finalStore: FarmDataStore = {
        ...defaultStore,
        ...parsed,
        stockItems:
          Array.isArray(parsed.stockItems) && parsed.stockItems.length > 0
            ? parsed.stockItems
            : DEFAULT_STOCK_ITEMS,
        stockMovements:
          Array.isArray(parsed.stockMovements) && parsed.stockMovements.length > 0
            ? parsed.stockMovements
            : DEFAULT_STOCK_MOVEMENTS,
        plots: loadedPlots,
        vendorRates: mergedVendorRates,
        tasks: parsed.tasks || defaultTasks,
        farmSettings: {
          ...defaultStore.farmSettings,
          ...(parsed.farmSettings || {}),
        },
      };

      if (!isBattarMigrated || !isZeroAutoExpenseMigrated) {
        localStorage.setItem('naren_battar_dbw327_migrated_v1', 'true');
        localStorage.setItem('naren_zero_auto_expense_v2', 'true');
        this.save(finalStore);
      }

      return finalStore;
    } catch (e) {
      console.error('Error loading farm storage:', e);
      return defaultStore;
    }
  },

  save(data: FarmDataStore) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Trigger background auto sync if enabled
      if (data.farmSettings.autoCloudBackup) {
        this.syncToCloud(data, true).catch(() => {});
      }
    } catch (e) {
      console.error('Error saving farm storage:', e);
    }
  },

  // Helper to remember vendor rate
  rememberRate(
    store: FarmDataStore,
    vendorName: string,
    category: 'machinery' | 'labour' | 'chemical_seed' | 'aadti',
    serviceOrItem: string,
    rate: number,
    unit: string,
    phone?: string
  ): FarmDataStore {
    if (!vendorName || !serviceOrItem || !rate) return store;

    const existingIndex = store.vendorRates.findIndex(
      (v) =>
        v.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase() &&
        v.serviceOrItem.trim().toLowerCase() === serviceOrItem.trim().toLowerCase()
    );

    let updatedList = [...store.vendorRates];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = {
        ...updatedList[existingIndex],
        defaultRate: rate,
        unit,
        phone: phone || updatedList[existingIndex].phone,
        lastUpdated: new Date().toISOString().split('T')[0],
      };
    } else {
      updatedList.push({
        id: 'vm_' + Date.now(),
        vendorName: vendorName.trim(),
        category,
        serviceOrItem: serviceOrItem.trim(),
        defaultRate: rate,
        unit,
        phone,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    }

    const updatedStore = {
      ...store,
      vendorRates: updatedList,
    };
    this.save(updatedStore);
    return updatedStore;
  },

  // Cloud API: push backup
  async syncToCloud(data: FarmDataStore, silent = false): Promise<{ success: boolean; backupId?: string; message?: string }> {
    try {
      const resp = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${data.farmSettings.farmName} Snapshot`,
          note: `Auto sync: ${data.plots.length} plots, ${data.machineryRecords.length} machinery logs`,
          data,
          device: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server backup failed with status ${resp.status}`);
      }
      const res = await resp.json();
      data.farmSettings.lastCloudBackup = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { success: true, backupId: res.backupId, message: 'Cloud backup synced successfully' };
    } catch (err: any) {
      if (!silent) {
        console.warn('Cloud sync error:', err);
      }
      return { success: false, message: err.message };
    }
  },

  // Cloud API: list backups
  async listCloudBackups(): Promise<any[]> {
    try {
      const resp = await fetch('/api/backups');
      if (!resp.ok) throw new Error('Failed to fetch backup list');
      const json = await resp.json();
      return json.backups || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  },

  // Cloud API: restore snapshot
  async restoreFromCloud(backupId: string): Promise<FarmDataStore> {
    const resp = await fetch(`/api/backup/${backupId}`);
    if (!resp.ok) throw new Error('Could not restore backup snapshot');
    const json = await resp.json();
    if (!json.backup || !json.backup.data) {
      throw new Error('Invalid backup structure returned');
    }
    const restoredData: FarmDataStore = json.backup.data;
    this.save(restoredData);
    return restoredData;
  },

  // Offline File: Export JSON file
  exportToJsonFile(data: FarmDataStore) {
    const fileName = `Naren_Farm_Tracker_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Offline File: Import JSON file
  async importFromJsonFile(file: File): Promise<FarmDataStore> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (!parsed.machineryRecords || !parsed.farmSettings) {
            throw new Error('Invalid backup file format');
          }
          this.save(parsed);
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  },
};
