import React, { useState, useMemo } from 'react';
import {
  FarmDataStore,
  StockCategory,
  StockItem,
  MaterialRecord,
  MaterialType,
  AadtiRecord,
  AcreSubPlot,
} from '../types/farm';
import {
  STOCK_CATEGORY_META,
  UNIT_LABELS_HI,
  COMMON_EXPENSE_REASONS_HI,
  applyStockInTransaction,
  applyStockOutTransaction,
  computePerAcreDiagnosticSummary,
} from '../utils/stockUtils';
import {
  PackagePlus,
  Sprout,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Pencil,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Layers,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { SectionHelpPopup } from './SectionHelpPopup';
import {
  exportFarmDataToExcel,
  exportFarmDataToPDF,
} from '../utils/exportUtils';

interface StockManagementBoardProps {
  store: FarmDataStore;
  onSaveStore: (newStore: FarmDataStore) => void;
  showQuickSuccess?: (msg: string) => void;
}

type StockActionMode = 'use_in_acre' | 'purchase_in' | 'sell_out';

const QUICK_STOCK_TEMPLATES: Record<
  StockCategory,
  Array<{ name: string; unit: StockItem['unit']; defaultRate: number; icon: string }>
> = {
  khad: [
    { name: 'यूरिया खाद (Urea 45kg)', unit: 'bag', defaultRate: 270, icon: '🛍️' },
    { name: 'डीएपी खाद (DAP 50kg)', unit: 'bag', defaultRate: 1350, icon: '📦' },
    { name: 'जिंक सल्फेट (Zinc)', unit: 'kg', defaultRate: 180, icon: '⚡' },
    { name: 'पोटाश खाद (MOP)', unit: 'bag', defaultRate: 1700, icon: '🧪' },
    { name: 'सल्फर (Sulphur)', unit: 'kg', defaultRate: 160, icon: '🟡' },
  ],
  beej: [
    { name: 'गेहूं बीज (DBW 327 / PBW 550)', unit: 'bag', defaultRate: 1680, icon: '🌾' },
    { name: 'सरसों बीज (Pusa Bold)', unit: 'kg', defaultRate: 280, icon: '🌼' },
    { name: 'बासमती धान बीज (1509)', unit: 'kg', defaultRate: 140, icon: '🌱' },
  ],
  spray: [
    { name: 'खरपतवार नाशक दवाई (Weedicide)', unit: 'packet', defaultRate: 550, icon: '🧧' },
    { name: 'कोराजन कीटनाशक (Coragen Spray)', unit: 'litre', defaultRate: 2450, icon: '🍾' },
    { name: 'फंगीसाइड दवाई (Tilt / Folicur)', unit: 'litre', defaultRate: 850, icon: '🧴' },
  ],
  grain: [
    { name: 'गेहूं अनाज घर/बीज स्टॉक (Wheat Grain)', unit: 'quintal', defaultRate: 2450, icon: '🛢️' },
    { name: 'बासमती धान 1509 (Paddy Grain)', unit: 'quintal', defaultRate: 3650, icon: '🌾' },
    { name: 'सरसों अनाज (Mustard Grain)', unit: 'quintal', defaultRate: 5650, icon: '🟡' },
  ],
};

const CATEGORY_VISUAL_THEME: Record<
  StockCategory,
  {
    badgeBg: string;
    textAccent: string;
    containerTitleHi: string;
    packagingSubtitleHi: string;
  }
> = {
  khad: {
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    textAccent: 'text-emerald-400',
    containerTitleHi: 'खाद कट्टे व ड्रम गोदाम',
    packagingSubtitleHi: 'बोरी/कट्टे की चट्टी व किलो ड्रम',
  },
  beej: {
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    textAccent: 'text-amber-400',
    containerTitleHi: 'बीज बोरियां व थैली रैक',
    packagingSubtitleHi: 'प्रमाणित बीज बैग व किलो पैक',
  },
  spray: {
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    textAccent: 'text-purple-400',
    containerTitleHi: 'स्प्रे बोतल व पैकेट अलमारी',
    packagingSubtitleHi: 'लीटर बोतलें व दवाई पाउच',
  },
  grain: {
    badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40',
    textAccent: 'text-yellow-400',
    containerTitleHi: 'अनाज साइलो व बोरियां',
    packagingSubtitleHi: 'क्विंटल साइलो कोठी',
  },
};

/**
 * Renders distinct Master Category Graphics for the 4 top cards:
 * - 'khad': Wooden Pallet with Stacked Fertiliser Sacks (कट्टों की चट्टी)
 * - 'beej': Golden Seed Sacks with Sprout Emblem (बीज की बोरियां)
 * - 'spray': Chemical Bottle + Foil Packet Shelf (स्प्रे बोतल व पाउच)
 * - 'grain': Tall Corrugated Grain Silo Tower (अनाज साइलो कोठी)
 */
const MasterCategoryGraphic: React.FC<{
  category: StockCategory;
  fillPercent: number;
  totalCurrent: number;
  primaryUnit: string;
}> = ({ category, fillPercent, totalCurrent, primaryUnit }) => {
  if (category === 'khad') {
    // Stacked Fertiliser Bags on a Wooden Pallet (कट्टों की चट्टी)
    const activeRows = Math.max(1, Math.ceil((fillPercent / 100) * 4));
    return (
      <div className="relative w-28 sm:w-32 h-40 rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <span className="text-[10px] font-black text-emerald-300 tracking-tight">
          🛍️ खाद कट्टे
        </span>
        {/* Stack of 4 rows x 2 bags */}
        <div className="w-full flex flex-col-reverse gap-1 px-0.5 my-auto">
          {[1, 2, 3, 4].map((rowIdx) => {
            const isFilled = rowIdx <= activeRows;
            return (
              <div key={rowIdx} className="grid grid-cols-2 gap-1">
                {[0, 1].map((colIdx) => (
                  <div
                    key={colIdx}
                    className={`h-5 rounded-md border flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
                      isFilled
                        ? rowIdx % 2 === 0
                          ? 'bg-gradient-to-b from-amber-100 to-amber-300 border-amber-500 shadow-sm'
                          : 'bg-gradient-to-b from-emerald-100 to-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-slate-800/40 border-dashed border-slate-600 opacity-35'
                    }`}
                  >
                    {isFilled && (
                      <>
                        <div className="w-full h-1 bg-emerald-700/70 absolute top-0.5" />
                        <span className="text-[8px] font-black text-slate-900 tracking-tighter">
                          {rowIdx % 2 === 0 ? 'DAP' : 'UREA'}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {/* Wooden Godown Pallet Base */}
        <div className="w-full h-2.5 rounded-sm bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 border border-amber-600 flex items-center justify-around px-1 shadow-md">
          <div className="w-2.5 h-1 bg-slate-950 rounded-xs" />
          <div className="w-2.5 h-1 bg-slate-950 rounded-xs" />
          <div className="w-2.5 h-1 bg-slate-950 rounded-xs" />
        </div>
        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-emerald-500/40 font-mono font-black text-[10px] text-emerald-300 whitespace-nowrap">
          {totalCurrent} {primaryUnit}
        </span>
      </div>
    );
  }

  if (category === 'beej') {
    // Golden Burlap Seed Sacks (प्रमाणित बीज बोरियां)
    const activeBags = Math.max(1, Math.ceil((fillPercent / 100) * 3));
    return (
      <div className="relative w-28 sm:w-32 h-40 rounded-2xl bg-slate-900/90 border border-amber-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <span className="text-[10px] font-black text-amber-300 tracking-tight">
          🌾 बीज बोरियां
        </span>
        <div className="flex items-end justify-center gap-1 px-1 my-auto">
          {[1, 2, 3].map((bagIdx) => {
            const isFilled = bagIdx <= activeBags;
            return (
              <div
                key={bagIdx}
                className={`w-7 sm:w-8 rounded-t-xl rounded-b-lg border-2 flex flex-col items-center justify-between py-1.5 transition-all duration-500 ${
                  bagIdx === 2 ? 'h-22 -mx-1 z-10' : 'h-18'
                } ${
                  isFilled
                    ? 'bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-700 border-yellow-200 shadow-lg'
                    : 'bg-slate-800/40 border-dashed border-slate-600 opacity-35'
                }`}
              >
                <div className="w-4 h-1.5 rounded-full bg-amber-900/80" />
                <span className="text-xs">{isFilled ? '🌱' : ''}</span>
                <span className="text-[7px] font-black text-slate-950 bg-yellow-200/90 px-1 rounded">
                  SEED
                </span>
              </div>
            );
          })}
        </div>
        <div className="w-full h-2.5 rounded-sm bg-amber-800 border border-amber-600" />
        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-amber-500/40 font-mono font-black text-[10px] text-amber-300 whitespace-nowrap">
          {totalCurrent} {primaryUnit}
        </span>
      </div>
    );
  }

  if (category === 'spray') {
    // Chemical Bottle + Foil Packet Shelf (स्प्रे बोतल व दवाई पैकेट)
    return (
      <div className="relative w-28 sm:w-32 h-40 rounded-2xl bg-slate-900/90 border border-purple-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <span className="text-[10px] font-black text-purple-300 tracking-tight">
          🍾 बोतल व पैकेट
        </span>
        <div className="flex items-end justify-center gap-2 w-full px-1 my-auto">
          {/* Left: Pesticide Bottle with Liquid Level */}
          <div className="flex flex-col items-center">
            <div className="w-4 h-2 rounded-t bg-rose-500 border border-rose-300" />
            <div className="w-3 h-1.5 bg-slate-300" />
            <div className="relative w-10 h-18 rounded-xl bg-slate-950 border-2 border-purple-400/80 overflow-hidden shadow-md">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-700 via-fuchsia-500 to-pink-400 transition-all duration-700"
                style={{ height: `${fillPercent}%` }}
              >
                <div className="w-full h-1 bg-white/70" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="text-[10px]">🧪</span>
                <span className="text-[7px] font-mono font-black text-white bg-slate-950/80 px-1 rounded">
                  {fillPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Right: Tear-Notch Foil Packet Pouch */}
          <div className="relative w-10 h-16 rounded-md bg-gradient-to-br from-cyan-500 via-teal-600 to-slate-900 border-2 border-cyan-300 shadow-md flex flex-col items-center justify-between p-1 overflow-hidden">
            <div className="w-full border-b border-dashed border-white/60 pb-0.5 flex justify-center">
              <div className="w-2 h-0.5 rounded bg-white/80" />
            </div>
            <span className="text-xs">🧧</span>
            <span className="text-[6px] font-black text-white uppercase tracking-tighter bg-slate-950/70 px-1 rounded">
              POUCH
            </span>
          </div>
        </div>
        <div className="w-full h-2 rounded bg-slate-500 border border-slate-300" />
        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-purple-500/40 font-mono font-black text-[10px] text-purple-300 whitespace-nowrap">
          {totalCurrent} {primaryUnit}
        </span>
      </div>
    );
  }

  // 'grain': Corrugated Steel Grain Silo Tower (अनाज साइलो टावर)
  return (
    <div className="relative w-28 sm:w-32 h-40 rounded-2xl bg-slate-900/90 border border-yellow-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
      <span className="text-[10px] font-black text-yellow-300 tracking-tight">
        🛢️ अनाज साइलो
      </span>
      <div className="flex flex-col items-center my-auto">
        <div className="w-4 h-1.5 rounded-t bg-slate-300" />
        <div
          className="w-20 h-4 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-600"
          style={{ clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)' }}
        />
        <div className="relative w-20 h-20 rounded-b-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-2 border-yellow-400/70 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-evenly opacity-30 pointer-events-none z-20">
            <div className="border-b border-dashed border-slate-200" />
            <div className="border-b border-dashed border-slate-200" />
            <div className="border-b border-dashed border-slate-200" />
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-600 via-yellow-500 to-yellow-300 transition-all duration-700"
            style={{ height: `${fillPercent}%` }}
          >
            <div className="w-full h-1.5 bg-yellow-100" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
            <span className="px-1.5 py-0.5 rounded bg-slate-950/85 font-mono font-black text-[10px] text-yellow-300 border border-yellow-400/30">
              🌾 {fillPercent}%
            </span>
          </div>
        </div>
      </div>
      <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-yellow-500/40 font-mono font-black text-[10px] text-yellow-300 whitespace-nowrap">
        {totalCurrent} {primaryUnit}
      </span>
    </div>
  );
};

/**
 * Renders the Item-Specific Packaging Graphic inside a uniform, spacious frame:
 * 1) `unit === 'bag'`     ➔ Stacked Sacks / Katte on a Wooden Pallet (कट्टे / बोरियां — आधे बैग 0.5 सहित!)
 * 2) `unit === 'litre'`   ➔ 3D Agricultural Chemical Bottle / Jerrycan with ml/L Sight Glass (स्प्रे बोतल / कैन)
 * 3) `unit === 'packet'`  ➔ Metallic Foil Zipper Pouches / Packets Stack (दवाई / बीज के पैकेट)
 * 4) `unit === 'kg'`      ➔ Heavy-Duty Agri Drum / Bucket with Granular Fill & Weight Dial (किलो ड्रम / बाल्टी)
 * 5) `unit === 'quintal'` ➔ Tall Corrugated Steel Grain Silo with Burlap Bori (अनाज साइलो टावर)
 */
const ItemPackagingGraphic: React.FC<{
  item: StockItem;
  fillPercent: number;
  rawPercent: number;
  isLow: boolean;
}> = ({ item, fillPercent, rawPercent, isLow }) => {
  // 1. BAG / SACK GRAPHIC (कट्टे / बोरी की चट्टी — Urea, DAP, Potash, Certified Wheat Seed)
  if (item.unit === 'bag') {
    const maxSlots = Math.min(
      10,
      Math.max(4, Math.ceil(Math.max(item.totalPurchasedOrHarvested, item.currentStock, 4)))
    );
    const fullBags = Math.floor(item.currentStock);
    const hasHalfBag = item.currentStock - fullBags >= 0.25;
    const isSeedBag = item.category === 'beej';
    const isDap =
      item.name.toLowerCase().includes('dap') || item.name.includes('डीएपी');

    return (
      <div className="relative w-32 sm:w-36 h-44 rounded-2xl bg-slate-900/95 border border-emerald-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <div className="text-[10px] font-black text-amber-300 flex items-center gap-1 whitespace-nowrap">
          <span>🛍️ कट्टों की चट्टी</span>
        </div>

        {/* Grid of Stacked Bags (2 per row, stacked from bottom to top) */}
        <div className="w-full bg-slate-950/90 border border-slate-800 rounded-t-xl p-1.5 flex flex-col-reverse gap-1 my-auto">
          {Array.from({ length: Math.ceil(maxSlots / 2) }).map((_, rowIdx) => {
            const leftBagIndex = rowIdx * 2;
            const rightBagIndex = rowIdx * 2 + 1;

            const renderSingleBag = (bagIndex: number) => {
              if (bagIndex >= maxSlots) return <div key={bagIndex} />;
              const isFull = bagIndex < fullBags;
              const isPartial = !isFull && bagIndex === fullBags && hasHalfBag;

              if (!isFull && !isPartial) {
                return (
                  <div
                    key={bagIndex}
                    className="h-5 rounded border border-dashed border-slate-700 bg-slate-900/40 flex items-center justify-center"
                    title="इस्तेमाल हो चुका कट्टा"
                  >
                    <span className="text-[8px] font-mono text-slate-500">खाली</span>
                  </div>
                );
              }

              return (
                <div
                  key={bagIndex}
                  className={`h-5 rounded border relative overflow-hidden flex items-center justify-center shadow-xs transition-all ${
                    isPartial ? 'w-3/5 mx-auto' : 'w-full'
                  } ${
                    isSeedBag
                      ? 'bg-gradient-to-b from-amber-200 via-yellow-400 to-amber-600 border-yellow-200'
                      : isDap
                      ? 'bg-gradient-to-b from-orange-100 via-amber-200 to-amber-400 border-amber-500'
                      : 'bg-gradient-to-b from-white via-emerald-100 to-emerald-300 border-emerald-400'
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-[2px] ${
                      isSeedBag
                        ? 'bg-amber-900'
                        : isDap
                        ? 'bg-red-600'
                        : 'bg-emerald-700'
                    }`}
                  />
                  <span className="text-[8px] font-black text-slate-950 tracking-tighter leading-none">
                    {isPartial
                      ? '½ बैग'
                      : isSeedBag
                      ? '🌾 बीज'
                      : isDap
                      ? 'DAP'
                      : 'UREA'}
                  </span>
                </div>
              );
            };

            return (
              <div key={rowIdx} className="grid grid-cols-2 gap-1">
                {renderSingleBag(leftBagIndex)}
                {renderSingleBag(rightBagIndex)}
              </div>
            );
          })}
        </div>

        {/* Wooden Godown Pallet under the Bags */}
        <div className="w-full h-2.5 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 border border-amber-500 rounded-b-md flex items-center justify-between px-2 shadow-md">
          <div className="w-2.5 h-1 bg-slate-950" />
          <div className="w-2.5 h-1 bg-slate-950" />
          <div className="w-2.5 h-1 bg-slate-950" />
        </div>

        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-emerald-500/40 font-mono font-black text-[10px] text-emerald-300 whitespace-nowrap">
          {item.currentStock} / {Math.max(item.totalPurchasedOrHarvested, item.currentStock)} बैग
        </span>
      </div>
    );
  }

  // 2. BOTTLE / JERRYCAN GRAPHIC (स्प्रे दवाई की बोतल / कैन — Coragen, Tilt, Liquid Spray)
  if (item.unit === 'litre') {
    return (
      <div className="relative w-32 sm:w-36 h-44 rounded-2xl bg-slate-900/95 border border-purple-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <div className="text-[10px] font-black text-purple-300 whitespace-nowrap">
          🍾 केमिकल बोतल
        </div>

        <div className="flex flex-col items-center my-auto">
          {/* Measuring Cap */}
          <div className="w-7 h-3 rounded-t-md bg-gradient-to-r from-rose-600 via-rose-400 to-rose-600 border border-rose-300 shadow-xs" />
          {/* Neck Ring */}
          <div className="w-5 h-2 bg-slate-300 border-x border-slate-400" />

          {/* Molded Pesticide Bottle Body with Side Handle & Graduated ml Window */}
          <div className="relative w-20 h-24 rounded-t-2xl rounded-b-xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-2 border-purple-400/80 overflow-hidden shadow-inner">
            <div className="absolute right-1 top-3 w-2.5 h-8 rounded-full border-2 border-slate-400/50 bg-slate-950/70 z-20 pointer-events-none" />

            <div className="absolute left-1.5 top-2 bottom-2 flex flex-col justify-between text-[7px] font-mono text-white/80 z-20 pointer-events-none">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
            </div>

            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${
                isLow
                  ? 'from-rose-700 via-rose-500 to-amber-400'
                  : 'from-purple-800 via-fuchsia-500 to-pink-400'
              } transition-all duration-700 ease-out`}
              style={{ height: `${fillPercent}%` }}
            >
              <div className="w-full h-1.5 bg-white/80 shadow-sm" />
            </div>

            <div className="absolute inset-x-2.5 top-1/2 -translate-y-1/2 py-1 px-1 rounded bg-slate-950/85 border border-purple-300/40 text-center z-30 pointer-events-none">
              <span className="text-[10px] block leading-none">🛡️</span>
              <span className="font-mono font-black text-[9px] text-white">
                {rawPercent}% भरा
              </span>
            </div>
          </div>
        </div>

        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-purple-500/40 font-mono font-black text-[10px] text-purple-300 whitespace-nowrap">
          {item.currentStock} लीटर बचा
        </span>
      </div>
    );
  }

  // 3. FOIL PACKET / POUCH GRAPHIC (दवाई / खरपतवार नाशक के पैकेट — Weedicide, Fungicide Pouches)
  if (item.unit === 'packet') {
    const totalPkts = Math.min(
      8,
      Math.max(1, Math.ceil(Math.max(item.totalPurchasedOrHarvested, item.currentStock, 4)))
    );
    const activePkts = Math.ceil(item.currentStock);

    return (
      <div className="relative w-32 sm:w-36 h-44 rounded-2xl bg-slate-900/95 border border-cyan-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <div className="text-[10px] font-black text-cyan-300 whitespace-nowrap">
          🧧 सीलबंद पैकेट
        </div>

        {/* Main Metallic Foil Zipper Pouch */}
        <div className="relative w-20 h-26 my-auto rounded-lg bg-gradient-to-b from-slate-800 to-slate-950 border-2 border-cyan-400/80 p-1 flex flex-col justify-between overflow-hidden shadow-md">
          <div className="w-full h-3 bg-slate-700/90 border-b border-dashed border-cyan-300/60 flex items-center justify-center relative z-20">
            <div className="w-3 h-1 rounded-full bg-slate-950 border border-slate-500" />
          </div>

          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${
              isLow
                ? 'from-rose-700 via-rose-500 to-amber-400'
                : 'from-teal-700 via-cyan-500 to-emerald-300'
            } transition-all duration-700 ease-out`}
            style={{ height: `${Math.min(86, fillPercent)}%` }}
          >
            <div className="w-full h-1 bg-white/75" />
          </div>

          <div className="relative z-30 my-auto mx-auto px-2 py-1 rounded bg-slate-950/90 border border-cyan-300/40 text-center">
            <span className="text-[9px] font-black text-cyan-300 block leading-none">
              POUCH
            </span>
            <span className="font-mono font-black text-[10px] text-white">
              {item.currentStock} पैकेट
            </span>
          </div>

          <div className="relative z-30 flex items-center justify-center gap-0.5 pb-0.5">
            {Array.from({ length: totalPkts }).map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-2.5 rounded-xs border ${
                  idx < activePkts
                    ? 'bg-amber-300 border-white'
                    : 'bg-slate-800 border-slate-600 opacity-40'
                }`}
              />
            ))}
          </div>
        </div>

        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-cyan-500/40 font-mono font-black text-[10px] text-cyan-300 whitespace-nowrap">
          {item.currentStock} / {Math.max(item.totalPurchasedOrHarvested, item.currentStock)} पैकेट
        </span>
      </div>
    );
  }

  // 4. KG DRUM / BUCKET / THAILI GRAPHIC (किलो वाले आइटम: जिंक, सल्फर, सरसों बीज)
  if (item.unit === 'kg') {
    const isSeed = item.category === 'beej';
    return (
      <div className="relative w-32 sm:w-36 h-44 rounded-2xl bg-slate-900/95 border border-teal-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
        <div className="text-[10px] font-black text-teal-300 whitespace-nowrap">
          🪣 किलो ड्रम/पैक
        </div>

        <div className="flex flex-col items-center my-auto">
          {/* Heavy-Duty Drum Lid */}
          <div className="w-22 h-2.5 rounded-t-md bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 border border-amber-200 z-10" />

          {/* Tapered Agricultural Bucket / Drum Body */}
          <div className="relative w-20 h-24 rounded-b-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-2 border-teal-400/75 overflow-hidden shadow-inner">
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${
                isSeed
                  ? 'from-amber-700 via-yellow-500 to-amber-300'
                  : 'from-teal-700 via-emerald-500 to-cyan-300'
              } transition-all duration-700 ease-out`}
              style={{ height: `${fillPercent}%` }}
            >
              <div className="w-full h-1.5 bg-white/70" />
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
              <div className="px-2 py-1 rounded-lg bg-slate-950/90 border border-teal-300/40 text-center shadow-md">
                <span className="text-[8px] text-slate-300 block leading-none">
                  ⚖️ वज़न
                </span>
                <span className="font-mono font-black text-xs text-white">
                  {item.currentStock} kg
                </span>
              </div>
            </div>
          </div>
        </div>

        <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-teal-500/40 font-mono font-black text-[10px] text-teal-300 whitespace-nowrap">
          {rawPercent}% भरा ({item.currentStock} किलो)
        </span>
      </div>
    );
  }

  // 5. QUINTAL GRAIN SILO TOWER (अनाज / उपज के लिए मेटैलिक साइलो कोठी — गेहूं, धान, सरसों अनाज)
  return (
    <div className="relative w-32 sm:w-36 h-44 rounded-2xl bg-slate-900/95 border border-yellow-500/30 p-2.5 flex flex-col items-center justify-between shrink-0 select-none shadow-inner">
      <div className="text-[10px] font-black text-yellow-300 whitespace-nowrap">
        🛢️ अनाज साइलो
      </div>
      <div className="flex flex-col items-center my-auto">
        <div className="w-5 h-1.5 rounded-t bg-slate-400" />
        <div
          className="w-20 h-4 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-600"
          style={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
          }}
        />
        <div className="relative w-20 h-22 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 border-2 border-yellow-400/80 rounded-b-xl overflow-hidden shadow-inner">
          <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-evenly text-[7px] font-mono text-slate-300/75 z-20 pointer-events-none">
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
          </div>
          <div className="absolute left-1.5 top-0 bottom-0 w-2 border-x border-slate-300/30 flex flex-col justify-evenly z-20 pointer-events-none">
            <div className="h-[1px] bg-slate-300/50" />
            <div className="h-[1px] bg-slate-300/50" />
            <div className="h-[1px] bg-slate-300/50" />
            <div className="h-[1px] bg-slate-300/50" />
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${
              isLow
                ? 'from-rose-700 via-rose-500 to-amber-400'
                : 'from-yellow-700 via-amber-400 to-yellow-200'
            } transition-all duration-700 ease-out`}
            style={{ height: `${fillPercent}%` }}
          >
            <div className="w-full h-1.5 bg-white/75" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            <span className="px-1.5 py-0.5 rounded bg-slate-950/85 border border-white/20 font-mono font-black text-xs text-yellow-300">
              {rawPercent}%
            </span>
          </div>
        </div>
      </div>
      <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-950 border border-yellow-500/40 font-mono font-black text-[10px] text-yellow-300 whitespace-nowrap">
        {item.currentStock} क्विंटल
      </span>
    </div>
  );
};

export const StockManagementBoard: React.FC<StockManagementBoardProps> = ({
  store,
  onSaveStore,
  showQuickSuccess,
}) => {
  const stockItems = store.stockItems || [];
  const stockMovements = store.stockMovements || [];

  const [localToast, setLocalToast] = useState<string | null>(null);
  const [activeStockView, setActiveStockView] = useState<
    'godown' | 'acre_compare' | 'history'
  >('godown');
  const [selectedCategory, setSelectedCategory] = useState<'all' | StockCategory>('all');
  const [actionMode, setActionMode] = useState<StockActionMode>('use_in_acre');
  const [showFormDrawer, setShowFormDrawer] = useState<boolean>(false);

  const notifySuccess = (msg: string) => {
    if (showQuickSuccess) {
      showQuickSuccess(msg);
    }
    setLocalToast(msg);
    window.setTimeout(() => setLocalToast(null), 3500);
  };

  // Form states
  const [formCategory, setFormCategory] = useState<StockCategory>('khad');
  const [selectedStockId, setSelectedStockId] = useState<string>(
    stockItems[0]?.id || ''
  );
  const [itemName, setItemName] = useState<string>(
    stockItems[0]?.name || 'डीएपी खाद (DAP 50kg)'
  );
  const [unit, setUnit] = useState<StockItem['unit']>(
    stockItems[0]?.unit || 'bag'
  );
  const [quantity, setQuantity] = useState<string>('1');
  const [ratePerUnit, setRatePerUnit] = useState<string>(
    String(stockItems[0]?.ratePerUnit || 1350)
  );
  const [partyName, setPartyName] = useState<string>('');
  const [selectedPlotName, setSelectedPlotName] = useState<string>(
    store.plots[0]?.name || ''
  );
  const [selectedAcreNum, setSelectedAcreNum] = useState<string>('5');
  const [reasonNote, setReasonNote] = useState<string>(
    COMMON_EXPENSE_REASONS_HI[0]
  );
  const [customReason, setCustomReason] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);

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

  const filteredStockItems = useMemo(() => {
    if (selectedCategory === 'all') return stockItems;
    return stockItems.filter((item) => item.category === selectedCategory);
  }, [stockItems, selectedCategory]);

  // Calculate Master Category Totals
  const categorySiloSummary = useMemo(() => {
    return (['khad', 'beej', 'spray', 'grain'] as StockCategory[]).map((cat) => {
      const items = stockItems.filter((i) => i.category === cat);
      const totalCurrent = items.reduce((s, i) => s + i.currentStock, 0);
      const totalCapacity = items.reduce(
        (s, i) => s + Math.max(i.totalPurchasedOrHarvested, i.currentStock, 1),
        0
      );
      const totalUsed = items.reduce((s, i) => s + i.totalUsedInFarm, 0);
      const totalSold = items.reduce((s, i) => s + i.totalSold, 0);
      const totalValue = items.reduce(
        (s, i) => s + Math.round(i.currentStock * i.ratePerUnit),
        0
      );
      const fillPercent =
        totalCapacity > 0
          ? Math.min(100, Math.max(6, Math.round((totalCurrent / totalCapacity) * 100)))
          : 0;
      const primaryUnit =
        cat === 'grain'
          ? 'क्विंटल'
          : cat === 'spray'
          ? 'लीटर/पैकेट'
          : 'बैग/किलो';

      return {
        category: cat,
        itemsCount: items.length,
        totalCurrent: Number(totalCurrent.toFixed(2)),
        totalCapacity: Number(totalCapacity.toFixed(2)),
        totalUsed: Number(totalUsed.toFixed(2)),
        totalSold: Number(totalSold.toFixed(2)),
        totalValue,
        fillPercent: totalCurrent <= 0 ? 0 : fillPercent,
        primaryUnit,
      };
    });
  }, [stockItems]);

  const totalGodownValuation = useMemo(
    () =>
      stockItems.reduce(
        (sum, item) => sum + Math.round(item.currentStock * item.ratePerUnit),
        0
      ),
    [stockItems]
  );

  // Select a stock item for quick Use / Buy / Sell
  const handleSelectStockItemForAction = (
    item: StockItem,
    mode: StockActionMode
  ) => {
    setActionMode(mode);
    setFormCategory(item.category);
    setSelectedStockId(item.id);
    setItemName(item.name);
    setUnit(item.unit);
    setRatePerUnit(String(item.ratePerUnit));
    setQuantity(item.category === 'grain' ? '10' : '1');
    setShowFormDrawer(true);
  };

  // Submit Stock IN (Purchase or Harvest) / Stock OUT (Use in Acre or Sell)
  const handleSubmitStockAction = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyVal = Math.max(0.01, Number(quantity) || 0);
    const rateVal = Math.max(0, Number(ratePerUnit) || 0);
    const totalVal = Math.round(qtyVal * rateVal);
    const finalReason = customReason.trim() || reasonNote;

    if (actionMode === 'purchase_in') {
      const isGrainHarvest = formCategory === 'grain';
      const { nextStockItems, nextStockMovements, updatedItem } =
        applyStockInTransaction({
          stockItems,
          stockMovements,
          category: formCategory,
          itemName,
          quantity: qtyVal,
          unit,
          ratePerUnit: rateVal,
          movementType: isGrainHarvest ? 'harvest_in' : 'purchase_in',
          partyName:
            partyName.trim() ||
            (isGrainHarvest ? 'खेत कटाई उपज' : 'खाद-बीज दुकान'),
          reasonOrNote: isGrainHarvest
            ? 'खेत से नई फसल उपज गोदाम में जमा'
            : 'गोदाम स्टॉक के लिए खरीद',
          date: entryDate,
        });

      let nextMaterialRecords = store.materialRecords || [];
      if (!isGrainHarvest) {
        const matType: MaterialType =
          formCategory === 'beej'
            ? 'seed'
            : formCategory === 'spray'
            ? 'pesticide'
            : 'fertiliser';
        const newMat: MaterialRecord = {
          id: `mat-stk-${Date.now()}`,
          type: matType,
          itemName: updatedItem.name,
          quantity: qtyVal,
          unit: updatedItem.unit,
          vendor: partyName.trim() || 'खाद-बीज दुकान (गोदाम खरीद)',
          ratePerUnit: rateVal,
          totalAmount: totalVal,
          plotName: '📦 गोदाम स्टॉक खरीद (All Farm Stock)',
          date: entryDate,
          notes: `📦 गोदाम स्टॉक खरीद: +${qtyVal} ${updatedItem.unitLabelHi} (अब बचा स्टॉक: ${updatedItem.currentStock} ${updatedItem.unitLabelHi})`,
        };
        nextMaterialRecords = [newMat, ...nextMaterialRecords];
      }

      onSaveStore({
        ...store,
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        materialRecords: nextMaterialRecords,
      });

      notifySuccess(
        `✅ गोदाम में +${qtyVal} ${updatedItem.unitLabelHi} ${updatedItem.name} जुड़ गया! (बचा स्टॉक: ${updatedItem.currentStock} ${updatedItem.unitLabelHi})`
      );
      setCustomReason('');
      return;
    }

    if (actionMode === 'use_in_acre') {
      const { nextStockItems, nextStockMovements, nextPlots, updatedItem } =
        applyStockOutTransaction({
          stockItems,
          stockMovements,
          plots: store.plots,
          stockItemId: selectedStockId,
          itemName,
          category: formCategory,
          quantity: qtyVal,
          unit,
          ratePerUnit: rateVal,
          movementType: 'use_in_acre',
          plotName: selectedPlotName,
          acreNumber: selectedAcreNum,
          partyName: partyName.trim() || 'गोदाम स्टॉक से उपयोग',
          reasonOrNote: finalReason,
          date: entryDate,
        });

      // ZERO DOUBLE-COUNTING: Logged ONLY inside `nextPlots` (Acre #N's `expenseEntries`)
      onSaveStore({
        ...store,
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        plots: nextPlots,
      });

      notifySuccess(
        `✅ स्टॉक घट गया (-${qtyVal} ${updatedItem.unitLabelHi}) और एकड़ #${selectedAcreNum} के हिसाब में बिना डबल-काउंटिंग जुड़ गया!`
      );
      setCustomReason('');
      return;
    }

    if (actionMode === 'sell_out') {
      const { nextStockItems, nextStockMovements, updatedItem } =
        applyStockOutTransaction({
          stockItems,
          stockMovements,
          plots: store.plots,
          stockItemId: selectedStockId,
          itemName,
          category: formCategory,
          quantity: qtyVal,
          unit,
          ratePerUnit: rateVal,
          movementType: 'sell_out',
          partyName: partyName.trim() || 'मंडी आढ़ती / व्यापारी',
          reasonOrNote: customReason.trim() || 'गोदाम स्टॉक से बिक्री',
          date: entryDate,
        });

      const newAadti: AadtiRecord = {
        id: `aadti-stk-${Date.now()}`,
        date: entryDate,
        aadtiName: partyName.trim() || 'मंडी आढ़ती / व्यापारी',
        type: 'credit',
        cropName: updatedItem.name,
        quantityQuintal: qtyVal,
        ratePerQuintal: rateVal,
        description: `🌾 गोदाम स्टॉक बिक्री: ${qtyVal} ${updatedItem.unitLabelHi} ${updatedItem.name} @ ₹${rateVal}`,
        amount: totalVal,
      };

      onSaveStore({
        ...store,
        stockItems: nextStockItems,
        stockMovements: nextStockMovements,
        aadtiRecords: [newAadti, ...(store.aadtiRecords || [])],
      });

      notifySuccess(
        `✅ बिक्री दर्ज! गोदाम से -${qtyVal} ${updatedItem.unitLabelHi} कम हो गया और ₹${totalVal.toLocaleString('en-IN')} आमदनी जुड़ गई!`
      );
      setCustomReason('');
    }
  };

  const handleDeleteStockItem = (id: string) => {
    onSaveStore({
      ...store,
      stockItems: stockItems.filter((s) => s.id !== id),
    });
    notifySuccess('🗑️ स्टॉक आइटम हटाया गया');
  };

  const handleSaveEditedStockItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    const nextList = stockItems.map((it) =>
      it.id === editingStockItem.id ? editingStockItem : it
    );
    onSaveStore({
      ...store,
      stockItems: nextList,
    });
    setEditingStockItem(null);
    notifySuccess('✅ स्टॉक मात्रा व रेट अपडेट हो गया!');
  };

  // Per-Acre Diagnostic Summary (Why was expense higher in any acre?)
  const acreDiagnostics = useMemo(
    () => computePerAcreDiagnosticSummary(activePlotObj),
    [activePlotObj]
  );

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Floating Toast Notification */}
      {localToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce max-w-[92vw]">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="truncate">{localToast}</span>
        </div>
      )}

      {/* ==================== 1. CLEAN FACEBOOK-STYLE STOCK HEADER CARD ==================== */}
      <div className="rounded-2xl bg-white dark:bg-[#242526] border border-slate-200/80 dark:border-[#3E4042] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.08)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-2xl shrink-0">
              📦
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#050505] dark:text-[#E4E6EB]">
                  गोदाम स्टॉक (कट्टे, बोतल, पैकेट व साइलो)
                </h2>
                <SectionHelpPopup
                  compact
                  titleHi="गोदाम स्टॉक व ग्राफिकल कंटेनर (कट्टे, बोतल, पैकेट व साइलो)"
                  subtitleHi="खरीद पर स्टॉक जुड़ेगा (+) और स्प्रे/छींटा/बिक्री पर ऑटोमैटिक घटेगा (-)"
                  bulletsHi={[
                    '1. खाद व बीज कट्टों (Stacked Bags) में, स्प्रे दवाई बोतल व पैकेट (Bottles & Packets) में और अनाज साइलो कोठी (Grain Silo) में दिखता है।',
                    '2. जब भी आप नई खरीद करते हैं तो स्टॉक अपने-आप बढ़ जाता है।',
                    '3. जब भी किसी एकड़ में स्प्रे, फोलियर स्प्रे, छींटा या बुवाई करते हैं तो उतनी मात्रा गोदाम स्टॉक से बिना डबल-काउंटिंग के घट जाती है।',
                  ]}
                />
              </div>
              <p className="text-xs sm:text-sm text-[#65676B] dark:text-[#B0B3B8]">
                गोदाम में कुल बचा माल:{' '}
                <strong className="font-mono text-[#16A34A] dark:text-emerald-400">
                  ₹{totalGodownValuation.toLocaleString('en-IN')}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveStockView('godown');
                setShowFormDrawer(true);
                window.setTimeout(() => {
                  document
                    .getElementById('silo-action-form')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 80);
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ स्टॉक एंट्री</span>
            </button>
            <button
              type="button"
              onClick={() => exportFarmDataToExcel(store)}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={() => exportFarmDataToPDF(store)}
              className="min-h-[40px] px-3 py-2 rounded-lg bg-[#E4E6EB] hover:bg-[#D8DADF] dark:bg-[#3A3B3C] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-amber-500" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* CLEAN 3-TAB FACEBOOK SWITCHER */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 dark:border-[#3E4042]">
          <button
            type="button"
            onClick={() => setActiveStockView('godown')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeStockView === 'godown'
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB]'
            }`}
          >
            <span>📦 गोदाम स्टॉक ({stockItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStockView('acre_compare')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeStockView === 'acre_compare'
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB]'
            }`}
          >
            <span>🔍 एकड़ तुलना (क्यों ज्यादा खर्च?)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStockView('history')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
              activeStockView === 'history'
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#F0F2F5] dark:bg-[#3A3B3C] hover:bg-[#E4E6EB] dark:hover:bg-[#4E4F50] text-[#050505] dark:text-[#E4E6EB]'
            }`}
          >
            <span>📜 आवक-जावक रजिस्टर ({stockMovements.length})</span>
          </button>
        </div>

        {/* ==================== 2. 4 BIG SYMMETRICAL MASTER CATEGORY CARDS (Visible in Godown View) ==================== */}
        {activeStockView === 'godown' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-sm font-bold text-[#050505] dark:text-[#E4E6EB] flex items-center gap-1.5">
              <span>🏪 गोदाम के 4 मुख्य विभाग (खाद, बीज, दवाई व अनाज):</span>
            </span>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow-sm"
              >
                🔄 सारा गोदाम दिखाएं ({stockItems.length})
              </button>
            )}
          </div>

          {/* BIG SYMMETRICAL 2-COLUMN CARDS (1 col on mobile, 2 cols on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {categorySiloSummary.map((silo) => {
              const meta = STOCK_CATEGORY_META[silo.category];
              const theme = CATEGORY_VISUAL_THEME[silo.category];
              const isSelected = selectedCategory === silo.category;

              return (
                <button
                  key={silo.category}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(
                      selectedCategory === silo.category ? 'all' : silo.category
                    );
                    setFormCategory(silo.category);
                  }}
                  className={`group relative rounded-3xl p-4 sm:p-5 text-left transition-all cursor-pointer border-2 flex flex-col justify-between gap-4 overflow-hidden w-full ${
                    isSelected
                      ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/50 shadow-2xl'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-white/15 hover:border-emerald-400/50'
                  }`}
                >
                  {/* Card Top Header — Uniform Height & Spacing */}
                  <div className="flex items-start justify-between gap-3 w-full">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${theme.badgeBg}`}
                      >
                        <span>{meta.icon}</span>
                        <span>{theme.containerTitleHi}</span>
                      </span>
                      <div className="text-xs font-bold text-slate-300 mt-1.5">
                        {theme.packagingSubtitleHi} • कुल {silo.itemsCount} आइटम
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="px-3 py-1 rounded-xl bg-slate-800 border border-white/15 font-mono font-black text-xs sm:text-sm text-amber-300">
                        {silo.fillPercent}% भरा
                      </span>
                    </div>
                  </div>

                  {/* Card Center — Fixed-Size Graphic Frame on Left + Symmetrical 2x2 Telemetry Grid on Right */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full bg-slate-950/75 p-3.5 rounded-2xl border border-white/10">
                    <MasterCategoryGraphic
                      category={silo.category}
                      fillPercent={silo.fillPercent}
                      totalCurrent={silo.totalCurrent}
                      primaryUnit={silo.primaryUnit}
                    />

                    {/* Symmetrical 2x2 Stats Grid */}
                    <div className="w-full flex-1 grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col justify-between min-h-[72px]">
                        <span className="text-[11px] font-bold text-slate-400">
                          गोदाम में बचा:
                        </span>
                        <span
                          className={`text-base sm:text-lg font-mono font-black ${theme.textAccent} tabular-nums`}
                        >
                          {silo.totalCurrent} {silo.primaryUnit}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col justify-between min-h-[72px]">
                        <span className="text-[11px] font-bold text-slate-400">
                          कुल स्टॉक कीमत:
                        </span>
                        <span className="text-base sm:text-lg font-mono font-black text-amber-300 tabular-nums">
                          ₹{silo.totalValue.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col justify-between min-h-[72px]">
                        <span className="text-[11px] font-bold text-slate-400">
                          कुल आया (+):
                        </span>
                        <span className="text-sm sm:text-base font-mono font-black text-emerald-300 tabular-nums">
                          +{silo.totalCapacity} {silo.primaryUnit}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900/90 border border-white/10 flex flex-col justify-between min-h-[72px]">
                        <span className="text-[11px] font-bold text-slate-400">
                          {silo.category === 'grain'
                            ? 'मंडी में बेचा (-):'
                            : 'खेत में लगा (-):'}
                        </span>
                        <span className="text-sm sm:text-base font-mono font-black text-sky-300 tabular-nums">
                          -{silo.category === 'grain' ? silo.totalSold : silo.totalUsed}{' '}
                          {silo.primaryUnit}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer — Symmetrical Status Bar */}
                  <div className="w-full pt-1 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>
                      {isSelected
                        ? '✅ यह विभाग खुला है (सभी आइटम देखने हेतु फिर टैप करें)'
                        : '🔍 इस विभाग के आइटम फिल्टर करने के लिए टैप करें'}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-black shrink-0 ${
                        silo.fillPercent < 25
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {silo.fillPercent < 25 ? '⚠️ कम स्टॉक' : '🟢 पर्याप्त स्टॉक'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* ==================== 3. BIG SYMMETRICAL INDIVIDUAL ITEM PACKAGING CARDS ==================== */}
      {activeStockView === 'godown' && (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>🛍️</span>
              <span>
                गोदाम का ताज़ा स्टॉक — बड़े और साफ़ आइटम कार्ड्स ({filteredStockItems.length})
              </span>
            </h3>
          </div>

          {/* Symmetrical Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-amber-300 dark:bg-amber-400 dark:text-slate-950 shadow-sm'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              सारा गोदाम ({stockItems.length})
            </button>
            {(['khad', 'beej', 'spray', 'grain'] as StockCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {STOCK_CATEGORY_META[cat].icon} {STOCK_CATEGORY_META[cat].shortHi}
              </button>
            ))}
          </div>
        </div>

        {/* BIG SYMMETRICAL 2-COLUMN ITEM CARDS (grid-cols-1 lg:grid-cols-2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredStockItems.map((item) => {
            const meta = STOCK_CATEGORY_META[item.category];
            const maxCap = Math.max(
              item.totalPurchasedOrHarvested,
              item.currentStock,
              1
            );
            const rawPercent = Math.round((item.currentStock / maxCap) * 100);
            const fillPercent =
              item.currentStock <= 0 ? 0 : Math.min(100, Math.max(8, rawPercent));
            const isLow =
              item.currentStock <= (item.category === 'grain' ? 2 : 1) ||
              rawPercent <= 20;

            const packagingTypeBadge =
              item.unit === 'bag'
                ? '🛍️ बोरी / कट्टे (Stacked Bags)'
                : item.unit === 'litre'
                ? '🍾 केमिकल बोतल (Spray Bottle)'
                : item.unit === 'packet'
                ? '🧧 फॉयल पैकेट (Sealed Pouch)'
                : item.unit === 'kg'
                ? '🪣 किलो ड्रम / थैली (Kg Drum)'
                : '🛢️ अनाज साइलो (Grain Silo)';

            return (
              <div
                key={item.id}
                className={`rounded-3xl bg-white dark:bg-slate-900 border-2 p-4 sm:p-5 shadow-lg flex flex-col justify-between gap-4 transition-all w-full ${
                  isLow
                    ? 'border-rose-500/70 dark:border-rose-500/70'
                    : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/60'
                }`}
              >
                {/* 1. Uniform Item Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${meta.badgeClass}`}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.shortHi}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {packagingTypeBadge}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-2 leading-snug">
                      {item.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingStockItem(item)}
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-amber-400 hover:text-slate-950 cursor-pointer transition-colors"
                      title="स्टॉक व पैकेजिंग एडिट करें"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStockItem(item.id)}
                      className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white cursor-pointer transition-colors"
                      title="हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Spacious Center Showcase: Item Graphic on Left + Symmetrical 2x2 Telemetry Grid on Right */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950 text-white border border-slate-800">
                  <ItemPackagingGraphic
                    item={item}
                    fillPercent={fillPercent}
                    rawPercent={rawPercent}
                    isLow={isLow}
                  />

                  {/* Symmetrical 2x2 Telemetry Grid */}
                  <div className="w-full flex-1 grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between min-h-[78px]">
                      <span className="text-[11px] font-bold text-slate-400">
                        गोदाम में बचा स्टॉक:
                      </span>
                      <span
                        className={`text-lg sm:text-xl font-mono font-black leading-none tabular-nums ${
                          isLow ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {item.currentStock} {item.unitLabelHi}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isLow ? '⚠️ स्टॉक कम है' : `🟢 ${rawPercent}% भरा है`}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between min-h-[78px]">
                      <span className="text-[11px] font-bold text-slate-400">
                        कुल कीमत व रेट:
                      </span>
                      <span className="text-lg sm:text-xl font-mono font-black text-amber-300 leading-none tabular-nums">
                        ₹
                        {Math.round(
                          item.currentStock * item.ratePerUnit
                        ).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        दर: ₹{item.ratePerUnit}/{item.unitLabelHi}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between min-h-[74px]">
                      <span className="text-[11px] font-bold text-slate-400">
                        कुल आया / खरीदा (+):
                      </span>
                      <span className="text-base font-mono font-black text-emerald-300 tabular-nums">
                        +{item.totalPurchasedOrHarvested} {item.unitLabelHi}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between min-h-[74px]">
                      <span className="text-[11px] font-bold text-slate-400">
                        खेत में लगा / बेचा (-):
                      </span>
                      <div className="flex items-center justify-between gap-1 text-xs font-mono font-black">
                        <span className="text-amber-300">
                          खेत: -{item.totalUsedInFarm}
                        </span>
                        <span className="text-sky-300">
                          बेचा: -{item.totalSold}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Symmetrical 3-Column Action Buttons */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectStockItemForAction(item, 'use_in_acre');
                      const el = document.getElementById('silo-action-form');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="py-2.5 px-2 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-800 dark:text-amber-300 hover:text-slate-950 text-xs font-black cursor-pointer transition-colors text-center"
                  >
                    🌾 खेत में डालें
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectStockItemForAction(item, 'purchase_in');
                      const el = document.getElementById('silo-action-form');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="py-2.5 px-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-slate-950 text-xs font-black cursor-pointer transition-colors text-center"
                  >
                    ➕ और खरीदें
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectStockItemForAction(item, 'sell_out');
                      const el = document.getElementById('silo-action-form');
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="py-2.5 px-2 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-800 dark:text-sky-300 hover:text-slate-950 text-xs font-black cursor-pointer transition-colors text-center"
                  >
                    💰 बेचें
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ==================== 4. STOCK IN / USE IN ACRE / SELL ACTION FORM (SYMMETRICAL LAYOUT) ==================== */}
      {activeStockView === 'godown' && (
      <div
        id="silo-action-form"
        className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 p-4 sm:p-6 shadow-xl space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
              गोदाम स्टॉक एंट्री फॉर्म (खरीद / खेत में प्रयोग / मंडी बिक्री)
            </h3>
            <SectionHelpPopup
              compact
              titleHi="गोदाम स्टॉक एंट्री फॉर्म गाइड"
              bulletsHi={[
                '"🌾 खेत में इस्तेमाल" चुनने पर स्टॉक घटेगा और चुने गए एकड़ के हिसाब में जुड़ जाएगा (बिना डबल-काउंटिंग)।',
                '"📥 नई खरीद / उपज जमा" चुनने पर गोदाम में स्टॉक बढ़ेगा।',
                '"💰 अनाज / स्टॉक बेचें" चुनने पर स्टॉक घटेगा और मंडी आढ़ती खाते में बिक्री जमा हो जाएगी।',
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFormDrawer(!showFormDrawer)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {showFormDrawer ? '🔼 फॉर्म छोटा करें (Collapse)' : '🔽 फॉर्म खोलें (Expand)'}
          </button>
        </div>

        {showFormDrawer && (
          <>
            {/* 3 Big Symmetrical Mode Switcher Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setActionMode('use_in_acre')}
                className={`p-3.5 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  actionMode === 'use_in_acre'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                }`}
              >
                <Sprout className="w-4 h-4 shrink-0" />
                <span>🌾 1. खेत में इस्तेमाल (स्टॉक घटेगा -)</span>
              </button>

              <button
                type="button"
                onClick={() => setActionMode('purchase_in')}
                className={`p-3.5 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  actionMode === 'purchase_in'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                }`}
              >
                <PackagePlus className="w-4 h-4 shrink-0" />
                <span>📥 2. नई खरीद / उपज जमा (स्टॉक बढ़ेगा +)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionMode('sell_out');
                  setFormCategory('grain');
                }}
                className={`p-3.5 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  actionMode === 'sell_out'
                    ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent'
                }`}
              >
                <TrendingDown className="w-4 h-4 shrink-0" />
                <span>💰 3. अनाज / स्टॉक बेचें (स्टॉक घटेगा -)</span>
              </button>
            </div>

            <form onSubmit={handleSubmitStockAction} className="space-y-4">
              {/* Step A: Pick existing Stock Item or Quick Template — Symmetrical Cards */}
              <div className="space-y-2.5">
                <label className="block text-xs sm:text-sm font-black text-slate-700 dark:text-slate-300">
                  {actionMode === 'purchase_in'
                    ? '🛍️ आइटम चुनें (किस सामान की खरीद या आवक हुई?):'
                    : actionMode === 'use_in_acre'
                    ? '📦 गोदाम स्टॉक में से आइटम चुनें:'
                    : '🌾 बिक्री का आइटम चुनें:'}
                </label>

                {actionMode === 'purchase_in' && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {(['khad', 'beej', 'spray', 'grain'] as StockCategory[]).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormCategory(cat);
                            const first = QUICK_STOCK_TEMPLATES[cat][0];
                            if (first) {
                              setItemName(first.name);
                              setUnit(first.unit);
                              setRatePerUnit(String(first.defaultRate));
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                            formCategory === cat
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {STOCK_CATEGORY_META[cat].icon}{' '}
                          {STOCK_CATEGORY_META[cat].shortHi}
                        </button>
                      )
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(actionMode === 'purchase_in'
                    ? QUICK_STOCK_TEMPLATES[formCategory]
                    : stockItems
                  ).map((entry: any) => {
                    const isExistingStock = 'currentStock' in entry;
                    const isSelected = isExistingStock
                      ? selectedStockId === entry.id || itemName === entry.name
                      : itemName === entry.name;

                    return (
                      <button
                        key={entry.id || entry.name}
                        type="button"
                        onClick={() => {
                          if (isExistingStock) {
                            setSelectedStockId(entry.id);
                            setFormCategory(entry.category);
                            setItemName(entry.name);
                            setUnit(entry.unit);
                            setRatePerUnit(String(entry.ratePerUnit));
                          } else {
                            setItemName(entry.name);
                            setUnit(entry.unit);
                            setRatePerUnit(String(entry.defaultRate));
                          }
                        }}
                        className={`p-3.5 rounded-2xl border-2 text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500 text-slate-900 dark:text-white shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-black leading-snug">
                            {entry.name}
                          </div>
                          {isExistingStock ? (
                            <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
                              बचा स्टॉक: {entry.currentStock} {entry.unitLabelHi}
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-slate-500 mt-1">
                              ~₹{entry.defaultRate}/
                              {UNIT_LABELS_HI[entry.unit as StockItem['unit']]}
                            </div>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-slate-900/10 dark:bg-white/10 text-xs font-mono font-black shrink-0">
                          {isSelected ? '✅ चुना' : 'चुनें'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step B: If Use in Acre, show Circular Acre Scroller + Reason Note */}
              {actionMode === 'use_in_acre' && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
                      🌾 किस एकड़ में यह खाद/बीज/स्प्रे लगा? (चुनें):
                    </span>
                    {store.plots.length > 1 && (
                      <select
                        value={selectedPlotName}
                        onChange={(e) => setSelectedPlotName(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                      >
                        {store.plots.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Circular Acre Story Tiles */}
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {activeSubPlots.map((sp) => {
                      const isSel =
                        String(selectedAcreNum) === String(sp.acreNumber);
                      return (
                        <button
                          key={sp.id}
                          type="button"
                          onClick={() =>
                            setSelectedAcreNum(String(sp.acreNumber))
                          }
                          className={`w-13 h-13 rounded-full font-mono font-black text-xs shrink-0 flex flex-col items-center justify-center border-2 cursor-pointer transition-all ${
                            isSel
                              ? 'bg-amber-400 text-slate-950 border-white scale-105 shadow-md'
                              : 'bg-slate-900 text-white border-slate-700 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <span>#{sp.acreNumber}</span>
                          <span className="text-[9px] font-sans">एकड़</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Reason Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      💡 कार्य / कारण (Reason):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_EXPENSE_REASONS_HI.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setReasonNote(r);
                            setCustomReason('');
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            reasonNote === r && !customReason
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="या अपनी वजह लिखें (जैसे: इस एकड़ में कलर/नमी ज्यादा थी इसलिए आधा बैग फालतू लगा)..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step C: Symmetrical 2x2 Grid for Item Name, Quantity + Packaging, Rate, Date + Party */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    📦 1. सामान का नाम (Item Name):
                  </label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    ⚖️ 2. मात्रा व पैकेजिंग ({UNIT_LABELS_HI[unit]}):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.25"
                      min="0.25"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-emerald-500 text-base font-mono font-black text-slate-900 dark:text-white"
                    />
                    <select
                      value={unit}
                      onChange={(e) =>
                        setUnit(e.target.value as StockItem['unit'])
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold"
                    >
                      <option value="bag">🛍️ बैग/कट्टा</option>
                      <option value="litre">🍾 बोतल (लीटर)</option>
                      <option value="packet">🧧 पैकेट/पाउच</option>
                      <option value="kg">🪣 किलो (ड्रम)</option>
                      <option value="quintal">🛢️ क्विंटल (साइलो)</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {['0.5', '1', '1.5', '2', '5'].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-mono font-bold hover:bg-amber-400 hover:text-slate-950 cursor-pointer"
                      >
                        {q === '0.5' ? 'आधा (0.5)' : q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    💰 3. प्रति यूनिट रेट (₹ / {UNIT_LABELS_HI[unit]}):
                  </label>
                  <input
                    type="number"
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                    📅 4. तारीख व दुकान/पार्टी का नाम:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder={
                        actionMode === 'sell_out'
                          ? 'आढ़ती / व्यापारी'
                          : 'दुकान / मजदूर'
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    actionMode === 'use_in_acre'
                      ? 'bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950'
                      : actionMode === 'purchase_in'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950'
                      : 'bg-gradient-to-r from-sky-400 to-indigo-500 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    {actionMode === 'use_in_acre'
                      ? `🌾 एकड़ #${selectedAcreNum} में डालें व स्टॉक घटाएं (-${quantity} ${UNIT_LABELS_HI[unit]})`
                      : actionMode === 'purchase_in'
                      ? `📥 गोदाम स्टॉक में जोड़ें (+${quantity} ${UNIT_LABELS_HI[unit]})`
                      : `💰 बिक्री सेव करें व स्टॉक घटाएं (-${quantity} ${UNIT_LABELS_HI[unit]})`}
                  </span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
      )}

      {/* ==================== 5. BIG SYMMETRICAL PER-ACRE COST & "WHY HIGHER EXPENSE" ANALYZER ==================== */}
      {activeStockView === 'acre_compare' && (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-500/40 p-4 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
              <Info className="w-3.5 h-3.5" />
              <span>बिना डबल-काउंटिंग • प्रति-एकड़ तुलना</span>
            </div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              🔍 किस एकड़ में कितना खर्च हुआ और क्यों ज्यादा हुआ?
            </h3>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-500 block">
              प्रति एकड़ औसत खर्च (Active Avg):
            </span>
            <span className="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₹{acreDiagnostics.averagePerActiveAcre.toLocaleString('en-IN')} / एकड़
            </span>
          </div>
        </div>

        {/* BIG SYMMETRICAL 2-COLUMN ACRE DIAGNOSTIC CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {acreDiagnostics.items.map((ac) => (
            <div
              key={ac.acreId}
              className={`p-4 sm:p-5 rounded-3xl border-2 flex flex-col justify-between gap-3 ${
                ac.isHigherThanAvg
                  ? 'bg-rose-500/5 border-rose-500/50'
                  : ac.totalExpense > 0
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-85'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-900 text-amber-300 font-mono font-black text-xs sm:text-sm">
                    एकड़ #{ac.acreNumber}
                  </span>
                  {ac.isHigherThanAvg ? (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-black text-rose-600 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>+₹{ac.diffFromAverage.toLocaleString('en-IN')} अधिक</span>
                    </span>
                  ) : ac.totalExpense > 0 ? (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-xs font-black text-emerald-700 dark:text-emerald-300">
                      🟢 सामान्य खर्च
                    </span>
                  ) : null}
                </div>
                <span className="text-lg sm:text-xl font-mono font-black text-slate-900 dark:text-white tabular-nums">
                  ₹{ac.totalExpense.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    🚜 मशीनरी
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white tabular-nums">
                    ₹{ac.machineryCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    🖐️ लेबर
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white tabular-nums">
                    ₹{ac.labourCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    🧪 खाद/बीज
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-white tabular-nums">
                    ₹{ac.materialCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {ac.reasons.length > 0 ? (
                <div className="space-y-1 pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                  <span className="text-[11px] font-black text-slate-500 uppercase block">
                    खर्च का कारण (Reason Log):
                  </span>
                  {ac.reasons.slice(0, 3).map((rsn, idx) => (
                    <p
                      key={idx}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug"
                    >
                      • {rsn}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800">
                  अभी इस एकड़ में कोई खर्च दर्ज नहीं है।
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      )}

      {/* ==================== 6. STOCK MOVEMENT REGISTER (आवक-जावक रजिस्टर) ==================== */}
      {activeStockView === 'history' && (
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-md space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>गोदाम स्टॉक आवक-जावक रजिस्टर (Stock Movement History)</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500 shrink-0">
            कुल {stockMovements.length} एंट्री
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {stockMovements.map((mov) => {
            const isIn =
              mov.movementType === 'purchase_in' ||
              mov.movementType === 'harvest_in';
            return (
              <div
                key={mov.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                      isIn
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isIn ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                      <span>{mov.itemName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black ${
                          isIn
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isIn ? `+${mov.quantity}` : `-${mov.quantity}`}{' '}
                        {mov.unitLabelHi}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {mov.movementType === 'use_in_acre'
                        ? `🌾 एकड़ #${mov.acreNumber || '1'} में प्रयोग • ${
                            mov.reasonOrNote || ''
                          }`
                        : mov.movementType === 'sell_out'
                        ? `💰 बिक्री (${mov.partyName || 'मंडी'}) • ${
                            mov.reasonOrNote || ''
                          }`
                        : `📥 गोदाम खरीद/आवक (${mov.partyName || 'दुकान'}) • ${
                            mov.reasonOrNote || ''
                          }`}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-mono font-black text-slate-900 dark:text-white block tabular-nums">
                    ₹{mov.totalValue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {mov.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Edit Stock Item Modal (Includes Packaging / Graphic Type Switcher!) */}
      {editingStockItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setEditingStockItem(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveEditedStockItem}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-400 p-5 shadow-2xl space-y-3"
          >
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              ✏️ स्टॉक व ग्राफिकल पैकेजिंग एडिट करें: {editingStockItem.name}
            </h4>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                📦 ग्राफिकल पैकेजिंग प्रकार (Packaging Graphic Type):
              </label>
              <select
                value={editingStockItem.unit}
                onChange={(e) => {
                  const nextU = e.target.value as StockItem['unit'];
                  setEditingStockItem({
                    ...editingStockItem,
                    unit: nextU,
                    unitLabelHi: UNIT_LABELS_HI[nextU] || nextU,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-black"
              >
                <option value="bag">🛍️ बोरी / कट्टे की चट्टी (Bags Stack)</option>
                <option value="litre">🍾 केमिकल बोतल / कैन (Spray Bottle)</option>
                <option value="packet">🧧 सीलबंद फॉयल पैकेट / पाउच (Packet/Pouch)</option>
                <option value="kg">🪣 किलो ड्रम / बाल्टी (Kg Drum)</option>
                <option value="quintal">🛢️ अनाज साइलो कोठी (Grain Silo)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                बचा हुआ स्टॉक ({editingStockItem.unitLabelHi}):
              </label>
              <input
                type="number"
                step="0.25"
                value={editingStockItem.currentStock}
                onChange={(e) =>
                  setEditingStockItem({
                    ...editingStockItem,
                    currentStock: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                प्रति यूनिट रेट (₹):
              </label>
              <input
                type="number"
                value={editingStockItem.ratePerUnit}
                onChange={(e) =>
                  setEditingStockItem({
                    ...editingStockItem,
                    ratePerUnit: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-black"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStockItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black cursor-pointer"
              >
                💾 सेव करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
