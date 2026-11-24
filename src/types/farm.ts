export type Language = 'hi' | 'en';

export type MachineryActivity =
  | 'Super Seeder'
  | 'Happy Seeder'
  | 'Zero Till Drill'
  | 'Seed Drill'
  | 'Rotavator'
  | 'Cultivator'
  | 'Disc Harrow'
  | 'MB Plough / Deep Plough'
  | 'Chisel Plough / Subsoiler'
  | 'Laser Land Leveler'
  | 'Suhaga / Plank'
  | 'Bund Maker / Ridger'
  | 'Boom Sprayer'
  | 'Drone Spray'
  | 'Combine Harvester'
  | 'Straw Reaper'
  | 'Baler / Parali Gaanth'
  | 'Mulcher / Shredder'
  | 'Thresher'
  | 'Rauni Irrigation'
  | 'Trolley / Transport'
  | 'Foliar Spread'
  | 'Leveling'
  | 'Ploughing'
  | 'Jutayi'
  | 'Other';

export interface MachineryRecord {
  id: string;
  activity: MachineryActivity;
  driverName: string;
  vendorPhone?: string;
  plotName: string;
  acres: number;
  hours?: number;
  ratePerUnit: number; // rate per acre or hour
  unitType: 'acre' | 'hour' | 'trolley';
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  date: string;
  workTimeSlot?: string; // e.g., 'सुबह (Morning)', 'दोपहर (Afternoon)', 'शाम (Evening)'
  notes?: string;
}

export type LabourActivity =
  | 'Fertiliser Broadcasting (खाद/यूरिया छींटा)'
  | 'Pesticide Broadcasting (दवाई/जिंक छींटा)'
  | 'Manual Spray (पिट्ठू/बैटरी पंप स्प्रे)'
  | 'Seed Broadcasting (बीज छींटा बिजाई)'
  | 'Spray'
  | 'Foliar Spread'
  | 'Transplantation'
  | 'Weed Management'
  | 'Harvesting'
  | 'Irrigation / Sinchai'
  | 'Other';

export interface LabourRecord {
  id: string;
  activity: LabourActivity;
  mateName: string; // Contractor or labourer name
  plotName: string;
  workersCount: number;
  acresCovered?: number;
  bagsOrTanksCount?: number;
  ratePerWorkerOrAcre: number;
  rateType: 'per_worker' | 'per_acre' | 'per_bag' | 'per_tank' | 'contract_lump';
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  date: string;
  workTimeSlot?: string;
  notes?: string;
}

export type MaterialType = 'seed' | 'fertiliser' | 'pesticide';

export interface MaterialRecord {
  id: string;
  type: MaterialType;
  itemName: string; // e.g. HD-2967, DAP, Urea, Coragen
  variety?: string; // For seed (e.g. PBW-550, Shriram 303)
  quantity: number; // weight or count
  unit: 'kg' | 'bag' | 'litre' | 'packet' | 'quintal';
  vendor: string; // Dealer / Shopkeeper name
  ratePerUnit: number;
  totalAmount: number;
  plotName?: string;
  date: string;
  workTimeSlot?: string;
  notes?: string;
}

export interface AadtiRecord {
  id: string;
  date: string;
  aadtiName: string; // Commission agent name / Shop name (e.g., M/s Gupta & Sons, Karnal Mandi)
  type: 'credit' | 'debit'; // credit = sold crop (payment due to farmer), debit = advance cash / khad purchase taken
  cropName?: string;
  quantityQuintal?: number;
  ratePerQuintal?: number;
  description: string;
  amount: number;
  runningBalance?: number;
  voucherNo?: string;
}

export type PlotStage = 'tilling' | 'sowing' | 'growing' | 'flowering' | 'harvesting';

export type AcreStatusType =
  | 'Empty'
  | 'Irrigated (Rauni)'
  | 'Cultivated'
  | 'Seeded';

export type SowingMethodType =
  | 'Super Seeder'
  | 'Happy Seeder'
  | 'Drill'
  | 'Foliar Spread';

export type StockCategory = 'khad' | 'beej' | 'spray' | 'grain';

