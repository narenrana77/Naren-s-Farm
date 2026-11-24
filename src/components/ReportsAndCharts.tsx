import React, { useState, useMemo } from 'react';
import { FarmDataStore } from '../types/farm';
import {
  formatDateDDMMYYYY,
  calculateFasalAgeAndStage,
  isAcreEmptyOrWet,
} from '../utils/acreUtils';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  LineChart as LineIcon, 
  Calendar, 
  Download, 
  Filter, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  Layers,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  exportFarmDataToExcel,
  exportFarmDataToCSV,
  exportFarmDataToPDF,
} from '../utils/exportUtils';
import { SectionHelpPopup } from './SectionHelpPopup';

interface ReportsAndChartsProps {
  store: FarmDataStore;
  language: 'hi' | 'en';
}

export const ReportsAndCharts: React.FC<ReportsAndChartsProps> = ({ store, language }) => {
  const [chartType, setChartType] = useState<'donut' | 'bar' | 'line'>('donut');
  const [selectedSeason, setSelectedSeason] = useState<string>('rabi_2026');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Compute expenses by category
  const machineryTotal = store.machineryRecords.reduce((acc, r) => acc + r.totalAmount, 0);
  const labourTotal = store.labourRecords.reduce((acc, r) => acc + r.totalAmount, 0);
  
  const seedTotal = store.materialRecords.filter((r) => r.type === 'seed').reduce((acc, r) => acc + r.totalAmount, 0);
  const fertiliserTotal = store.materialRecords.filter((r) => r.type === 'fertiliser').reduce((acc, r) => acc + r.totalAmount, 0);
  const pesticideTotal = store.materialRecords.filter((r) => r.type === 'pesticide').reduce((acc, r) => acc + r.totalAmount, 0);
  const materialsTotal = seedTotal + fertiliserTotal + pesticideTotal;

  const totalExpense = machineryTotal + labourTotal + materialsTotal;

  // Income from Aadti Credit (Crops sold)
  const totalCropSales = store.aadtiRecords
    .filter((r) => r.type === 'credit')
    .reduce((acc, r) => acc + r.amount, 0);

  const netFarmProfit = totalCropSales - totalExpense;

  // Plot-wise expense calculation
  const plotExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    store.plots.forEach((p) => { map[p.name] = 0; });

    store.machineryRecords.forEach((r) => {
      map[r.plotName] = (map[r.plotName] || 0) + r.totalAmount;
    });
    store.labourRecords.forEach((r) => {
      map[r.plotName] = (map[r.plotName] || 0) + r.totalAmount;
    });
    store.materialRecords.forEach((r) => {
      if (r.plotName) {
        map[r.plotName] = (map[r.plotName] || 0) + r.totalAmount;
      }
    });

    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [store]);

  // Machinery breakdown by activity
  const machineryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    store.machineryRecords.forEach((r) => {
      map[r.activity] = (map[r.activity] || 0) + r.totalAmount;
    });
    return Object.entries(map).map(([activity, amount]) => ({ activity, amount }));
  }, [store.machineryRecords]);

  // Historical Seasons Comparison Summary
  const historicalSeasons = [
    { season: 'Rabi 2026 (चालू सीजन)', crop: 'Wheat & Mustard', totalAcres: 16.5, costPerAcre: Math.round(totalExpense / 16.5), totalCost: totalExpense, income: totalCropSales, netYield: 'Estimated 24 Qtl/Acre' },
    { season: 'Kharif 2025 (पिछला धान)', crop: 'Basmati 1509 Paddy', totalAcres: 14.0, costPerAcre: 15400, totalCost: 215600, income: 335800, netYield: '22.5 Qtl/Acre' },
    { season: 'Rabi 2025 (गेहूं पिछला वर्ष)', crop: 'Wheat HD-2967', totalAcres: 16.0, costPerAcre: 12200, totalCost: 195200, income: 388000, netYield: '23.2 Qtl/Acre' },
  ];

  const handlePrint = () => {
    window.print();
  };

  // Pie chart segments calculation
  const categoriesData = [
    { name: 'मशीनरी (Machinery)', value: machineryTotal, color: '#10B981', pct: totalExpense > 0 ? (machineryTotal / totalExpense) * 100 : 0 },
    { name: 'मजदूरी (Labour)', value: labourTotal, color: '#3B82F6', pct: totalExpense > 0 ? (labourTotal / totalExpense) * 100 : 0 },
    { name: 'बीज (Seeds)', value: seedTotal, color: '#F59E0B', pct: totalExpense > 0 ? (seedTotal / totalExpense) * 100 : 0 },
    { name: 'उर्वरक/खाद (Fertilisers)', value: fertiliserTotal, color: '#8B5CF6', pct: totalExpense > 0 ? (fertiliserTotal / totalExpense) * 100 : 0 },
    { name: 'कीटनाशक (Pesticides)', value: pesticideTotal, color: '#EC4899', pct: totalExpense > 0 ? (pesticideTotal / totalExpense) * 100 : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Excel & PDF Export + Help Popup */}
      <div className="glass-panel rounded-3xl p-6 border border-white/40 dark:border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>{language === 'hi' ? 'विश्लेषण व लेखा रिपोर्ट (Excel & PDF Export)' : 'Analytics & Financial Reports'}</span>
            <SectionHelpPopup
              compact
              titleHi="रिपोर्ट्स, चार्ट्स व Excel / PDF डाउनलोड गाइड"
              bulletsHi={[
                'यहाँ आप पूरे फार्म का खर्च (मशीनरी, स्प्रे/छींटा, खाद/बीज) पाई चार्ट, बार चार्ट और लाइन चार्ट में देख सकते हैं।',
                '"📊 Excel (.xls) डाउनलोड" दबाकर पूरा डेटा माइक्रोसॉफ्ट एक्सेल में खोल सकते हैं।',
                '"📑 PDF रिपोर्ट डाउनलोड" दबाकर साफ-सुथरी प्रिंटेड पीडीएफ फाइल सेव कर सकते हैं।',
              ]}
            />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
            {language === 'hi' ? 'खर्च, उपज व मुनाफा विश्लेषण' : 'Expenses, Yield & Profit Reports'}
          </h2>
        </div>

        {/* Excel (.xls), CSV & PDF Export buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportFarmDataToExcel(store)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>📊 Excel (.xls) डाउनलोड</span>
          </button>
          <button
            type="button"
            onClick={() => exportFarmDataToCSV(store)}
            className="px-3.5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>📄 CSV (Sheets)</span>
          </button>
          <button
            type="button"
            onClick={() => exportFarmDataToPDF(store)}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span>📑 PDF रिपोर्ट डाउनलोड / प्रिंट</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block uppercase font-medium">कुल कृषि खर्च (Total Expense)</span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums mt-1 block">
            ₹{totalExpense.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">सीजन रबी 2026</span>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block uppercase font-medium">फसल बिक्री (Crop Sales)</span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-800 dark:text-emerald-400 tabular-nums mt-1 block">
            ₹{totalCropSales.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">मंडी आढ़ती खाता क्रेडिट</span>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block uppercase font-medium">शुद्ध बचत / मुनाफा (Net Profit)</span>
          <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-1 block ${netFarmProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {netFarmProfit >= 0 ? '+' : ''}₹{netFarmProfit.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">कुल आय - कुल लागत</span>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block uppercase font-medium">प्रति एकड़ औसत लागत</span>
          <span className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-800 dark:text-sky-400 tabular-nums mt-1 block">
            ₹{Math.round(totalExpense / 16.5).toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">16.5 एकड़ कुल कृषि क्षेत्र</span>
        </div>
      </div>

      {/* Chart View Controls (Segmented Control conforming to §1.A for interactive tabs) */}
      <div className="glass-panel rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setChartType('donut')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              chartType === 'donut'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">पाई / डोनट</span>
          </button>

          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              chartType === 'bar'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="truncate">बार चार्ट</span>
          </button>

          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
              chartType === 'line'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LineIcon className="w-4 h-4 shrink-0" />
            <span className="truncate">लाइन चार्ट</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="py-2 px-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="rabi_2026">वर्तमान सीजन (रबी 2026)</option>
            <option value="kharif_2025">पिछला सीजन (खरीफ 2025)</option>
            <option value="all">संपूर्ण वित्तीय वर्ष (All Time)</option>
          </select>
        </div>
      </div>

      {/* Main Interactive Chart Display Box */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
        {/* DONUT / PIE CHART */}
        {chartType === 'donut' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* SVG Pie Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-64 h-64">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let cumulativePercent = 0;
                    return categoriesData.map((cat, i) => {
                      if (cat.pct <= 0) return null;
                      const strokeDasharray = `${cat.pct} ${100 - cat.pct}`;
                      const strokeDashoffset = -cumulativePercent;
                      cumulativePercent += cat.pct;
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="35"
                          fill="transparent"
                          stroke={cat.color}
                          strokeWidth="18"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          pathLength="100"
                          className="transition-all duration-700 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">कुल खर्च</span>
                  <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    ₹{totalExpense.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% लागत</span>
                </div>
              </div>
            </div>

            {/* Legend & Breakdown Table */}
            <div className="md:col-span-7 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                खर्च वितरण (Category Breakdown)
              </h4>
              <div className="space-y-2.5">
                {categoriesData.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                        {cat.name}
                      </span>
                    </div>

                    <div className="text-right flex items-center gap-4">
                      <span className="text-xs font-mono text-slate-500 tabular-nums">
                        {cat.pct.toFixed(1)}%
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        ₹{cat.value.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BAR CHART: PLOT-WISE & MACHINE BREAKDOWN */}
        {chartType === 'bar' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                खेत-वार कुल लागत विश्लेषण (Plot-by-Plot Cost Comparison)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                प्रत्येक खेत पर मशीनरी, बीज, खाद व मजदूरी का कुल खर्च
              </p>
            </div>

            {/* Horizontal Bar Visualizer */}
            <div className="space-y-4">
              {plotExpenses.map((plot, idx) => {
                const maxExpense = Math.max(...plotExpenses.map((p) => p.amount), 1);
                const pct = (plot.amount / maxExpense) * 100;
                const matchingPlot = store.plots.find(
                  (p) => p.name === plot.name || p.name.toLowerCase().includes(plot.name.toLowerCase().split('(')[0].trim())
                );
                const plotAcres = matchingPlot?.acres || 1;
                const costPerAcre = Math.round(plot.amount / plotAcres);

                return (
                  <div key={idx} className="space-y-1.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {plot.name}
                      </span>
                      <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
                        कुल ₹{plot.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-lg bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 transition-all duration-700"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>रकबा: {matchingPlot?.acres || '--'} एकड़</span>
                      <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                        प्रति एकड़ खर्च: ₹{costPerAcre.toLocaleString('en-IN')} / एकड़
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sub-table for Machinery breakdown */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm mb-3">
                मशीनरी कार्यवार खर्च (Jutayi, Rotavator, Seeder Breakdown)
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {machineryBreakdown.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-[11px] text-slate-500 block">{m.activity}</span>
                    <span className="text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                      ₹{m.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LINE CHART: MONTHLY CASH FLOW */}
        {chartType === 'line' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                मासिक खर्च व आय प्रवाह (Monthly Expense & Inflow Trend)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                बुवाई की तैयारी से लेकर कटाई तक के वित्तीय उतार-चढ़ाव
              </p>
            </div>

            {/* Simulated Line Wave */}
            <div className="h-48 w-full relative flex items-end justify-between pt-6 px-2 border-b border-l border-slate-200 dark:border-slate-800">
              {[
                { month: 'अगस्त (Aug)', exp: 12000, inc: 0 },
                { month: 'सितंबर (Sep)', exp: 18500, inc: 0 },
                { month: 'अक्टूबर (Oct)', exp: 45200, inc: 335800 },
                { month: 'नवंबर (Nov)', exp: 14800, inc: 0 },
                { month: 'दिसंबर (Dec)', exp: 8000, inc: 0 },
                { month: 'मार्च (Mar Exp)', exp: 15000, inc: 250000 },
              ].map((m, idx) => {
                const heightPct = Math.min(100, Math.max(15, (m.exp / 50000) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex justify-center">
                      <div
                        className="w-4 sm:w-6 bg-gradient-to-t from-emerald-600 to-lime-500 rounded-t-lg transition-all duration-500 group-hover:brightness-110"
                        style={{ height: `${heightPct * 1.4}px` }}
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-500 font-medium text-center">
                      {m.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PER-ACRE STATUS, SOWING METHOD, FASAL AGE & WORKER EXPENSE REPORT (Directly from Per-Acre Form) */}
      <div className="glass-panel rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-xl">
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
              📋 प्रति-एकड़ विस्तृत रिपोर्ट (Per-Acre Status, Sowing Method & Worker Expense Report)
            </span>
            <h3 className="font-black text-white text-base sm:text-lg">
              सभी खेतों का एकड़-वार स्टेटस, बुवाई तारीख (DD/MM/YYYY), फसल उम्र, बिजाई विधि व कामगार खर्च ब्यौरा
            </h3>
          </div>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold">
            याद किए गए कामगार रेट: {(store.vendorRates || []).length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[960px]">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">खेत व एकड़ #</th>
                <th className="py-3 px-4">1. Acre Status</th>
                <th className="py-3 px-4">2. Sowing Date (DD/MM/YYYY)</th>
                <th className="py-3 px-4">Fasal Age & Stage</th>
                <th className="py-3 px-4">3. Sowing Method</th>
                <th className="py-3 px-4">4. मशीनरी व कामगार (Worker, Rate & Date)</th>
                <th className="py-3 px-4 text-right">कुल दर्ज खर्च (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {store.plots.flatMap((plot) =>
                (plot.subPlots || []).map((sp) => {
                  const statusVal =
                    sp.acreStatus ||
                    (isAcreEmptyOrWet(sp) ? 'Empty' : 'Seeded');
                  const ageStage = calculateFasalAgeAndStage(
                    statusVal,
                    sp.sowingDate
                  );
                  const totalAcreExp =
                    (Number(sp.machineryExpense) || 0) +
                    (Number(sp.labourExpense) || 0) +
                    (Number(sp.materialExpense) || 0) ||
                    Number(sp.allocatedExpense) ||
                    0;
                  const entries = sp.expenseEntries || [];
                  return (
                    <tr
                      key={`${plot.id}-${sp.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div>{(plot.name || 'खेत').split('(')[0].trim()}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[11px] font-black">
                          एकड़ #{sp.acreNumber} ({sp.acres} Ac)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs inline-block ${
                            statusVal === 'Seeded'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40'
                              : statusVal === 'Cultivated'
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                              : statusVal === 'Irrigated (Rauni)'
                              ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40'
                              : 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40'
                          }`}
                        >
                          {statusVal}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatDateDDMMYYYY(sp.sowingDate)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono font-black text-emerald-700 dark:text-emerald-400">
                          {ageStage.days} दिन ({ageStage.fasalAgeText})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          {ageStage.stageLabelHi}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-700 dark:text-cyan-300">
                        {statusVal === 'Seeded'
                          ? sp.sowingMethod || 'Super Seeder'
                          : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {entries.length > 0 ? (
                          <div className="space-y-1">
                            {entries.map((e) => (
                              <div
                                key={e.id}
                                className="text-xs font-semibold text-slate-800 dark:text-slate-200"
                              >
                                🚜 <strong>{e.machineryOrJob}</strong> — कामगार:{' '}
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  {e.workerName}
                                </span>{' '}
                                (रेट ₹{e.rate}/एकड़ · {formatDateDDMMYYYY(e.date)})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            कोई खर्च दर्ज नहीं (₹0)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                        ₹{totalAcreExp.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Crop Yield & Cost Summary Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            ऐतिहासिक सीजन सारांश (Historical Crop & Financial Seasons)
          </h3>
          <span className="text-xs text-slate-500">रबी एवं खरीफ तुलना</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">सीजन (Season)</th>
                <th className="py-3 px-4">मुख्य फसल (Crop)</th>
                <th className="py-3 px-4 text-right">कुल रकबा (Acres)</th>
                <th className="py-3 px-4 text-right">कुल लागत (Expense)</th>
                <th className="py-3 px-4 text-right">प्रति एकड़ लागत</th>
                <th className="py-3 px-4 text-right">कुल बिक्री (Income)</th>
                <th className="py-3 px-4 text-right">शुद्ध लाभ (Profit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {historicalSeasons.map((s, idx) => {
                const profit = s.income - s.totalCost;
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {s.season}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {s.crop}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {s.totalAcres} एकड़
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                      ₹{s.totalCost.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      ₹{s.costPerAcre.toLocaleString('en-IN')}/एकड़
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      ₹{s.income.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-800 dark:text-emerald-300">
                      +₹{profit.toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
