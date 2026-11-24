import React, { useState, useMemo } from 'react';
import { FarmPlot, FarmDataStore, Language } from '../types/farm';
import { calculatePlotAcreAnalytics } from '../utils/acreUtils';
import {
  TrendingUp,
  DollarSign,
  Tractor,
  Users,
  Wheat,
  Layers,
  ArrowRight,
  Plus,
  Sliders,
  CheckCircle2,
  Calendar,
  Sparkles,
  Download,
  Filter
} from 'lucide-react';

interface PerAcreProfitLossViewProps {
  plots: FarmPlot[];
  store: FarmDataStore;
  language: Language;
  onOpenDemarcation: (plotId: string) => void;
  onNavigateToHisab?: (plotName: string) => void;
}

export const PerAcreProfitLossView: React.FC<PerAcreProfitLossViewProps> = ({
  plots,
  store,
  language,
  onOpenDemarcation,
  onNavigateToHisab,
}) => {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(plots[0]?.id || '');
  const [filterView, setFilterView] = useState<'all' | 'high_profit' | 'high_cost'>('all');

  const activePlot = plots.find((p) => p.id === selectedPlotId) || plots[0];

  // Calculate real acre analytics for this plot
  const analytics = useMemo(() => {
    if (!activePlot) return null;
    return calculatePlotAcreAnalytics(activePlot, store);
  }, [activePlot, store]);

  if (!analytics || !activePlot) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        कोई खेत उपलब्ध नहीं है। कृपया पहले एक खेत जोड़ें।
      </div>
    );
  }

  // Filtered sub-plots
  const filteredSubPlots = [...analytics.subPlots].sort((a, b) => {
    if (filterView === 'high_profit') return b.netProfit - a.netProfit;
    if (filterView === 'high_cost') return b.totalExpense - a.totalExpense;
    return 0;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Plot Switcher Bar */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/40 dark:border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>प्रति एकड़ खर्च एवं आमदनी विश्लेषण (Per-Acre P&L)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display mt-0.5">
            {activePlot.name}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {analytics.totalAcres} एकड़ चक में प्रत्येक 1-एकड़ का मशीनरी, मजदूरी, खाद-बीज खर्च और फसल बिक्री आमदनी का सूक्ष्म विश्लेषण।
          </p>
        </div>

        {/* Plot Selector + Demarcation Trigger Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 shadow-xs"
          >
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.acres} एकड़)
              </option>
            ))}
          </select>

          <button
            onClick={() => onOpenDemarcation(activePlot.id)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>एकड़ विभाजन बदलें</span>
          </button>
        </div>
      </div>

      {/* 2. Hero KPI Cards: Per-Acre Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Area */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>कुल रकबा</span>
            <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">📐</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {analytics.totalAcres} <span className="text-sm font-sans font-bold text-slate-500">एकड़</span>
            </div>
            <div className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold mt-1">
              {analytics.subPlots.length} टुकड़ों में विभाजित
            </div>
          </div>
        </div>

        {/* Card 2: Cost Per Acre */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>औसत खर्च / एकड़</span>
            <span className="p-1.5 rounded-xl bg-rose-500/10 text-rose-600">💸</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
              ₹{analytics.costPerAcre.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>कुल खर्च: ₹{analytics.totalExpense.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Income Per Acre */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>औसत आमदनी / एकड़</span>
            <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">🌾</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
              ₹{analytics.incomePerAcre.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              उपज: ~23.5 कुंतल/एकड़
            </div>
          </div>
        </div>

        {/* Card 4: Net Profit Per Acre */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-emerald-300/80 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/40 dark:to-slate-900/60 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-300">
            <span>शुद्ध मुनाफा / एकड़</span>
            <span className="p-1.5 rounded-xl bg-emerald-600 text-white shadow-xs">📈</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-400 font-mono">
              +₹{analytics.profitPerAcre.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-900 dark:text-emerald-300 font-bold mt-1">
              8.5 एकड़ कुल लाभ: +₹{analytics.netProfit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Per-Acre Cost Distribution Breakdown */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span>🚜 1-एकड़ में होने वाले खर्चों का अनुपात (Cost Breakdown per Acre)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
              <Tractor className="w-4 h-4 text-emerald-600" />
              <span>मशीनरी (Machinery)</span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
              ₹{Math.round(analytics.totalMachinery / analytics.totalAcres).toLocaleString('en-IN')} <span className="text-xs font-sans text-slate-500">/ एकड़</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">जुताई, रोटावेटर, सुपर सीडर व कंबाइन</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
              <Users className="w-4 h-4 text-blue-600" />
              <span>मजदूरी (Labour)</span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
              ₹{Math.round(analytics.totalLabour / analytics.totalAcres).toLocaleString('en-IN')} <span className="text-xs font-sans text-slate-500">/ एकड़</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">स्प्रे छिड़काव, निराई-गुड़ाई, सिंचाई मजदूरी</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <Wheat className="w-4 h-4 text-amber-600" />
              <span>खाद, बीज व स्प्रे (Materials)</span>
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1">
              ₹{Math.round(analytics.totalMaterials / analytics.totalAcres).toLocaleString('en-IN')} <span className="text-xs font-sans text-slate-500">/ एकड़</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">DAP, यूरिया, प्रमाणित बीज, कीटनाशक दवाएं</p>
          </div>
        </div>
      </div>

      {/* 4. Acre-by-Acre Comparison Cards Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              प्रत्येक एकड़ का अलग-अलग विवरण ({analytics.subPlots.length} एकड़ चक)
            </h4>
            <p className="text-xs text-slate-500">
              हर एकड़ की स्थिति, खर्च, फसल आमदनी और शुद्ध मुनाफे की तुलना करें:
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setFilterView('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterView === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              क्रम अनुसार
            </button>
            <button
              onClick={() => setFilterView('high_profit')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterView === 'high_profit'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              सर्वाधिक मुनाफा 📈
            </button>
            <button
              onClick={() => setFilterView('high_cost')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterView === 'high_cost'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              अधिक खर्च 💸
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSubPlots.map((sp) => (
            <div
              key={sp.id}
              className="glass-panel rounded-3xl p-4.5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3 hover:border-emerald-400/80 transition-all"
            >
              {/* Card Top */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold text-xs font-mono border border-emerald-500/30">
                    एकड़ #{sp.acreNumber} ({sp.acres} एकड़)
                  </span>

                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    लाभ: {sp.profitMarginPct}%
                  </span>
                </div>

                <h5 className="text-sm font-black text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                  {sp.name}
                </h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  फसल: {sp.cropVariety}
                </p>
              </div>

              {/* Financial Breakdown per parcel */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">कुल खर्च:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    ₹{sp.totalExpense.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">फसल आमदनी:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    ₹{sp.earnedIncome.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">शुद्ध लाभ:</span>
                  <span className="font-mono font-black text-emerald-800 dark:text-emerald-400 text-sm">
                    +₹{sp.netProfit.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Quick Actions for this acre */}
              <div className="flex items-center gap-2 pt-1">
                {onNavigateToHisab && (
                  <button
                    onClick={() => onNavigateToHisab(activePlot.name)}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>खर्च जोड़ें</span>
                  </button>
                )}

                <button
                  onClick={() => onOpenDemarcation(activePlot.id)}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                  title="विवरण बदलें"
                >
                  संपादित करें
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Comprehensive Per-Acre Table */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            प्रति एकड़ वित्तीय तुलना सारणी (Detailed Acre Ledger Table)
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            कुल: {analytics.totalAcres} एकड़
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                <th className="py-2.5 px-3">चक सं.</th>
                <th className="py-2.5 px-3">पहचान / मेड़</th>
                <th className="py-2.5 px-3">रकबा</th>
                <th className="py-2.5 px-3">मशीनरी (₹)</th>
                <th className="py-2.5 px-3">मजदूरी (₹)</th>
                <th className="py-2.5 px-3">खाद-बीज (₹)</th>
                <th className="py-2.5 px-3 font-bold text-rose-600">कुल खर्च</th>
                <th className="py-2.5 px-3">उपज (कुंतल)</th>
                <th className="py-2.5 px-3 font-bold text-blue-600">फसल आमदनी</th>
                <th className="py-2.5 px-3 font-bold text-emerald-600">शुद्ध मुनाफा</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.subPlots.map((sp) => (
                <tr key={sp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold font-mono">#{sp.acreNumber}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{sp.name}</td>
                  <td className="py-2.5 px-3 font-mono">{sp.acres} एकड़</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">₹{sp.machineryCost.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">₹{sp.labourCost.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">₹{sp.materialCost.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">₹{sp.totalExpense.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono">{sp.estimatedYieldQtl} Qtl</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">₹{sp.earnedIncome.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 font-mono font-black text-emerald-800 dark:text-emerald-400">
                    +₹{sp.netProfit.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold bg-slate-50/60 dark:bg-slate-800/60">
                <td className="py-3 px-3" colSpan={2}>सम्पूर्ण चक योग ({analytics.totalAcres} एकड़)</td>
                <td className="py-3 px-3 font-mono">{analytics.totalAcres} एकड़</td>
                <td className="py-3 px-3 font-mono">₹{analytics.totalMachinery.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 font-mono">₹{analytics.totalLabour.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 font-mono">₹{analytics.totalMaterials.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 font-mono text-rose-600 font-black">₹{analytics.totalExpense.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 font-mono">~{(analytics.totalAcres * 23.5).toFixed(1)} Qtl</td>
                <td className="py-3 px-3 font-mono text-blue-600 font-black">₹{analytics.totalCropIncome.toLocaleString('en-IN')}</td>
                <td className="py-3 px-3 font-mono text-emerald-800 dark:text-emerald-400 text-sm font-black">
                  +₹{analytics.netProfit.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