export interface StockItem {
  id: string;
  category: StockCategory;
  name: string; // e.g., 'डीएपी खाद (DAP 50kg)', 'यूरिया खाद (Urea 45kg)', 'गेहूं बीज DBW 327', 'गेहूं अनाज (Wheat Grain)'
  unit: 'bag' | 'kg' | 'litre' | 'packet' | 'quintal';
  unitLabelHi: string; // 'बैग', 'किलो', 'लीटर', 'पैकेट', 'क्विंटल'
  totalPurchasedOrHarvested: number;
  totalUsedInFarm: number;
  totalSold: number;
  currentStock: number;
  ratePerUnit: number;
  lastUpdated: string;
}

export interface StockMovementLog {
  id: string;
  stockItemId: string;
  itemName: string;
  category: StockCategory;
  movementType: 'purchase_in' | 'harvest_in' | 'use_in_acre' | 'sell_out';
  quantity: number;
  unitLabelHi: string;
  ratePerUnit: number;
  totalValue: number;
  plotName?: string;
  acreNumber?: string | number;
  reasonOrNote?: string;
  partyName?: string;
  date: string;
  workTimeSlot?: string;
}

export interface AcreExpenseEntry {
  id: string;
  machineryOrJob: string;
  workerName: string;
  rate: number;
  totalAmount: number;
  date: string;
  workTimeSlot?: string;
  category: 'machinery' | 'labour' | 'chemical_seed';
  ledgerRecordId?: string;
  reasonNote?: string; // Why this expense was incurred on this acre (e.g., पीलापन / दोबारा बुवाई / ज्यादा खरपतवार)
  isFromStockUsage?: boolean; // True when allocated from Godown Stock (prevents double-counting in Farm Purchase Ledger)
  stockMovementId?: string;
}

export interface AcreSubPlot {
  id: string;
  acreNumber: number | string; // e.g. 1, 2, ..., 8, 8.5
  name: string; // e.g. "एकड़ 1 (नहर की तरफ)"
  acres: number; // e.g. 1.0 or 0.5
  acreStatus?: AcreStatusType; // 1. Empty | Irrigated (Rauni) | Cultivated | Seeded
  sowingMethod?: SowingMethodType; // 3. Super Seeder | Happy Seeder | Drill | Foliar Spread
  expenseEntries?: AcreExpenseEntry[]; // Explicitly asked & logged per-acre expenses (Never auto-inserted)
  cropName?: string; // e.g. "गेहूं (Wheat)"
  cropVariety?: string; // e.g. "DBW 303 (करण वैष्णवी)"
  sowingDate?: string; // e.g. "2026-11-05"
  stage?: PlotStage; // e.g. 'tilling' | 'sowing' | 'growing' | 'flowering' | 'harvesting'
  completedActivities?: string[]; // e.g. ['रोटावेटर जुताई', 'सुपर सीडर बिजाई', 'पहली कोर सिंचाई']
  soilHealth?: number; // 0 to 100
  moisturePct?: number; // 0 to 100
  machineryExpense?: number;
  labourExpense?: number;
  materialExpense?: number;
  allocatedExpense?: number;
  estimatedYieldQtl?: number;
  grainRatePerQtl?: number;
  earnedIncome?: number;
  notes?: string;
  coordinates?: { lat: number; lng: number };
  boundaries?: Array<{ lat: number; lng: number }>;
}

export interface FarmPlot {
  id: string;
  name: string;
  crop: string;
  acres: number;
  stage: PlotStage;
  progressPct: number; // 0 to 100
  soilHealth: number; // 0 to 100
  moisturePct: number; // 0 to 100
  sowingDate: string;
  expectedHarvestDate: string;
  currentActivity?: string;
  notes?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  locationName?: string;
  subPlots?: AcreSubPlot[];
  boundaries?: Array<{ lat: number; lng: number }>;
}

export interface VendorRateMemory {
  id: string;
  vendorName: string;
  category: 'machinery' | 'labour' | 'chemical_seed' | 'aadti';
  serviceOrItem: string;
  defaultRate: number;
  unit: string;
  phone?: string;
  lastUpdated: string;
}

