import React, { useState, useEffect } from 'react';
import {
  FarmPlot,
  PlotStage,
  AcreSubPlot,
  FarmDataStore,
} from '../types/farm';
import {
  generateAcreSubPlots,
  isAcreEmptyOrWet,
  WET_EMPTY_ACRE_LABEL,
  WHEAT_DBW_327_LABEL,
  applyNarenBattarPresetToSubPlots,
  sowWetAcresOnBattar,
  formatDateDDMMYYYY,
  calculateFasalAgeAndStage,
} from '../utils/acreUtils';
import { PlotEditModal } from './PlotEditModal';
import { ThreeKhetDigitalTwin } from './ThreeKhetDigitalTwin';
import { PerAcreEntryForm } from './PerAcreEntryForm';
import {
  Plus,
  Edit3,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react';

interface VisualFarmSimulatorProps {
  plots: FarmPlot[];
  store?: FarmDataStore;
  onSaveStore?: (newStore: FarmDataStore) => void;
  onUpdatePlot: (plot: FarmPlot, oldName?: string) => void;
  onAddPlot: (plot: FarmPlot) => void;
  onDeletePlot?: (plotId: string) => void;
  onQuickLogExpense: (
    plotName: string,
    category: 'machinery' | 'labour' | 'chemical_seed'
  ) => void;
  language: 'hi' | 'en';
}

const STAGE_LABELS: Record<PlotStage, string> = {
  tilling: '🚜 जुताई / खेत तैयारी (Jutayi / Tilling)',
  sowing: '🌱 बिजाई व अंकुरण (Beejayi / Sowing)',
  growing: '🌿 टिलरिंग व फुटाव (Tillering / Growing)',
  flowering: '🌼 फूल व बाली अवस्था (Flowering)',
  harvesting: '🌾 पककर कटाई तैयार (Harvesting)',
};

const QUICK_WORKS = [
  'रोटावेटर जुताई',
  'सुपर सीडर बिजाई',
  'टिलरिंग यूरिया (फुटाव)',
  'फूल/बाली स्प्रे (Flowering)',
  'DAP बुवाई खाद',
  'पहली कोर सिंचाई',
  'दूसरी सिंचाई',
  'जिंक व सल्फर खाद',
  'कीटनाशक / फफूंदनाशक स्प्रे',
  'कंबाइन कटाई',
];

const getDaysSinceSowingSim = (sowingDate?: string): number => {
  if (!sowingDate) return 45;
  const diff = Date.now() - new Date(sowingDate).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

export const VisualFarmSimulator: React.FC<VisualFarmSimulatorProps> = ({
  plots,
  store,
  onSaveStore,
  onUpdatePlot,
  onAddPlot,
  onDeletePlot,
  onQuickLogExpense,
  language,
}) => {
  const [selectedPlotId, setSelectedPlotId] = useState<string>(
    plots[0]?.id || ''
  );
  const [activeActivity, setActiveActivity] = useState<
    'tilling' | 'sowing' | 'irrigation' | 'spray' | 'harvesting' | null
  >(null);
  const [editingPlot, setEditingPlot] = useState<FarmPlot | null>(null);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState(false);

  const selectedPlot =
    plots.find((p) => p.id === selectedPlotId) || plots[0] || null;

  const subPlotsList: AcreSubPlot[] =
    selectedPlot && selectedPlot.subPlots && selectedPlot.subPlots.length > 0
      ? selectedPlot.subPlots
      : selectedPlot
      ? generateAcreSubPlots(
          selectedPlot.id,
          selectedPlot.name,
          selectedPlot.acres,
          selectedPlot.coordinates?.lat,
          selectedPlot.coordinates?.lng,
          selectedPlot.crop,
          selectedPlot.boundaries
        )
      : [];

  const [selectedAcreId, setSelectedAcreId] = useState<string>(
    subPlotsList[0]?.id || ''
  );

  useEffect(() => {
    if (subPlotsList.length > 0) {
      const exists = subPlotsList.some((s) => s.id === selectedAcreId);
      if (!exists) {
        setSelectedAcreId(subPlotsList[0].id);
      }
    }
  }, [selectedPlot?.id, subPlotsList.length]);

  const selectedAcre =
    subPlotsList.find((s) => s.id === selectedAcreId) ||
    subPlotsList[0] ||
    null;

  // Project the farmer's exact marked Khet & marked Acres into an Exact-Shape SVG Simulation Map!
  const exactShapeProjection = React.useMemo(() => {
    if (!selectedPlot) return null;
    const allPts: Array<{ lat: number; lng: number }> = [
      ...(selectedPlot.boundaries || []),
      ...subPlotsList.flatMap((sp) => sp.boundaries || []),
      ...subPlotsList
        .map((sp) => sp.coordinates)
        .filter((c): c is { lat: number; lng: number } => Boolean(c)),
    ];

    if (allPts.length < 3) return null;

    const lats = allPts.map((p) => p.lat);
    const lngs = allPts.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const spanLng = Math.max(0.0004, (maxLng - minLng) * cosLat);
    const spanLat = Math.max(0.0004, maxLat - minLat);
    const maxSpan = Math.max(spanLng, spanLat);

    const pad = 42;
    const viewW = 560;
    const viewH = 380;
    const usableW = viewW - pad * 2;
    const usableH = viewH - pad * 2;
    const scale = Math.min(usableW / maxSpan, usableH / maxSpan);

    const toSvgXY = (pt: { lat: number; lng: number }) => {
      const dx = (pt.lng - (minLng + maxLng) / 2) * cosLat * scale;
      const dy = -((pt.lat - (minLat + maxLat) / 2) * scale);
      return {
        x: Number((viewW / 2 + dx).toFixed(1)),
        y: Number((viewH / 2 + dy).toFixed(1)),
      };
    };

    const outerSvgPts =
      selectedPlot.boundaries && selectedPlot.boundaries.length >= 3
        ? selectedPlot.boundaries.map(toSvgXY)
        : [];

    const acrePolygons = subPlotsList.map((sp, idx) => {
      let pts: Array<{ x: number; y: number }> = [];
      if (sp.boundaries && sp.boundaries.length >= 3) {
        pts = sp.boundaries.map(toSvgXY);
      } else if (sp.coordinates) {
        const c = toSvgXY(sp.coordinates);
        const r = 38;
        pts = [
          { x: c.x - r, y: c.y - r },
          { x: c.x + r, y: c.y - r },
          { x: c.x + r, y: c.y + r },
          { x: c.x - r, y: c.y + r },
        ];
      } else {
        const cols = Math.max(1, Math.ceil(Math.sqrt(subPlotsList.length)));
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cellW = usableW / cols;
        const cellH = usableH / Math.ceil(subPlotsList.length / cols);
        const x0 = pad + col * cellW + 4;
        const y0 = pad + row * cellH + 4;
        pts = [
          { x: x0, y: y0 },
          { x: x0 + cellW - 8, y: y0 },
          { x: x0 + cellW - 8, y: y0 + cellH - 8 },
          { x: x0, y: y0 + cellH - 8 },
        ];
      }
      const cx =
        pts.reduce((acc, p) => acc + p.x, 0) / Math.max(1, pts.length);
      const cy =
        pts.reduce((acc, p) => acc + p.y, 0) / Math.max(1, pts.length);
      return {
        sp,
        pointsAttr: pts.map((p) => `${p.x},${p.y}`).join(' '),
        pts,
        cx: Number(cx.toFixed(1)),
        cy: Number(cy.toFixed(1)),
      };
    });

    return {
      viewW,
      viewH,
      outerPointsAttr: outerSvgPts.map((p) => `${p.x},${p.y}`).join(' '),
      outerSvgPts,
      acrePolygons,
    };
  }, [selectedPlot, subPlotsList]);

  const handleOpenEditPlot = (plot: FarmPlot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPlotId(plot.id);
    setEditingPlot(plot);
    setIsPlotModalOpen(true);
  };

  const handleOpenAddPlot = () => {
    setEditingPlot(null);
    setIsPlotModalOpen(true);
  };

  const handleSaveFromModal = (savedPlot: FarmPlot, oldName?: string) => {
    const exists = plots.some((p) => p.id === savedPlot.id);
    if (exists) {
      onUpdatePlot(savedPlot, oldName);
    } else {
      onAddPlot(savedPlot);
    }
    setSelectedPlotId(savedPlot.id);
  };

  // Trigger a live 3D animation AND update the target Acre's (and Plot's) stage & completed works!
  const handleTrigger3DActivity = (
    type: 'tilling' | 'sowing' | 'irrigation' | 'spray' | 'harvesting',
    targetAcreId?: string
  ) => {
    if (!selectedPlot) return;
    setActiveActivity(type);

    const acreIdToUpdate = targetAcreId || selectedAcre?.id;

    let nextStage: PlotStage = selectedPlot.stage;
    let workDoneLabel = '';

    if (type === 'tilling') {
      nextStage = 'tilling';
      workDoneLabel = 'रोटावेटर जुताई';
    } else if (type === 'sowing') {
      nextStage = 'sowing';
      workDoneLabel = 'सुपर सीडर बिजाई';
    } else if (type === 'irrigation') {
      workDoneLabel = 'पहली कोर सिंचाई';
    } else if (type === 'spray') {
      workDoneLabel = 'कीटनाशक / फफूंदनाशक स्प्रे';
    } else if (type === 'harvesting') {
      nextStage = 'harvesting';
      workDoneLabel = 'कंबाइन कटाई';
    }

    const updatedSubs = subPlotsList.map((sp) => {
      if (acreIdToUpdate && sp.id !== acreIdToUpdate) return sp;
      const prevWorks = sp.completedActivities || [];
      const nextWorks = prevWorks.includes(workDoneLabel)
        ? prevWorks
        : [...prevWorks, workDoneLabel];
      return {
        ...sp,
        stage:
          type === 'irrigation' || type === 'spray'
            ? sp.stage || 'growing'
            : nextStage,
        completedActivities: nextWorks,
      };
    });

    onUpdatePlot({
      ...selectedPlot,
      stage:
        type === 'irrigation' || type === 'spray'
          ? selectedPlot.stage
          : nextStage,
      currentActivity: `एकड़ #${
        selectedAcre?.acreNumber || 1
      } में ${workDoneLabel} संपन्न`,
      subPlots: updatedSubs,
    });

    window.setTimeout(() => {
      setActiveActivity(null);
    }, 3500);
  };

  const handleUpdateSelectedAcre = (
    field: keyof AcreSubPlot,
    value: any
  ) => {
    if (!selectedPlot || !selectedAcre) return;
    const updatedSubs = subPlotsList.map((sp) => {
      if (sp.id !== selectedAcre.id) return sp;
      const next: AcreSubPlot = { ...sp, [field]: value };
      if (
        field === 'machineryExpense' ||
        field === 'labourExpense' ||
        field === 'materialExpense'
      ) {
        next.allocatedExpense =
          (Number(next.machineryExpense) || 0) +
          (Number(next.labourExpense) || 0) +
          (Number(next.materialExpense) || 0);
      }
      return next;
    });

    onUpdatePlot({
      ...selectedPlot,
      subPlots: updatedSubs,
    });
  };

  const handleToggleWorkOnSelectedAcre = (work: string) => {
    if (!selectedAcre) return;
    const current = selectedAcre.completedActivities || [];
    const next = current.includes(work)
      ? current.filter((w) => w !== work)
      : [...current, work];
    handleUpdateSelectedAcre('completedActivities', next);
  };

  // 1-Click Preset: Set Acre #5 and #6 to Wheat DBW 327, and all other Acres to Wet/Empty (Waiting for Battar)
  const handleApplyNarenBattarSetup = () => {
    if (!selectedPlot) return;
    const nextSubs = applyNarenBattarPresetToSubPlots(subPlotsList);
    onUpdatePlot({
      ...selectedPlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity:
        'एकड़ #5 व #6 में गेहूं DBW 327 बुवाई पूर्ण — बाकी एकड़ गीला होने से खाली (बतर का इंतजार)',
      subPlots: nextSubs,
    });
    const acre5 = nextSubs.find((s) => Number(s.acreNumber) === 5);
    if (acre5) setSelectedAcreId(acre5.id);
  };

  // 1-Click Battar Action: Sow a specific wet acre (or all remaining wet acres) with Wheat DBW 327 & animate 3D Tractor!
  const handleSowWetAcreOnBattar = (targetAcreId?: string) => {
    if (!selectedPlot) return;
    setActiveActivity('sowing');
    const todayStr = new Date().toISOString().split('T')[0];
    const nextSubs = sowWetAcresOnBattar(
      subPlotsList,
      targetAcreId,
      WHEAT_DBW_327_LABEL,
      todayStr
    );
    const remainingWet = nextSubs.filter((s) => isAcreEmptyOrWet(s)).length;
    onUpdatePlot({
      ...selectedPlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity:
        remainingWet === 0
          ? 'सभी एकड़ों में बतर आने पर गेहूं DBW 327 की बिजाई पूर्ण!'
          : `बतर आने पर बिजाई संपन्न — अभी ${remainingWet} एकड़ में बतर का इंतजार`,
      subPlots: nextSubs,
    });
    if (targetAcreId) setSelectedAcreId(targetAcreId);
    window.setTimeout(() => {
      setActiveActivity(null);
    }, 3500);
  };

  const handleMarkAcreAsWetEmpty = (targetAcreId: string) => {
    if (!selectedPlot) return;
    const nextSubs = subPlotsList.map((sp) => {
      if (sp.id !== targetAcreId) return sp;
      return {
        ...sp,
        cropName: 'खाली खेत (गीला / बतर बाकी)',
        cropVariety: WET_EMPTY_ACRE_LABEL,
        sowingDate: '',
        stage: 'tilling' as PlotStage,
        moisturePct: 92,
        completedActivities: ['खेत गीला है — बतर आने का इंतजार (बिजाई बाकी)'],
        machineryExpense: 0,
        labourExpense: 0,
        materialExpense: 0,
        allocatedExpense: 0,
        estimatedYieldQtl: 0,
        earnedIncome: 0,
        notes: `एकड़ #${sp.acreNumber} — गीला होने की वजह से खाली (बतर आते ही बिजाई करेंगे)`,
      };
    });
    onUpdatePlot({
      ...selectedPlot,
      subPlots: nextSubs,
    });
  };

  const hydratedPlotFor3D: FarmPlot | null = selectedPlot
    ? { ...selectedPlot, subPlots: subPlotsList }
    : null;

  return (
    <div className="space-y-6">
      {/* 1. Top Header & Khet Selector Bar */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-5 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              🌾 मेरा खेत सिमुलेशन मैप
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedPlot && (
              <button
                type="button"
                onClick={() => handleOpenEditPlot(selectedPlot)}
                className="px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>खेत एडिट करें</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddPlot}
              className="px-3.5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ नया खेत जोड़ें</span>
            </button>
          </div>
        </div>

        {/* Switch Between Marked Khets */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-white/10">
          <span className="text-xs font-bold text-slate-300">
            सिमुलेशन में देखने के लिए अपना चिह्नित खेत चुनें:
          </span>
          {plots.map((plot) => {
            const isSel = plot.id === selectedPlot?.id;
            return (
              <button
                key={plot.id}
                type="button"
                onClick={() => setSelectedPlotId(plot.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 border transition-all ${
                  isSel
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-300'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
              >
                <span>{(plot.name || 'खेत').split('(')[0].trim()}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-white font-mono">
                  {plot.acres} एकड़ ({plot.subPlots?.length || Math.ceil(plot.acres)} चक)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1.5 EXACT-SHAPE 2D POLYGON KHET & ACRE SIMULATION MAP (Matches Exact Marked Khet Shape + Time + Work Done per Acre) */}
      {selectedPlot && exactShapeProjection && (
        <div className="bg-slate-950 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl text-white space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block">
                📐 आपके चिह्नित खेत का हूबहू आकार (Exact Marked Khet & Acre Polygon Map)
              </span>
              <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                {selectedPlot.name} — बुवाई पूर्ण एकड़ (DBW 327) बनाम गीले/खाली एकड़ (बतर का इंतजार)
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={handleApplyNarenBattarSetup}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer shadow-md"
              >
                ⚡ एकड़ #5 व #6 = गेहूं DBW 327 · बाकी गीले/खाली
              </button>
              {subPlotsList.some((s) => isAcreEmptyOrWet(s)) && (
                <button
                  type="button"
                  onClick={() => handleSowWetAcreOnBattar()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black cursor-pointer shadow-md"
                >
                  🚜 सभी खाली एकड़ों में बतर आ गई — एक साथ बिजाई करें
                </button>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-sky-900/80 border border-sky-400/60 text-sky-200">
                💧 गीला / खाली खेत ({subPlotsList.filter((s) => isAcreEmptyOrWet(s)).length} एकड़)
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-lime-900/70 border border-lime-400/60 text-lime-200">
                🌱 गेहूं DBW 327 बोया ({subPlotsList.filter((s) => !isAcreEmptyOrWet(s)).length} एकड़)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Exact Polygon SVG Map */}
            <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-emerald-500/30 p-3 relative overflow-hidden">
              <svg
                viewBox={`0 0 ${exactShapeProjection.viewW} ${exactShapeProjection.viewH}`}
                className="w-full h-[300px] sm:h-[340px]"
              >
                <defs>
                  <pattern
                    id="soilGridPattern"
                    width="24"
                    height="24"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 24 0 L 0 0 0 24"
                      fill="none"
                      stroke="rgba(16, 185, 129, 0.08)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width={exactShapeProjection.viewW}
                  height={exactShapeProjection.viewH}
                  fill="url(#soilGridPattern)"
                />

                {/* Outer Marked Khet Boundary Polygon (P1, P2, P3, P4...) */}
                {exactShapeProjection.outerPointsAttr && (
                  <polygon
                    points={exactShapeProjection.outerPointsAttr}
                    fill="rgba(16, 185, 129, 0.08)"
                    stroke="#fbbf24"
                    strokeWidth="4"
                    strokeDasharray="8 4"
                  />
                )}

                {/* Each Marked Acre Polygon (A1, A2, A3, A4...) */}
                {exactShapeProjection.acrePolygons.map(
                  ({ sp, pointsAttr, cx, cy }) => {
                    const isSel = sp.id === selectedAcre?.id;
                    const emptyWet = isAcreEmptyOrWet(sp);
                    const st = sp.stage || selectedPlot.stage || 'growing';
                    const fillMap: Record<PlotStage, string> = {
                      tilling: 'rgba(146, 64, 14, 0.65)',
                      sowing: 'rgba(101, 163, 13, 0.72)',
                      growing: 'rgba(5, 150, 105, 0.68)',
                      flowering: 'rgba(202, 138, 4, 0.68)',
                      harvesting: 'rgba(217, 119, 6, 0.72)',
                    };
                    const stageShortMap: Record<PlotStage, string> = {
                      tilling: '🚜 जुताई (Jutayi)',
                      sowing: '🌱 गेहूं DBW 327 (बोया)',
                      growing: '🌿 टिलरिंग / बढ़वार',
                      flowering: '🌼 फ्लावरिंग / बाली',
                      harvesting: '🌾 कटाई तैयार',
                    };
                    const days = getDaysSinceSowingSim(
                      sp.sowingDate || selectedPlot.sowingDate
                    );
                    const latestWork = emptyWet
                      ? 'बतर आते ही बिजाई करेंगे'
                      : (sp.completedActivities || []).slice(-1)[0] ||
                        stageShortMap[st];

                    return (
                      <g
                        key={sp.id}
                        onClick={() => setSelectedAcreId(sp.id)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                      >
                        <polygon
                          points={pointsAttr}
                          fill={
                            emptyWet ? 'rgba(30, 58, 138, 0.58)' : fillMap[st]
                          }
                          stroke={
                            isSel
                              ? '#ffffff'
                              : emptyWet
                              ? '#38bdf8'
                              : '#34d399'
                          }
                          strokeWidth={isSel ? '3.5' : '2'}
                        />
                        <rect
                          x={cx - 66}
                          y={cy - 30}
                          width="132"
                          height="60"
                          rx="10"
                          fill={
                            isSel
                              ? 'rgba(245, 158, 11, 0.96)'
                              : emptyWet
                              ? 'rgba(12, 74, 110, 0.92)'
                              : 'rgba(15, 23, 42, 0.90)'
                          }
                          stroke={
                            isSel
                              ? '#ffffff'
                              : emptyWet
                              ? '#38bdf8'
                              : '#10b981'
                          }
                          strokeWidth="1.5"
                        />
                        <text
                          x={cx}
                          y={cy - 13}
                          textAnchor="middle"
                          fill={
                            isSel
                              ? '#0f172a'
                              : emptyWet
                              ? '#7dd3fc'
                              : '#34d399'
                          }
                          fontSize="10.5"
                          fontWeight="900"
                        >
                          {emptyWet
                            ? `एकड़ #${sp.acreNumber} · 💧 खाली (गीला)`
                            : `एकड़ #${sp.acreNumber} · 🌾 DBW 327 (${days}d)`}
                        </text>
                        <text
                          x={cx}
                          y={cy + 3}
                          textAnchor="middle"
                          fill={isSel ? '#0f172a' : '#ffffff'}
                          fontSize="9.5"
                          fontWeight="800"
                        >
                          {emptyWet
                            ? `⏳ बतर बाकी (नमी ${sp.moisturePct || 92}%)`
                            : stageShortMap[st]}
                        </text>
                        <text
                          x={cx}
                          y={cy + 19}
                          textAnchor="middle"
                          fill={
                            isSel
                              ? '#1e293b'
                              : emptyWet
                              ? '#bae6fd'
                              : '#fde047'
                          }
                          fontSize="9"
                          fontWeight="700"
                        >
                          {`✓ ${latestWork.slice(0, 21)}`}
                        </text>
                      </g>
                    );
                  }
                )}

                {/* Outer Khet Corner Labels P1, P2, P3, P4 */}
                {exactShapeProjection.outerSvgPts.map((pt, idx) => (
                  <g key={`outer-corner-${idx}`}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#fbbf24"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={pt.x}
                      y={pt.y + 3}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize="8.5"
                      fontWeight="900"
                    >
                      {`P${idx + 1}`}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* Acre-Wise Time & Work Done Live Status List */}
            <div className="lg:col-span-5 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {subPlotsList.map((sp) => {
                const isSel = sp.id === selectedAcre?.id;
                const emptyWet = isAcreEmptyOrWet(sp);
                const days = getDaysSinceSowingSim(
                  sp.sowingDate || selectedPlot.sowingDate
                );
                const exp =
                  (Number(sp.machineryExpense) || 0) +
                  (Number(sp.labourExpense) || 0) +
                  (Number(sp.materialExpense) || 0) ||
                  Number(sp.allocatedExpense) ||
                  0;
                const works = sp.completedActivities || [];
                return (
                  <div
                    key={`sim-row-${sp.id}`}
                    onClick={() => setSelectedAcreId(sp.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSel
                        ? 'bg-emerald-500/20 border-amber-400 ring-1 ring-amber-400'
                        : emptyWet
                        ? 'bg-sky-950/50 border-sky-500/40 hover:border-sky-400'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-lg font-mono text-xs font-black ${
                            emptyWet
                              ? 'bg-sky-400 text-slate-950'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          एकड़ #{sp.acreNumber} ({sp.acres}Ac)
                        </span>
                        <span
                          className={`text-xs font-black ${
                            emptyWet ? 'text-sky-300' : 'text-emerald-300'
                          }`}
                        >
                          {emptyWet
                            ? `💧 ${sp.acreStatus || 'Empty'} (बतर बाकी)`
                            : `🌾 ${(sp.cropVariety || 'गेहूं DBW 327').split('(')[1]?.replace(')', '') || 'गेहूं DBW 327'} · ${sp.sowingMethod || 'Super Seeder'}`}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-cyan-300">
                        {emptyWet
                          ? `स्टेटस: ${sp.acreStatus || 'Empty'}`
                          : `⏱ ${days} दिन (${formatDateDDMMYYYY(sp.sowingDate || selectedPlot.sowingDate)})`}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {emptyWet ? 'स्थिति:' : 'किए गए काम:'}
                      </span>
                      {works.length > 0 ? (
                        works.map((w, i) => (
                          <span
                            key={`${sp.id}-w-${i}`}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              emptyWet
                                ? 'bg-sky-500/15 border-sky-500/30 text-sky-200'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                            }`}
                          >
                            {emptyWet ? '⏳ ' : '✓ '}
                            {w}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {emptyWet
                            ? 'गीला खेत — बतर आने का इंतजार'
                            : 'रोटावेटर जुताई, सुपर सीडर बिजाई (DBW 327)'}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-black text-amber-300">
                        खर्च: ₹{exp.toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {emptyWet ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSowWetAcreOnBattar(sp.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 text-[11px] font-black cursor-pointer shadow-sm"
                          >
                            🌾 बतर आ गई — DBW 327 बिजाई करें
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAcreAsWetEmpty(sp.id);
                            }}
                            className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[10px] font-bold cursor-pointer"
                          >
                            💧 गीला/खाली दिखाएं
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickLogExpense(
                              `${selectedPlot.name} - एकड़ #${sp.acreNumber}`,
                              'machinery'
                            );
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black cursor-pointer"
                        >
                          + खर्चा जोड़ें
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Real Interactive 3D Khet Digital Twin Viewport */}
      {hydratedPlotFor3D && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Cols: Interactive 3D Khet Scene */}
          <div className="lg:col-span-8">
            <ThreeKhetDigitalTwin
              plot={hydratedPlotFor3D}
              selectedAcreId={selectedAcre?.id}
              activeActivity={activeActivity}
              onSelectAcre={(acre) => setSelectedAcreId(acre.id)}
              onTriggerActivity={handleTrigger3DActivity}
            />
          </div>

          {/* Right 4 Cols: Dedicated Per-Acre Entry Form & 3D Inspector */}
          {selectedAcre && selectedPlot && (
            <div className="lg:col-span-4 space-y-4">
              <PerAcreEntryForm
                plot={hydratedPlotFor3D}
                acre={selectedAcre}
                store={store}
                onSaveAcreAndStore={(updatedPlot, updatedStore) => {
                  if (updatedStore && onSaveStore) {
                    onSaveStore(updatedStore);
                  } else {
                    onUpdatePlot(updatedPlot);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. All Acres Visual Cards Below 3D Viewport */}
      {selectedPlot && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>
                {selectedPlot.name} के सभी एकड़ चक (क्लिक करके 3D में फोकस करें)
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {subPlotsList.map((sp) => {
              const isSel = sp.id === selectedAcre?.id;
              const exp =
                (Number(sp.machineryExpense) || 0) +
                (Number(sp.labourExpense) || 0) +
                (Number(sp.materialExpense) || 0) ||
                Number(sp.allocatedExpense) ||
                0;
              return (
                <div
                  key={sp.id}
                  onClick={() => setSelectedAcreId(sp.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    isSel
                      ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                      : 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs font-black">
                      एकड़ #{sp.acreNumber} ({sp.acres}Ac)
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {STAGE_LABELS[sp.stage || selectedPlot.stage].split('(')[0]}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {sp.cropVariety || selectedPlot.crop}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>बिजाई: {sp.sowingDate || selectedPlot.sowingDate}</span>
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      ✓ {(sp.completedActivities || []).length} काम पूरे:
                    </span>{' '}
                    {(sp.completedActivities || []).slice(0, 2).join(', ')}
                  </div>

                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-sans text-[11px]">
                      कुल खर्च:
                    </span>
                    <span className="font-black text-rose-600 dark:text-rose-400">
                      ₹{exp.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plot Edit Modal */}
      <PlotEditModal
        isOpen={isPlotModalOpen}
        onClose={() => setIsPlotModalOpen(false)}
        plot={editingPlot}
        plots={plots}
        onSavePlot={handleSaveFromModal}
        onDeletePlot={onDeletePlot}
        language={language}
      />
    </div>
  );
};
