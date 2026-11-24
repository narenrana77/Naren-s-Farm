import React, { useState } from 'react';
import {
  ALL_CROP_VARIETIES,
  CROP_CATEGORIES,
  CropVarietyItem,
} from '../constants/cropVarieties';
import { FarmPlot, Language } from '../types/farm';
import {
  Sprout,
  Search,
  X,
  Check,
  Flame,
  Droplets,
  TrendingUp,
  Clock,
} from 'lucide-react';

interface CropVarietiesExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plots: FarmPlot[];
  onAssignVarietyToPlot?: (plotId: string, varietyLabel: string) => void;
  language: Language;
}

export const CropVarietiesExplorerModal: React.FC<
  CropVarietiesExplorerModalProps
> = ({ isOpen, onClose, plots, onAssignVarietyToPlot, language }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetPlotId, setTargetPlotId] = useState<string>(
    plots[0]?.id || ''
  );
  const [assignedSuccessId, setAssignedSuccessId] = useState<string | null>(
    null
  );

  if (!isOpen) return null;

  const filteredVarieties = ALL_CROP_VARIETIES.filter((v) => {
    const matchesCat =
      selectedCategory === 'all' || v.categoryId === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      v.label.toLowerCase().includes(q) ||
      v.varietyCode.toLowerCase().includes(q) ||
      v.specialTraitsHi.toLowerCase().includes(q) ||
      v.cropNameHi.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleAssign = (item: CropVarietyItem) => {
    if (!onAssignVarietyToPlot || !targetPlotId) return;
    onAssignVarietyToPlot(targetPlotId, item.label);
    setAssignedSuccessId(item.id);
    setTimeout(() => setAssignedSuccessId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-5xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/30 dark:border-white/15 space-y-5 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-display flex items-center gap-2 flex-wrap">
                <span>
                  {language === 'hi'
                    ? '🌾 सभी फसलों की उन्नत किस्में (All Crop Varieties Directory)'
                    : '🌾 Complete Crop & Seed Varieties Directory'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  {ALL_CROP_VARIETIES.length} Varieties
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {language === 'hi'
                  ? 'गेहूं, बासमती व परमल धान, सरसों, गन्ना, कपास, मक्का, बाजरा, दलहन, सब्जियां एवं हरा चारा की सभी प्रमुख किस्में व पैदावार क्षमता'
                  : 'Browse all ICAR/PAU/IARI/HAU varieties with yield per acre, MSP/mandi rates, and 1-click assignment to your farm plots.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Target Plot Selector Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'किस्म खोजें (उदा. DBW 303, 1121, RH 725, Co 0238, आलू, मूंग...)'
                  : 'Search variety (e.g. DBW 303, Basmati 1121, RH 725, Co 0238...)'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {plots.length > 0 && onAssignVarietyToPlot && (
            <div className="md:col-span-6 flex items-center gap-2 bg-emerald-50/80 dark:bg-emerald-950/30 px-3.5 py-2 rounded-2xl border border-emerald-300/70 dark:border-emerald-800/60">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 whitespace-nowrap">
                {language === 'hi' ? 'खेत में सेट करें:' : 'Assign to Plot:'}
              </span>
              <select
                value={targetPlotId}
                onChange={(e) => setTargetPlotId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.split('(')[0].trim()} ({p.acres} एकड़ — {p.crop})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            🌟 सभी फसलें ({ALL_CROP_VARIETIES.length})
          </button>

          {CROP_CATEGORIES.map((cat) => {
            const count = ALL_CROP_VARIETIES.filter(
              (v) => v.categoryId === cat.id
            ).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{language === 'hi' ? cat.nameHi : cat.nameEn}</span>
                <span className="text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Varieties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 overflow-y-auto pr-1 flex-1">
          {filteredVarieties.map((item) => {
            const isAssigned = assignedSuccessId === item.id;
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 shadow-sm flex flex-col justify-between gap-3 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                      {item.season}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {item.durationDays}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                      {item.specialTraitsHi}
                    </p>
                  </div>

                  {item.avgYieldQtlPerAcre > 0 && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          औसत पैदावार / एकड़
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {item.avgYieldQtlPerAcre} क्विंटल
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          अनुमानित मंडी भाव
                        </span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          ₹{item.defaultMandiRatePerQtl.toLocaleString('en-IN')}/Qtl
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Weather Sensitivity Badges */}
                  <div className="flex items-center gap-2 text-[10px] flex-wrap pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5" />
                      गर्मी सहनशीलता: {item.weatherSensitivity.heatTolerance === 'high' ? 'उच्च' : item.weatherSensitivity.heatTolerance === 'medium' ? 'मध्यम' : 'संवेदनशील'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1">
                      <Droplets className="w-2.5 h-2.5" />
                      गिरने का जोखिम: {item.weatherSensitivity.lodgingRisk === 'low' ? 'कम (मजबूत तना)' : 'मध्यम'}
                    </span>
                  </div>
                </div>

                {onAssignVarietyToPlot && plots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAssign(item)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAssigned
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-emerald-500/15 hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/30'
                    }`}
                  >
                    {isAssigned ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>खेत में यह किस्म सेट हो गई!</span>
                      </>
                    ) : (
                      <>
                        <Sprout className="w-3.5 h-3.5" />
                        <span>चयनित खेत में यह किस्म लगाएं</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