export interface FarmTask {
  id: string;
  title: string;
  plotName?: string;
  category: 'irrigation' | 'spray' | 'machinery' | 'ledger_payment' | 'harvest' | 'general';
  dueDate: string;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  relatedRecordId?: string;
  pendingAmount?: number;
  vendorName?: string;
  completedAt?: string;
}

export type DeletedItemCategory =
  | 'acre_expense'
  | 'machinery'
  | 'labour'
  | 'material'
  | 'aadti'
  | 'plot'
  | 'acre_subplot'
  | 'task';

export interface DeletedHistoryPayload {
  plot?: FarmPlot;
  parentPlotId?: string;
  parentPlotName?: string;
  acreSubPlot?: AcreSubPlot;
  parentAcreId?: string;
  acreNumber?: number | string;
  acreExpenseEntry?: AcreExpenseEntry;
  linkedMachineryRecord?: MachineryRecord;
  machineryRecord?: MachineryRecord;
  labourRecord?: LabourRecord;
  materialRecord?: MaterialRecord;
  aadtiRecord?: AadtiRecord;
  task?: FarmTask;
}

export interface DeletedHistoryEntry {
  id: string;
  category: DeletedItemCategory;
  title: string;
  subtitle: string;
  amount?: number;
  deletedAt: string;
  payload: DeletedHistoryPayload;
}

export interface FarmDataStore {
  machineryRecords: MachineryRecord[];
  labourRecords: LabourRecord[];
  materialRecords: MaterialRecord[];
  aadtiRecords: AadtiRecord[];
  stockItems?: StockItem[];
  stockMovements?: StockMovementLog[];
  plots: FarmPlot[];
  vendorRates: VendorRateMemory[];
  tasks: FarmTask[];
  deletedHistory?: DeletedHistoryEntry[];
  farmSettings: {
    farmName: string;
    ownerName: string;
    location: string;
    activeWeatherPlotId?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    currency: string;
    language: Language;
    darkMode: boolean;
    autoCloudBackup: boolean;
    lastCloudBackup?: string;
    pushNotificationsEnabled?: boolean;
    dailyReminderTime?: string;
  };
}

export interface WeatherRiskAlert {
  id: string;
  type: 'heavy_rain' | 'extreme_heat' | 'high_wind_hail' | 'frost_fog' | 'fungal_humid';
  severity: 'critical' | 'warning' | 'advisory';
  titleHi: string;
  titleEn: string;
  descriptionHi: string;
  descriptionEn: string;
  impactHi: string;
  impactEn: string;
  recommendedActionsHi: string[];
  recommendedActionsEn: string[];
  triggerMetric: string;
  forecastWindowHi: string;
  forecastWindowEn: string;
  taskSuggestionHi: string;
  taskCategory: FarmTask['category'];
}

export interface DailyForecastItem {
  date: string;
  dayLabelHi: string;
  dayLabelEn: string;
  maxTemp: number;
  minTemp: number;
  rainProbability: number;
  windSpeedMax: number;
  conditionHi: string;
  conditionEn: string;
  riskTagHi?: string;
  riskSeverity?: 'critical' | 'warning' | 'normal';
}

export interface WeatherData {
  provider?: 'google_maps_weather' | 'open_meteo' | 'offline_fallback';
  temperature: number;
  humidity: number;
  apparentTemp: number;
  dewPoint?: number;
  windSpeed: number;
  windGust?: number;
  windDirectionCardinal?: string;
  windDirectionDegrees?: number;
  uvIndex?: number;
  cloudCover?: number;
  airPressure?: number;
  precipitationChance: number;
  precipitationQuantity?: number;
  thunderstormChance?: number;
  weatherCode: number;
  conditionText: string;
  iconUri?: string;
  location: string;
  coordinates?: { lat: number; lon: number };
  fetchedAt?: string;
  dailyForecast?: DailyForecastItem[];
  riskAlerts?: WeatherRiskAlert[];
  agriAdvice: {
    title: string;
    description: string;
    isSuitableForSpray: boolean;
    isSuitableForIrrigation: boolean;
    sprayWindowAdvice?: string;
    evapotranspirationIndex?: 'low' | 'moderate' | 'high';
    evapotranspirationAdvice?: string;
    fungalRiskLevel?: 'low' | 'moderate' | 'high';
    fungalAdvice?: string;
  };
}

