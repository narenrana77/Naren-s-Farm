import React, { useState, useEffect } from 'react';
import { FarmPlot, AcreSubPlot, PlotStage, Language } from '../types/farm';
import { generateAcreSubPlots } from '../utils/acreUtils';
import { ALL_CROP_VARIETIES } from '../constants/cropVarieties';
import {
  MapPin,
  X,
  Check,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Compass,
  RotateCcw,
  Edit3,
  AlertTriangle
} from 'lucide-react';

interface AcreDemarcationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plots: FarmPlot[];
  currentSelectedPlotId?: string;
  onSavePlot: (updatedPlot: FarmPlot, oldName?: string) => void;
  onAddNewPlot: (newPlot: FarmPlot) => void;
  onDeletePlot?: (plotId: string) => void;
  language: Language;
}

export const AcreDemarcationModal: React.FC<AcreDemarcationModalProps> = ({
  isOpen,
  onClose,
  plots,
  currentSelectedPlotId,
  onSavePlot,
  onAddNewPlot,
  onDeletePlot,
  language,
}) => {
  const [mode, setMode] = useState<'edit' | 'new'>('edit');
  const [selectedPlotId, setSelectedPlotId] = useState<string>(
    currentSelectedPlotId || plots[0]?.id || ''
  );
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const activePlot = plots.find((p) => p.id === selectedPlotId) || plots[0];

  // Form states
  const [plotName, setPlotName] = useState(activePlot?.name || 'खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)');
  const [totalAcres, setTotalAcres] = useState<number>(activePlot?.acres || 8.5);
  const [crop, setCrop] = useState(activePlot?.crop || 'Wheat (गेहूं - PBW 550)');
  const [stage, setStage] = useState<PlotStage>(activePlot?.stage || 'growing');
  const [lat, setLat] = useState<number>(activePlot?.coordinates?.lat || 29.6872);
  const [lng, setLng] = useState<number>(activePlot?.coordinates?.lng || 76.9890);

  // Sub-plots (parcels)
  const [subPlots, setSubPlots] = useState<AcreSubPlot[]>(
    activePlot?.subPlots && activePlot.subPlots.length > 0
      ? activePlot.subPlots
      : generateAcreSubPlots(activePlot?.id || 'plot-1', plotName, totalAcres, lat, lng, crop)
  );

  // Sync modal state whenever it opens or currentSelectedPlotId changes
  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    setMode('edit');
    const targetId = currentSelectedPlotId || plots[0]?.id || '';
    setSelectedPlotId(targetId);
    const p = plots.find((item) => item.id === targetId) || plots[0];
    if (p) {
      setPlotName(p.name);
      setTotalAcres(p.acres);
      setCrop(p.crop);
      setStage(p.stage || 'growing');
      setLat(p.coordinates?.lat || 29.6872);
      setLng(p.coordinates?.lng || 76.9890);
      setSubPlots(
        p.subPlots && p.subPlots.length > 0
          ? p.subPlots
          : generateAcreSubPlots(p.id, p.name, p.acres, p.coordinates?.lat, p.coordinates?.lng, p.crop)
      );
    }
  }, [isOpen, currentSelectedPlotId, plots]);

  // When plot selection changes in dropdown
  const handleSelectPlotChange = (id: string) => {
    setConfirmDelete(false);
    setSelectedPlotId(id);
    const p = plots.find((item) => item.id === id);
    if (p) {
      setPlotName(p.name);
      setTotalAcres(p.acres);
      setCrop(p.crop);
      setStage(p.stage || 'growing');
      setLat(p.coordinates?.lat || 29.6872);
      setLng(p.coordinates?.lng || 76.9890);
      setSubPlots(
        p.subPlots && p.subPlots.length > 0
          ? p.subPlots
          : generateAcreSubPlots(p.id, p.name, p.acres, p.coordinates?.lat, p.coordinates?.lng, p.crop)
      );
    }
  };

  // 1-Click Auto Divide into 1-Acre Segments
  const handleAutoDivide = () => {
    const id = mode === 'new' ? 'plot-' + Date.now() : selectedPlotId;
    const generated = generateAcreSubPlots(id, plotName, totalAcres, lat, lng, crop);
    setSubPlots(generated);
  };

  // Update an individual acre
  const handleUpdateSubPlot = (idx: number, field: keyof AcreSubPlot, value: any) => {
    const updated = [...subPlots];
    const current = { ...updated[idx], [field]: value };
    // Auto-recompute earnedIncome if yield or rate changes
    if (field === 'estimatedYieldQtl') {
      const rate = current.grainRatePerQtl || 2275;
      current.earnedIncome = Math.round(Number(value) * rate);
    }
    updated[idx] = current;
    setSubPlots(updated);
  };

  // Add custom sub-parcel
  const handleAddCustomAcre = () => {
    const nextNum = subPlots.length + 1;
    const newParcel: AcreSubPlot = {
      id: `${selectedPlotId}-acre-${Date.now()}`,
      acreNumber: `${nextNum}`,
      name: `एकड़ ${nextNum} (नया चक)`,
      acres: 1.0,
      cropVariety: crop,
      soilHealth: 90,
      moisturePct: 75,
      allocatedExpense: 13850,
      estimatedYieldQtl: 23.5,
      grainRatePerQtl: 2275,
      earnedIncome: Math.round(23.5 * 2275),
      coordinates: {
        lat: Number((lat + nextNum * 0.0004).toFixed(6)),
        lng: Number((lng + (nextNum % 3) * 0.0004).toFixed(6)),
      },
    };
    setSubPlots([...subPlots, newParcel]);
    setTotalAcres((prev) => Math.round((prev + 1.0) * 10) / 10);
  };

  // Remove acre parcel
  const handleRemoveSubPlot = (idx: number) => {
    const removedAcre = subPlots[idx].acres;
    const updated = subPlots.filter((_, i) => i !== idx);
    setSubPlots(updated);
    setTotalAcres((prev) => Math.max(0.5, Math.round((prev - removedAcre) * 10) / 10));
  };

  // Save the demarcated plot
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const oldName = activePlot?.name;
    const updatedPlotObj: FarmPlot = {
      id: mode === 'new' ? 'plot-' + Date.now() : selectedPlotId,
      name: plotName.trim(),
      crop: crop.trim(),
      acres: totalAcres,
      stage: stage || activePlot?.stage || 'growing',
      progressPct: activePlot?.progressPct || 65,
      soilHealth: activePlot?.soilHealth || 92,
      moisturePct: activePlot?.moisturePct || 78,
      sowingDate: activePlot?.sowingDate || new Date().toISOString().split('T')[0],
      expectedHarvestDate: activePlot?.expectedHarvestDate || '2026-04-15',
      currentActivity: activePlot?.currentActivity || 'प्रति एकड़ सीमांकन व निगरानी',
      notes: activePlot?.notes || `${totalAcres} एकड़ चक का प्रति एकड़ सीमांकन व खर्च/आमदनी विवरण।`,
      coordinates: { lat, lng },
      subPlots: subPlots,
    };

    if (mode === 'new') {
      onAddNewPlot(updatedPlotObj);
    } else {
      onSavePlot(updatedPlotObj, oldName);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/40 dark:border-white/10 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-display flex items-center gap-2 flex-wrap">
                <span>खेत (Plot) एडिट करें एवं प्रति-एकड़ विभाजन</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  Plot & Acre Editor
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                खेत का नाम, रकबा, फसल और हर 1-एकड़ टुकड़े का नाम, खर्च व आमदनी यहाँ से संपादित (Edit) करें।
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Toggle: Edit Existing vs Mark New Plot */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('edit');
              handleSelectPlotChange(selectedPlotId || plots[0]?.id);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'edit'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>✏️ मौजूदा खेत एडिट करें ({plots.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('new');
              setPlotName('नया खेत (8.5 एकड़ मुख्य चक)');
              setTotalAcres(8.5);
              setCrop('Wheat (गेहूं - PBW 550)');
              setStage('growing');
              const gen = generateAcreSubPlots('plot-new', 'नया खेत', 8.5, lat, lng, 'Wheat (गेहूं - PBW 550)');
              setSubPlots(gen);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'new'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ नया खेत जोड़ें (Add New Plot)</span>
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Top Parameters Grid */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-xs">
            {mode === 'edit' && (
              <div>
                <label className="text-xs font-bold text-emerald-800 dark:text-emerald-400 block mb-1">
                  एडिट करने के लिए खेत चुनें (Select Plot to Edit)
                </label>
                <select
                  value={selectedPlotId}
                  onChange={(e) => handleSelectPlotChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.acres} एकड़ ({p.crop})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  खेत का नाम / पहचान (Plot Name)
                </label>
                <input
                  type="text"
                  required
                  value={plotName}
                  onChange={(e) => setPlotName(e.target.value)}
                  placeholder="उदा. खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  कुल रकबा (Total Acres)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="500"
                    required
                    value={totalAcres}
                    onChange={(e) => setTotalAcres(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-600 text-xs sm:text-sm font-bold font-mono text-emerald-800 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                    एकड़
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  मुख्य फसल व किस्म (All Crop Varieties)
                </label>
                <input
                  type="text"
                  list="demarcation-crop-varieties"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  placeholder="उदा. Wheat (गेहूं - DBW 303)"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <datalist id="demarcation-crop-varieties">
                  {ALL_CROP_VARIETIES.map((v) => (
                    <option key={v.id} value={v.label} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  फसल अवस्था (Stage)
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value as PlotStage)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="tilling">🚜 जुताई (Tilling)</option>
                  <option value="sowing">🌱 बिजाई (Sowing)</option>
                  <option value="growing">🌾 बढ़वार (Growing)</option>
                  <option value="flowering">🌻 बालियां / फूल (Flowering)</option>
                  <option value="harvesting">🌾 कटाई (Harvesting)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  GPS केंद्र बिंदु (Coordinates)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 29.6872)}
                    title="Latitude"
                    placeholder="Lat 29.6872"
                    className="w-1/2 px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 76.9890)}
                    title="Longitude"
                    placeholder="Lng 76.9890"
                    className="w-1/2 px-2 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Auto Divide Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/15 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {totalAcres} एकड़ को 1-एकड़ टुकड़ों में स्वतः विभाजित करें
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  {totalAcres % 1 !== 0
                    ? `${Math.floor(totalAcres)} एकड़ (1.0 एकड़ प्रत्येक) + 1 टुकड़ा (${(totalAcres % 1).toFixed(1)} एकड़) कुल ${Math.ceil(totalAcres)} चक बनेंगे`
                    : `${totalAcres} अलग-अलग एकड़ चक बनेंगे`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoDivide}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>1-क्लिक एकड़ विभाजन (Re-generate)</span>
            </button>
          </div>

          {/* Sub-Plots Acre Grid List with Full Editable Fields */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  चिह्नित एकड़ सूची (हर एकड़ का नाम, रकबा, खर्च व आमदनी एडिट करें):
                </span>
                <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                  कुल: {subPlots.reduce((acc, p) => acc + p.acres, 0).toFixed(1)} / {totalAcres} एकड़
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddCustomAcre}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ अतिरिक्त एकड़ जोड़ें</span>
              </button>
            </div>

            {/* List of Acres */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {subPlots.map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs hover:border-emerald-400 transition-all"
                >
                  {/* Acre Number & Name Input */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-xs font-mono flex items-center justify-center shrink-0 border border-emerald-500/30">
                      #{sp.acreNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <label className="text-[10px] text-slate-400 block">चक का नाम / पहचान</label>
                      <input
                        type="text"
                        value={sp.name}
                        onChange={(e) => handleUpdateSubPlot(idx, 'name', e.target.value)}
                        placeholder={`एकड़ ${sp.acreNumber}`}
                        className="w-full px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Editable Acre Size, Expense, Yield & Income */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                    <div>
                      <label className="text-[10px] text-slate-400 block">रकबा (एकड़)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={sp.acres}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0.1;
                          handleUpdateSubPlot(idx, 'acres', val);
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-rose-500 font-semibold block">खर्च (₹)</label>
                      <input
                        type="number"
                        step="100"
                        value={sp.allocatedExpense ?? Math.round(sp.acres * 13850)}
                        onChange={(e) =>
                          handleUpdateSubPlot(idx, 'allocatedExpense', parseInt(e.target.value, 10) || 0)
                        }
                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-amber-600 font-semibold block">उपज (कुंतल)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={sp.estimatedYieldQtl ?? Math.round(sp.acres * 23.5 * 10) / 10}
                        onChange={(e) =>
                          handleUpdateSubPlot(idx, 'estimatedYieldQtl', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-end gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-blue-500 font-semibold block">आमदनी (₹)</label>
                        <input
                          type="number"
                          step="500"
                          value={sp.earnedIncome ?? Math.round(sp.acres * 23.5 * 2275)}
                          onChange={(e) =>
                            handleUpdateSubPlot(idx, 'earnedIncome', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubPlot(idx)}
                        disabled={subPlots.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                        title="यह एकड़ हटाएं"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              {mode === 'edit' && onDeletePlot && plots.length > 1 && (
                !confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>पूरा खेत हटाएं (Delete Plot)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-200">पक्का हटाएं?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePlot(selectedPlotId);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                    >
                      हाँ, हटाएं
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-400 cursor-pointer"
                    >
                      नहीं
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                रद्द करें
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>खेत व एकड़ बदलाव सेव करें (Save Plot & Acres)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
