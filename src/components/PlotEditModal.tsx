import React, { useState, useEffect } from 'react';
import { FarmPlot, PlotStage, Language } from '../types/farm';
import {
  generateAcreSubPlots,
  calculatePolygonAcres,
  calculatePolygonCentroid,
  generateDefaultBoundary,
} from '../utils/acreUtils';
import {
  ALL_CROP_VARIETIES,
  CROP_CATEGORIES,
} from '../constants/cropVarieties';
import {
  X,
  Check,
  Trash2,
  Edit3,
  Sprout,
  Droplets,
  Calendar,
  MapPin,
  FileText,
  Layers,
  AlertTriangle,
  Plus,
  Compass,
  Navigation,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { InteractiveSatelliteKhetMap } from './InteractiveSatelliteKhetMap';

interface PlotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  plot: FarmPlot | null; // If null, creates a new plot
  plots?: FarmPlot[]; // Optional list of all plots to switch between in modal
  onSavePlot: (updatedPlot: FarmPlot, oldName?: string) => void;
  onDeletePlot?: (plotId: string) => void;
  onOpenAcreDemarcation?: (plotId: string) => void;
  language: Language;
}

export const PlotEditModal: React.FC<PlotEditModalProps> = ({
  isOpen,
  onClose,
  plot,
  plots = [],
  onSavePlot,
  onDeletePlot,
  onOpenAcreDemarcation,
  language,
}) => {
  const [activePlotId, setActivePlotId] = useState<string>(plot?.id || '');

  // Form states
  const [name, setName] = useState('');
  const [crop, setCrop] = useState('Wheat (गेहूं - DBW 303 / करण वैष्णवी)');
  const [acres, setAcres] = useState<number>(4.0);
  const [stage, setStage] = useState<PlotStage>('growing');
  const [progressPct, setProgressPct] = useState<number>(60);
  const [soilHealth, setSoilHealth] = useState<number>(90);
  const [moisturePct, setMoisturePct] = useState<number>(75);
  const [sowingDate, setSowingDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expectedHarvestDate, setExpectedHarvestDate] =
    useState<string>('2026-04-15');
  const [currentActivity, setCurrentActivity] =
    useState<string>('नियमित फसल निगरानी');
  const [notes, setNotes] = useState<string>('');
  const [lat, setLat] = useState<number>(29.6872);
  const [lng, setLng] = useState<number>(76.989);
  const [boundaries, setBoundaries] = useState<
    Array<{ lat: number; lng: number }>
  >([]);
  const [syncSubPlotsOnAcreChange, setSyncSubPlotsOnAcreChange] =
    useState<boolean>(true);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [isFullScreenMap, setIsFullScreenMap] = useState<boolean>(false);
  const [hideMapLabels, setHideMapLabels] = useState<boolean>(true);

  const currentPlotObj = plots.find((p) => p.id === activePlotId) || plot;

  useEffect(() => {
    if (!isOpen) return;
    setConfirmDelete(false);
    setIsFullScreenMap(false);
    setHideMapLabels(true);
    const target = plot || null;
    if (target) {
      const cLat = target.coordinates?.lat || 29.6872;
      const cLng = target.coordinates?.lng || 76.989;
      setActivePlotId(target.id);
      setName(target.name);
      setCrop(target.crop);
      setAcres(target.acres);
      setStage(target.stage);
      setProgressPct(target.progressPct);
      setSoilHealth(target.soilHealth);
      setMoisturePct(target.moisturePct);
      setSowingDate(
        target.sowingDate || new Date().toISOString().split('T')[0]
      );
      setExpectedHarvestDate(target.expectedHarvestDate || '2026-04-15');
      setCurrentActivity(target.currentActivity || '');
      setNotes(target.notes || '');
      setLat(cLat);
      setLng(cLng);
      setBoundaries(
        target.boundaries && target.boundaries.length >= 3
          ? target.boundaries
          : generateDefaultBoundary(cLat, cLng, target.acres)
      );
    } else {
      const cLat = 29.6865;
      const cLng = 76.991;
      setActivePlotId('');
      setName('');
      setCrop('Wheat (गेहूं - DBW 303 / करण वैष्णवी)');
      setAcres(4.0);
      setStage('tilling');
      setProgressPct(25);
      setSoilHealth(90);
      setMoisturePct(72);
      setSowingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('2026-04-20');
      setCurrentActivity('खेत तैयार किया जा रहा है');
      setNotes('');
      setLat(cLat);
      setLng(cLng);
      setBoundaries(generateDefaultBoundary(cLat, cLng, 4.0));
    }
  }, [isOpen, plot]);

  const handleSwitchPlotInModal = (id: string) => {
    setConfirmDelete(false);
    if (id === '__new__') {
      const cLat = 29.6865;
      const cLng = 76.991;
      setActivePlotId('');
      setName('');
      setCrop('Wheat (गेहूं - DBW 303 / करण वैष्णवी)');
      setAcres(4.0);
      setStage('tilling');
      setProgressPct(25);
      setSoilHealth(90);
      setMoisturePct(72);
      setSowingDate(new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate('2026-04-20');
      setCurrentActivity('खेत तैयार किया जा रहा है');
      setNotes('');
      setLat(cLat);
      setLng(cLng);
      setBoundaries(generateDefaultBoundary(cLat, cLng, 4.0));
      return;
    }
    const found = plots.find((p) => p.id === id);
    if (found) {
      const cLat = found.coordinates?.lat || 29.6872;
      const cLng = found.coordinates?.lng || 76.989;
      setActivePlotId(found.id);
      setName(found.name);
      setCrop(found.crop);
      setAcres(found.acres);
      setStage(found.stage);
      setProgressPct(found.progressPct);
      setSoilHealth(found.soilHealth);
      setMoisturePct(found.moisturePct);
      setSowingDate(found.sowingDate || new Date().toISOString().split('T')[0]);
      setExpectedHarvestDate(found.expectedHarvestDate || '2026-04-15');
      setCurrentActivity(found.currentActivity || '');
      setNotes(found.notes || '');
      setLat(cLat);
      setLng(cLng);
      setBoundaries(
        found.boundaries && found.boundaries.length >= 3
          ? found.boundaries
          : generateDefaultBoundary(cLat, cLng, found.acres)
      );
    }
  };

  if (!isOpen) return null;

  const handleUseCurrentGPS = () => {
    if (!('geolocation' in navigator)) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setBoundaries(generateDefaultBoundary(newLat, newLng, acres));
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
      },
      { timeout: 6000 }
    );
  };

  const handleAddBoundaryPoint = () => {
    const lastPt = boundaries[boundaries.length - 1] || { lat, lng };
    const nextPt = {
      lat: Number((lastPt.lat + 0.0003).toFixed(6)),
      lng: Number((lastPt.lng + 0.0003).toFixed(6)),
    };
    const updated = [...boundaries, nextPt];
    setBoundaries(updated);
  };

  const handleUpdateBoundaryPoint = (
    idx: number,
    field: 'lat' | 'lng',
    value: number
  ) => {
    const updated = boundaries.map((pt, i) =>
      i === idx ? { ...pt, [field]: value } : pt
    );
    setBoundaries(updated);
  };

  const handleRemoveBoundaryPoint = (idx: number) => {
    if (boundaries.length <= 3) return;
    setBoundaries(boundaries.filter((_, i) => i !== idx));
  };

  const handleSyncAcresFromBoundary = () => {
    if (boundaries.length < 3) return;
    const computedAcres = calculatePolygonAcres(boundaries);
    const centroid = calculatePolygonCentroid(boundaries);
    setAcres(computedAcres);
    setLat(centroid.lat);
    setLng(centroid.lng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const plotId = activePlotId || 'plot-' + Date.now();
    const oldName = currentPlotObj?.name;
    const acresNum = Math.max(0.1, Number(acres));

    let updatedSubPlots = currentPlotObj?.subPlots;
    if (
      !updatedSubPlots ||
      updatedSubPlots.length === 0 ||
      (syncSubPlotsOnAcreChange &&
        currentPlotObj &&
        currentPlotObj.acres !== acresNum)
    ) {
      updatedSubPlots = generateAcreSubPlots(
        plotId,
        name.trim(),
        acresNum,
        lat,
        lng,
        crop
      );
    } else {
      updatedSubPlots = updatedSubPlots.map((sp) => ({
        ...sp,
        cropVariety: crop,
      }));
    }

    const savedPlot: FarmPlot = {
      id: plotId,
      name: name.trim(),
      crop: crop.trim(),
      acres: acresNum,
      stage,
      progressPct: Math.min(100, Math.max(0, Number(progressPct))),
      soilHealth: Math.min(100, Math.max(0, Number(soilHealth))),
      moisturePct: Math.min(100, Math.max(0, Number(moisturePct))),
      sowingDate,
      expectedHarvestDate,
      currentActivity: currentActivity.trim() || 'सक्रिय निगरानी जारी',
      notes: notes.trim(),
      coordinates: { lat: Number(lat), lng: Number(lng) },
      subPlots: updatedSubPlots,
      boundaries:
        boundaries.length >= 3
          ? boundaries
          : generateDefaultBoundary(Number(lat), Number(lng), acresNum),
    };

    onSavePlot(savedPlot, oldName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl glass-panel rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/40 dark:border-white/15 space-y-5 my-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white font-display flex items-center gap-2">
                <span>
                  {activePlotId
                    ? language === 'hi'
                      ? 'खेत (Plot), फसल किस्म व बाउंड्री संपादित करें'
                      : 'Edit Farm Plot, Crop Variety & Boundary'
                    : language === 'hi'
                    ? 'नया खेत (Plot) जोड़ें'
                    : 'Add New Farm Plot'}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {language === 'hi'
                  ? 'खेत का नाम, रकबा (एकड़), सभी फसलों की किस्में, लोकेशन और मल्टी-पॉइंट बाउंड्री यहाँ से सेट करें।'
                  : 'Update plot name, area in acres, all crop varieties, GPS location, and multi-point boundary.'}
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

        {/* Plot Selector Dropdown */}
        {plots.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <label className="text-xs font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 shrink-0">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>कौन सा खेत एडिट करना है?</span>
            </label>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <select
                value={activePlotId || '__new__'}
                onChange={(e) => handleSwitchPlotInModal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-700 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    ✏️ {p.name} ({p.acres} एकड़ - {p.crop})
                  </option>
                ))}
                <option value="__new__">➕ नया खेत जोड़ें (Add New Plot)</option>
              </select>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Plot Name & Total Acres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                खेत का नाम / पहचान (Plot Name) *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="उदा. खेत नं. 1 (8.5 एकड़ - कनाल साइड मुख्य चक)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                कुल रकबा (Total Acres) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="500"
                  required
                  value={acres}
                  onChange={(e) => setAcres(parseFloat(e.target.value) || 0.5)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500 text-sm font-black font-mono text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                  एकड़
                </span>
              </div>
            </div>
          </div>

          {/* Checkbox: Auto-sync 1-acre subplots when total acres changes */}
          {activePlotId &&
            currentPlotObj &&
            currentPlotObj.acres !== acres && (
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/70 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncSubPlotsOnAcreChange}
                  onChange={(e) =>
                    setSyncSubPlotsOnAcreChange(e.target.checked)
                  }
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>
                  रकबा <strong>{currentPlotObj.acres} एकड़</strong> से बदलकर{' '}
                  <strong>{acres} एकड़</strong> करने पर इसके 1-1 एकड़ के चक
                  (Sub-plots) भी नए रकबे के अनुसार अपडेट करें।
                </span>
              </label>
            )}

          {/* Row 2: Full Crop Varieties Selector + Custom Input & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                  <span>बोई गई फसल व किस्म चुनें (All Varieties) *</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {ALL_CROP_VARIETIES.length}+ किस्में
                </span>
              </label>

              {/* Categorized Crop & Variety Select Dropdown */}
              <select
                value={
                  ALL_CROP_VARIETIES.some((v) => v.label === crop)
                    ? crop
                    : '__custom__'
                }
                onChange={(e) => {
                  if (e.target.value !== '__custom__') {
                    setCrop(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-emerald-50/70 dark:bg-slate-800 border border-emerald-400 dark:border-emerald-700 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {CROP_CATEGORIES.map((cat) => (
                  <optgroup
                    key={cat.id}
                    label={`${cat.icon} ${cat.nameHi} (${cat.nameEn})`}
                  >
                    {ALL_CROP_VARIETIES.filter(
                      (v) => v.categoryId === cat.id
                    ).map((v) => (
                      <option key={v.id} value={v.label}>
                        {v.label} — ({v.avgYieldQtlPerAcre} Qtl/एकड़)
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="__custom__">
                  ✍️ अन्य / कस्टम फसल किस्म नीचे लिखें...
                </option>
              </select>

              {/* Editable Text Input so custom varieties can also be typed */}
              <input
                type="text"
                required
                list="all-crop-varieties-datalist"
                value={crop}
                onChange={(e) => setCrop(e.target.value)}
                placeholder="फसल व किस्म का नाम लिखें या ऊपर से चुनें"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <datalist id="all-crop-varieties-datalist">
                {ALL_CROP_VARIETIES.map((v) => (
                  <option key={v.id} value={v.label} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                फसल की वर्तमान अवस्था (Current Stage)
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as PlotStage)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="tilling">
                  🚜 जुताई व खेत तैयारी (Tilling)
                </option>
                <option value="sowing">🌱 बिजाई / अंकुरण (Sowing)</option>
                <option value="growing">🌾 फसल बढ़वार (Growing)</option>
                <option value="flowering">🌻 फूल व बालियां (Flowering)</option>
                <option value="harvesting">
                  🌾 कटाई के लिए तैयार (Harvesting)
                </option>
              </select>

              {/* Sowing & Harvest Dates right below Stage */}
              <div className="grid grid-cols-2 gap-2.5 mt-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    <Calendar className="w-3 h-3 inline mr-1 text-emerald-600" />
                    बिजाई तारीख
                  </label>
                  <input
                    type="date"
                    value={sowingDate}
                    onChange={(e) => setSowingDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    <Calendar className="w-3 h-3 inline mr-1 text-amber-600" />
                    संभावित कटाई
                  </label>
                  <input
                    type="date"
                    value={expectedHarvestDate}
                    onChange={(e) => setExpectedHarvestDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Progress %, Soil Moisture %, Soil Health */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>फसल प्रगति (Progress)</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {progressPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progressPct}
                onChange={(e) => setProgressPct(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-500" /> नमी (Moisture)
                </span>
                <span className="font-mono text-blue-600 dark:text-blue-400">
                  {moisturePct}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={moisturePct}
                onChange={(e) => setMoisturePct(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                <span>मृदा स्वास्थ्य (Soil Health)</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {soilHealth}/100
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={soilHealth}
                onChange={(e) => setSoilHealth(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Row 4: Interactive Satellite Map & Multi-Point Boundary Marking (with 100% Full-Screen Mode & Hidden Labels) */}
          {isFullScreenMap && (
            <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                    🛰️ फुल-स्क्रीन खेत मार्किंग (कोने P1, P2, P3, P4 क्लिक या ड्रैग करें)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-black">
                    {boundaries.length} कोने ·{' '}
                    {boundaries.length >= 3
                      ? `${calculatePolygonAcres(boundaries)} एकड़`
                      : `${acres} एकड़`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBoundaries([])}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    🎯 नए कोने (Start P1)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBoundaries(generateDefaultBoundary(lat, lng, acres))
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    🔲 4-कोने रखें
                  </button>
                  <button
                    type="button"
                    onClick={handleUseCurrentGPS}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    📍 मेरी GPS
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullScreenMap(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>✅ बाउंड्री डन (फुल-स्क्रीन बंद करें)</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 relative">
                <InteractiveSatelliteKhetMap
                  center={{ lat, lng }}
                  zoom={17}
                  mapStyle="hybrid"
                  hideMapLabels={hideMapLabels}
                  isFullScreen={true}
                  onToggleFullScreen={() => setIsFullScreenMap(false)}
                  onToggleHideLabels={() => setHideMapLabels((v) => !v)}
                  plots={plots}
                  selectedPlotId={activePlotId}
                  isMarkingNewPlot={!activePlotId}
                  toolMode="draw_boundary"
                  draftBoundaryPoints={boundaries}
                  onMapCoordinateClick={(clickedLat, clickedLng) => {
                    const cLat = Number(clickedLat.toFixed(6));
                    const cLng = Number(clickedLng.toFixed(6));
                    const next = [...boundaries, { lat: cLat, lng: cLng }];
                    setBoundaries(next);
                    if (next.length >= 3) {
                      const computedAcres = calculatePolygonAcres(next);
                      const centroid = calculatePolygonCentroid(next);
                      setAcres(computedAcres);
                      setLat(centroid.lat);
                      setLng(centroid.lng);
                    } else if (next.length === 1) {
                      setLat(cLat);
                      setLng(cLng);
                    }
                  }}
                  onDragBoundaryPoint={(idx, newLat, newLng) => {
                    const next = boundaries.map((pt, i) =>
                      i === idx ? { lat: newLat, lng: newLng } : pt
                    );
                    setBoundaries(next);
                    if (next.length >= 3) {
                      const computedAcres = calculatePolygonAcres(next);
                      const centroid = calculatePolygonCentroid(next);
                      setAcres(computedAcres);
                      setLat(centroid.lat);
                      setLng(centroid.lng);
                    }
                  }}
                />
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-900/70 border-2 border-emerald-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  🛰️ नक्शे पर खेत मार्क करें (बिना फालतू लेबल के साफ सैटेलाइट मैप)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setHideMapLabels(true);
                    setIsFullScreenMap(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all shadow-md"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>⛶ फुल-स्क्रीन मैप में मार्क करें</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBoundaries([]);
                    setHideMapLabels(true);
                    setIsFullScreenMap(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span>🎯</span>
                  <span>नए कोने मार्क करें (Full-Screen P1)</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{gpsLoading ? 'खोज रहे...' : 'मेरी GPS'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBoundaries(generateDefaultBoundary(lat, lng, acres))
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>4-कोने रखें</span>
                </button>
              </div>
            </div>

            {/* Embedded Live Satellite Map for Direct Farm Marking (only mounted when not in Full-Screen) */}
            {!isFullScreenMap && (
              <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-inner">
                <InteractiveSatelliteKhetMap
                  center={{ lat, lng }}
                  zoom={17}
                  mapStyle="hybrid"
                  hideMapLabels={hideMapLabels}
                  isFullScreen={false}
                  onToggleFullScreen={() => setIsFullScreenMap(true)}
                  onToggleHideLabels={() => setHideMapLabels((v) => !v)}
                  plots={plots}
                  selectedPlotId={activePlotId}
                  isMarkingNewPlot={!activePlotId}
                  toolMode="draw_boundary"
                  draftBoundaryPoints={boundaries}
                  onMapCoordinateClick={(clickedLat, clickedLng) => {
                    const cLat = Number(clickedLat.toFixed(6));
                    const cLng = Number(clickedLng.toFixed(6));
                    const next = [...boundaries, { lat: cLat, lng: cLng }];
                    setBoundaries(next);
                    if (next.length >= 3) {
                      const computedAcres = calculatePolygonAcres(next);
                      const centroid = calculatePolygonCentroid(next);
                      setAcres(computedAcres);
                      setLat(centroid.lat);
                      setLng(centroid.lng);
                    } else if (next.length === 1) {
                      setLat(cLat);
                      setLng(cLng);
                    }
                  }}
                  onDragBoundaryPoint={(idx, newLat, newLng) => {
                    const next = boundaries.map((pt, i) =>
                      i === idx ? { lat: newLat, lng: newLng } : pt
                    );
                    setBoundaries(next);
                    if (next.length >= 3) {
                      const computedAcres = calculatePolygonAcres(next);
                      const centroid = calculatePolygonCentroid(next);
                      setAcres(computedAcres);
                      setLat(centroid.lat);
                      setLng(centroid.lng);
                    }
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                📐 चिह्नित कोने: {boundaries.length} Points{' '}
                {boundaries.length >= 3 &&
                  `— रकबा: ${calculatePolygonAcres(boundaries)} एकड़ (${(
                    calculatePolygonAcres(boundaries) * 4.8
                  ).toFixed(1)} बीघा)`}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                केंद्र: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
              </span>
            </div>
          </div>

          {/* Row 5: Current Activity & Diary Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                वर्तमान कृषि कार्य (Current Activity)
              </label>
              <input
                type="text"
                value={currentActivity}
                onChange={(e) => setCurrentActivity(e.target.value)}
                placeholder="उदा. पहली यूरिया खाद व कोर सिंचाई संपन्न"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>खेत डायरी नोट (Plot Notes)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="उदा. 50kg DAP प्रति एकड़ डाला गया"
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quick Link to Per-Acre Demarcation if editing existing plot */}
          {activePlotId && onOpenAcreDemarcation && (
            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-teal-800 dark:text-teal-300 block">
                  📐 प्रति-एकड़ (1-1 Acre) चक विभाजन भी एडिट करना चाहते हैं?
                </span>
                <span className="text-[11px] text-slate-500">
                  हर एकड़ का अलग नाम, अनुमानित खर्च और उपज बदलने के लिए एकड़
                  विभाजन खोलें।
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAcreDemarcation(activePlotId);
                }}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 cursor-pointer transition-all"
              >
                एकड़ विभाजन खोलें →
              </button>
            </div>
          )}

          {/* Footer Actions: Delete (Left) + Cancel & Save (Right) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              {activePlotId &&
                onDeletePlot &&
                plots.length > 1 &&
                (!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>खेत हटाएं (Delete Plot)</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/50 px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                      पक्का हटाएं?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePlot(activePlotId);
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
                ))}
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>
                  {activePlotId
                    ? 'बदलाव सेव करें (Save Changes)'
                    : 'नया खेत जोड़ें (Add Plot)'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
