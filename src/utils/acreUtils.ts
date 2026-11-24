import {
  FarmPlot,
  AcreSubPlot,
  FarmDataStore,
  AcreStatusType,
  SowingMethodType,
  PlotStage,
} from '../types/farm';
import { findCropVarietyMeta } from '../constants/cropVarieties';

/**
 * Calculates the real-world area in Acres (एकड़) of a multi-point GPS boundary polygon
 * 1 Acre = 4046.8564224 square meters
 */
export const calculatePolygonAcres = (
  points: Array<{ lat: number; lng: number }>
): number => {
  if (!points || points.length < 3) return 0;

  const refLatRad = (points[0].lat * Math.PI) / 180;
  const metersPerDegLat = 111132.954;
  const metersPerDegLng = 111319.488 * Math.cos(refLatRad);

  let areaSqMeters = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = (points[i].lng - points[0].lng) * metersPerDegLng;
    const yi = (points[i].lat - points[0].lat) * metersPerDegLat;
    const xj = (points[j].lng - points[0].lng) * metersPerDegLng;
    const yj = (points[j].lat - points[0].lat) * metersPerDegLat;
    areaSqMeters += xi * yj - xj * yi;
  }

  areaSqMeters = Math.abs(areaSqMeters) / 2.0;
  const acres = areaSqMeters / 4046.8564224;
  return Math.max(0.1, Math.round(acres * 100) / 100);
};

/**
 * Computes the geometric centroid { lat, lng } of a multi-point boundary polygon
 */
export const calculatePolygonCentroid = (
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } => {
  if (!points || points.length === 0) {
    return { lat: 29.6872, lng: 76.989 };
  }
  const sum = points.reduce(
    (acc, pt) => ({ lat: acc.lat + pt.lat, lng: acc.lng + pt.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: Number((sum.lat / points.length).toFixed(6)),
    lng: Number((sum.lng / points.length).toFixed(6)),
  };
};

/**
 * Generates a realistic 4-corner GPS boundary around a center coordinate sized approximately to `acres`
 */
export const generateDefaultBoundary = (
  centerLat: number,
  centerLng: number,
  acres: number = 4.0
): Array<{ lat: number; lng: number }> => {
  const areaSqMeters = Math.max(0.5, acres) * 4046.8564224;
  const widthMeters = Math.sqrt(areaSqMeters * 1.25);
  const heightMeters = areaSqMeters / widthMeters;

  const halfLatDeg = heightMeters / 2 / 111132.954;
  const halfLngDeg =
    widthMeters / 2 / (111319.488 * Math.cos((centerLat * Math.PI) / 180));

  return [
    {
      lat: Number((centerLat + halfLatDeg).toFixed(6)),
      lng: Number((centerLng - halfLngDeg).toFixed(6)),
    },
    {
      lat: Number((centerLat + halfLatDeg).toFixed(6)),
      lng: Number((centerLng + halfLngDeg).toFixed(6)),
    },
    {
      lat: Number((centerLat - halfLatDeg).toFixed(6)),
      lng: Number((centerLng + halfLngDeg).toFixed(6)),
    },
    {
      lat: Number((centerLat - halfLatDeg).toFixed(6)),
      lng: Number((centerLng - halfLngDeg).toFixed(6)),
    },
  ];
};

/**
 * Linearly interpolates between two GPS points
 */
const lerpLatLng = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  t: number
): { lat: number; lng: number } => ({
  lat: Number((a.lat + (b.lat - a.lat) * t).toFixed(6)),
  lng: Number((a.lng + (b.lng - a.lng) * t).toFixed(6)),
});

/**
 * Geometrically slices an outer Khet boundary into proportional Acre sub-polygons
 * so that every divided Acre sits cleanly inside the marked outer Khet boundary on the satellite map!
 */
export const sliceOuterBoundaryIntoSubPolygons = (
  outerBoundary: Array<{ lat: number; lng: number }>,
  acresWeights: number[]
): Array<{
  boundaries: Array<{ lat: number; lng: number }>;
  centroid: { lat: number; lng: number };
}> => {
  if (!outerBoundary || outerBoundary.length < 3 || acresWeights.length === 0) {
    return [];
  }

  // Extract 4 corners (or bounding quad of polygon if > 4 points)
  let p0 = outerBoundary[0];
  let p1 = outerBoundary[1];
  let p2 = outerBoundary[2];
  let p3 = outerBoundary.length >= 4 ? outerBoundary[3] : outerBoundary[2];

  if (outerBoundary.length !== 4) {
    const lats = outerBoundary.map((p) => p.lat);
    const lngs = outerBoundary.map((p) => p.lng);
    const maxLat = Math.max(...lats);
    const minLat = Math.min(...lats);
    const maxLng = Math.max(...lngs);
    const minLng = Math.min(...lngs);
    p0 = { lat: maxLat, lng: minLng };
    p1 = { lat: maxLat, lng: maxLng };
    p2 = { lat: minLat, lng: maxLng };
    p3 = { lat: minLat, lng: minLng };
  }

  const totalWeight = Math.max(
    0.1,
    acresWeights.reduce((acc, w) => acc + Math.max(0.1, w), 0)
  );

  // If 4 or fewer acres, slice as clean parallel strips from P0->P1 / P3->P2
  // If more than 4 acres, use a 2-row grid inside the quad so parcels look like realistic killa/acre squares
  const n = acresWeights.length;
  const rows = n > 4 ? 2 : 1;

  if (rows === 1) {
    let cumulative = 0;
    return acresWeights.map((w) => {
      const t0 = cumulative / totalWeight;
      cumulative += Math.max(0.1, w);
      const t1 = Math.min(1, cumulative / totalWeight);

      const topStart = lerpLatLng(p0, p1, t0);
      const topEnd = lerpLatLng(p0, p1, t1);
      const botEnd = lerpLatLng(p3, p2, t1);
      const botStart = lerpLatLng(p3, p2, t0);

      const subPoly = [topStart, topEnd, botEnd, botStart];
      return {
        boundaries: subPoly,
        centroid: calculatePolygonCentroid(subPoly),
      };
    });
  }

  // 2-row grid division inside the quad (p0-p1-p2-p3)
  const halfIndex = Math.ceil(n / 2);
  const row1Weights = acresWeights.slice(0, halfIndex);
  const row2Weights = acresWeights.slice(halfIndex);

  const midLeft = lerpLatLng(p0, p3, 0.5);
  const midRight = lerpLatLng(p1, p2, 0.5);

  const row1Total = Math.max(
    0.1,
    row1Weights.reduce((a, b) => a + Math.max(0.1, b), 0)
  );
  const row2Total = Math.max(
    0.1,
    row2Weights.reduce((a, b) => a + Math.max(0.1, b), 0)
  );

  const results: Array<{
    boundaries: Array<{ lat: number; lng: number }>;
    centroid: { lat: number; lng: number };
  }> = [];

  let c1 = 0;
  row1Weights.forEach((w) => {
    const t0 = c1 / row1Total;
    c1 += Math.max(0.1, w);
    const t1 = Math.min(1, c1 / row1Total);

    const ts = lerpLatLng(p0, p1, t0);
    const te = lerpLatLng(p0, p1, t1);
    const be = lerpLatLng(midLeft, midRight, t1);
    const bs = lerpLatLng(midLeft, midRight, t0);
    const poly = [ts, te, be, bs];
    results.push({ boundaries: poly, centroid: calculatePolygonCentroid(poly) });
  });

  let c2 = 0;
  row2Weights.forEach((w) => {
    const t0 = c2 / row2Total;
    c2 += Math.max(0.1, w);
    const t1 = Math.min(1, c2 / row2Total);

    const ts = lerpLatLng(midLeft, midRight, t0);
    const te = lerpLatLng(midLeft, midRight, t1);
    const be = lerpLatLng(p3, p2, t1);
    const bs = lerpLatLng(p3, p2, t0);
    const poly = [ts, te, be, bs];
    results.push({ boundaries: poly, centroid: calculatePolygonCentroid(poly) });
  });

  return results;
};

export const WET_EMPTY_ACRE_LABEL =
  '💧 खाली खेत (गीला होने की वजह से खाली — बतर का इंतजार)';
export const WHEAT_DBW_327_LABEL =
  'Wheat (गेहूं - DBW 327 / करण शिवानी)';

/**
 * Formats an ISO date string (YYYY-MM-DD) into Indian DD/MM/YYYY format.
 */
export const formatDateDDMMYYYY = (isoDate?: string): string => {
  if (!isoDate || !isoDate.trim()) return 'DD/MM/YYYY (बुवाई बाकी)';
  const parts = isoDate.trim().split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDate;
};

/**
 * Automatically calculates Crop Age (Fasal Age in days) and Crop Stage from Acre Status & Sowing Date (DD/MM/YYYY).
 */
export const calculateFasalAgeAndStage = (
  acreStatus?: AcreStatusType,
  sowingDate?: string
): {
  days: number;
  stage: PlotStage;
  stageLabelHi: string;
  fasalAgeText: string;
} => {
  if (acreStatus === 'Empty') {
    return {
      days: 0,
      stage: 'tilling',
      stageLabelHi: '💧 खाली खेत (Empty — गीला / बतर का इंतजार)',
      fasalAgeText: '0 दिन (खाली खेत)',
    };
  }
  if (acreStatus === 'Irrigated (Rauni)') {
    return {
      days: 0,
      stage: 'tilling',
      stageLabelHi: '🌊 रौनी / पलेवा सिंचाई (Irrigated / Rauni)',
      fasalAgeText: '0 दिन (रौनी पूर्ण — बतर का इंतजार)',
    };
  }
  if (acreStatus === 'Cultivated') {
    return {
      days: 0,
      stage: 'tilling',
      stageLabelHi: '🚜 जुताई / बतर तैयार (Cultivated — बुवाई बाकी)',
      fasalAgeText: '0 दिन (जुताई पूर्ण — बुवाई बाकी)',
    };
  }

  if (!sowingDate || !sowingDate.trim()) {
    return {
      days: 0,
      stage: 'tilling',
      stageLabelHi: '💧 खाली खेत (बुवाई तारीख दर्ज नहीं)',
      fasalAgeText: '0 दिन (बुवाई बाकी)',
    };
  }

  const parsed = new Date(sowingDate).getTime();
  if (Number.isNaN(parsed)) {
    return {
      days: 1,
      stage: 'sowing',
      stageLabelHi: '🌱 बिजाई व अंकुरण अवस्था (Sowing / Germination)',
      fasalAgeText: '1 दिन की फसल',
    };
  }

  const diffMs = Date.now() - parsed;
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (days <= 20) {
    return {
      days,
      stage: 'sowing',
      stageLabelHi: '🌱 अंकुरण व शुरुआती बिजाई अवस्था (0–20 दिन: Germination)',
      fasalAgeText: `${days} दिन (अंकुरण अवस्था)`,
    };
  }
  if (days <= 65) {
    return {
      days,
      stage: 'growing',
      stageLabelHi: '🌿 फुटाव / टिलरिंग व बढ़वार अवस्था (21–65 दिन: Tillering)',
      fasalAgeText: `${days} दिन (टिलरिंग / बढ़वार)`,
    };
  }
  if (days <= 110) {
    return {
      days,
      stage: 'flowering',
      stageLabelHi: '🌼 गोभ, बाली व फूल अवस्था (66–110 दिन: Flowering / Heading)',
      fasalAgeText: `${days} दिन (बाली व फूल अवस्था)`,
    };
  }
  return {
    days,
    stage: 'harvesting',
    stageLabelHi: '🌾 दाना पकाव व कटाई तैयार (111+ दिन: Maturity / Harvesting)',
    fasalAgeText: `${days} दिन (पककर कटाई तैयार)`,
  };
};

/**
 * Checks whether an individual AcreSubPlot is currently Empty / Unsown (Empty, Irrigated Rauni, or Cultivated without seed).
 */
export const isAcreEmptyOrWet = (
  sp?: Partial<AcreSubPlot> | null
): boolean => {
  if (!sp) return false;
  if (
    sp.acreStatus === 'Empty' ||
    sp.acreStatus === 'Irrigated (Rauni)' ||
    sp.acreStatus === 'Cultivated'
  ) {
    return true;
  }
  if (sp.acreStatus === 'Seeded') {
    return false;
  }
  const text = `${sp.cropVariety || ''} ${sp.cropName || ''} ${
    sp.notes || ''
  }`.toLowerCase();
  return (
    text.includes('खाली खेत') ||
    text.includes('गीला होने') ||
    text.includes('बतर का इंतजार') ||
    text.includes('बिना बुवाई') ||
    text.includes('empty') ||
    text.includes('unsown')
  );
};

/**
 * Applies the farmer's real-world setup WITHOUT auto-inserting any fake expenses:
 * Acre #5 and Acre #6 -> Seeded with Wheat (गेहूं - DBW 327 / करण शिवानी), Expense = ₹0 (until entered by farmer)
 * All other Acres (#1, #2, #3, #4, #7, #8...) -> Empty due to wet soil, Expense = ₹0
 */
export const applyNarenBattarPresetToSubPlots = (
  subPlots: AcreSubPlot[]
): AcreSubPlot[] => {
  const dbwMeta = findCropVarietyMeta(WHEAT_DBW_327_LABEL);
  const baseYield = dbwMeta?.avgYieldQtlPerAcre || 27.0;
  const msp = dbwMeta?.defaultMandiRatePerQtl || 2425;

  return subPlots.map((sp, idx) => {
    const num = Number(sp.acreNumber) || idx + 1;
    const acreVal = Math.max(0.1, Number(sp.acres) || 1);
    const isSownDBW327 = num === 5 || num === 6;

    // Preserve only user-entered expenseEntries if any exist; NEVER auto-insert expenses!
    const existingEntries = sp.expenseEntries || [];
    const machExp = existingEntries
      .filter((e) => e.category === 'machinery')
      .reduce((s, e) => s + e.totalAmount, 0);
    const labExp = existingEntries
      .filter((e) => e.category === 'labour')
      .reduce((s, e) => s + e.totalAmount, 0);
    const matExp = existingEntries
      .filter((e) => e.category === 'chemical_seed')
      .reduce((s, e) => s + e.totalAmount, 0);
    const totalExp = machExp + labExp + matExp;

    if (isSownDBW327) {
      const parcelYield = Math.round(acreVal * baseYield * 10) / 10;
      const ageAndStage = calculateFasalAgeAndStage('Seeded', '2026-11-05');
      return {
        ...sp,
        acreStatus: 'Seeded',
        sowingMethod: sp.sowingMethod || 'Super Seeder',
        expenseEntries: existingEntries,
        cropName: 'गेहूं (DBW 327)',
        cropVariety: WHEAT_DBW_327_LABEL,
        sowingDate: '2026-11-05',
        stage: ageAndStage.stage,
        moisturePct: 68,
        completedActivities: [
          'सुपर सीडर बिजाई (DBW 327)',
        ],
        machineryExpense: machExp,
        labourExpense: labExp,
        materialExpense: matExp,
        allocatedExpense: totalExp,
        estimatedYieldQtl: parcelYield,
        grainRatePerQtl: msp,
        earnedIncome: Math.round(parcelYield * msp),
        notes: `एकड़ #${sp.acreNumber} — गेहूं DBW 327 बोया हुआ (Seeded)`,
      };
    }

    return {
      ...sp,
      acreStatus: 'Empty',
      sowingMethod: undefined,
      expenseEntries: existingEntries,
      cropName: 'खाली खेत (गीला / बतर बाकी)',
      cropVariety: WET_EMPTY_ACRE_LABEL,
      sowingDate: '',
      stage: 'tilling',
      moisturePct: 92,
      completedActivities: ['खेत गीला है — बतर आने का इंतजार (बिजाई बाकी)'],
      machineryExpense: machExp,
      labourExpense: labExp,
      materialExpense: matExp,
      allocatedExpense: totalExp,
      estimatedYieldQtl: 0,
      grainRatePerQtl: msp,
      earnedIncome: 0,
      notes: `एकड़ #${sp.acreNumber} — गीला होने की वजह से खाली (बतर आते ही गेहूं DBW 327 की बिजाई करेंगे)`,
    };
  });
};

/**
 * When Battar (optimal soil moisture) arrives in a specific wet/empty acre (or all remaining wet/empty acres),
 * marks the acre as 'Seeded' with Wheat DBW 327 and today's date WITHOUT auto-inserting fake expenses!
 */
export const sowWetAcresOnBattar = (
  subPlots: AcreSubPlot[],
  targetAcreId?: string,
  varietyLabel: string = WHEAT_DBW_327_LABEL,
  sowingDateStr: string = new Date().toISOString().split('T')[0],
  sowingMethod: SowingMethodType = 'Super Seeder'
): AcreSubPlot[] => {
  const varietyMeta = findCropVarietyMeta(varietyLabel);
  const baseYield = varietyMeta?.avgYieldQtlPerAcre || 27.0;
  const msp = varietyMeta?.defaultMandiRatePerQtl || 2425;

  return subPlots.map((sp) => {
    const shouldSow = targetAcreId
      ? sp.id === targetAcreId
      : isAcreEmptyOrWet(sp);
    if (!shouldSow) return sp;

    const acreVal = Math.max(0.1, Number(sp.acres) || 1);
    // Keep only actual user-entered expenses (0 by default — do NOT auto-insert!)
    const machCost = Number(sp.machineryExpense) || 0;
    const labCost = Number(sp.labourExpense) || 0;
    const matCost = Number(sp.materialExpense) || 0;
    const totalExp = machCost + labCost + matCost;
    const parcelYield = Math.round(acreVal * baseYield * 10) / 10;
    const ageAndStage = calculateFasalAgeAndStage('Seeded', sowingDateStr);

    return {
      ...sp,
      acreStatus: 'Seeded',
      sowingMethod,
      cropName: varietyLabel.includes('DBW 327')
        ? 'गेहूं (DBW 327)'
        : varietyLabel.split('(')[0].trim(),
      cropVariety: varietyLabel,
      sowingDate: sowingDateStr,
      stage: ageAndStage.stage,
      moisturePct: 68,
      completedActivities: [
        `${sowingMethod} से बिजाई (${
          varietyLabel.includes('DBW 327') ? 'DBW 327' : 'पूर्ण'
        })`,
      ],
      machineryExpense: machCost,
      labourExpense: labCost,
      materialExpense: matCost,
      allocatedExpense: totalExp,
      estimatedYieldQtl: parcelYield,
      grainRatePerQtl: msp,
      earnedIncome: Math.round(parcelYield * msp),
      notes: `एकड़ #${sp.acreNumber} — ${sowingMethod} से ${varietyLabel} की बिजाई (${formatDateDDMMYYYY(
        sowingDateStr
      )})`,
    };
  });
};

/**
 * Automatically splits a plot into 1-acre parcels plus any residual fraction,
 * positioning every parcel inside the outer farm boundary — with ₹0 auto-expense!
 */
export const generateAcreSubPlots = (
  plotId: string,
  _plotName: string,
  totalAcres: number,
  baseLat: number = 29.6872,
  baseLng: number = 76.989,
  cropVariety: string = WHEAT_DBW_327_LABEL,
  outerBoundary?: Array<{ lat: number; lng: number }>
): AcreSubPlot[] => {
  const safeTotal = Math.max(0.5, totalAcres);
  const count = Math.ceil(safeTotal);
  const weights: number[] = [];

  for (let i = 1; i <= count; i++) {
    const isLastFraction = i === count && safeTotal % 1 !== 0;
    const acreVal = isLastFraction
      ? Math.max(0.1, Math.round((safeTotal % 1) * 100) / 100)
      : 1.0;
    weights.push(acreVal);
  }

  const effectiveOuter =
    outerBoundary && outerBoundary.length >= 3
      ? outerBoundary
      : generateDefaultBoundary(baseLat, baseLng, safeTotal);

  const slicedPolygons = sliceOuterBoundaryIntoSubPolygons(
    effectiveOuter,
    weights
  );
  const isPrimaryOrWheatPlot =
    plotId === 'plot-1' ||
    cropVariety.toLowerCase().includes('wheat') ||
    cropVariety.includes('गेहूं');

  const varietyMeta = findCropVarietyMeta(
    isPrimaryOrWheatPlot ? WHEAT_DBW_327_LABEL : cropVariety
  );

  return weights.map((acreVal, idx) => {
    const i = idx + 1;
    const isLastHalf = i === count && safeTotal % 1 !== 0;
    const acreNumStr = `${i}`;

    let landmark = `चक नं. ${i}`;
    if (i === 1) landmark = 'नहर / मोरी साइड';
    else if (i === 2) landmark = 'ट्यूबवेल साइड';
    else if (i === 3) landmark = 'रास्ता / सड़क साइड';
    else if (i === count)
      landmark = isLastHalf ? `${acreVal} एकड़ किनारा चक` : 'अंतिम मेड़ चक';

    const sliced = slicedPolygons[idx];
    const mspPerQtl = varietyMeta?.defaultMandiRatePerQtl || 2425;

    // For primary plot or >= 5 acres wheat plot: Acre #5 & #6 are Seeded with DBW 327, rest are Empty (wet soil).
    // All expenses start at 0 (never auto-inserted)!
    if (isPrimaryOrWheatPlot && count >= 5) {
      const isSownAcre5Or6 = i === 5 || i === 6;
      if (isSownAcre5Or6) {
        const baseYieldPerAcre = varietyMeta?.avgYieldQtlPerAcre || 27.0;
        const parcelYield = Math.round(acreVal * baseYieldPerAcre * 10) / 10;
        const parcelIncome = Math.round(parcelYield * mspPerQtl);

        return {
          id: `${plotId}-acre-${i}`,
          acreNumber: acreNumStr,
          name: `एकड़ #${acreNumStr} (${landmark})`,
          acres: acreVal,
          acreStatus: 'Seeded',
          sowingMethod: 'Super Seeder',
          expenseEntries: [],
          cropName: 'गेहूं (DBW 327)',
          cropVariety: WHEAT_DBW_327_LABEL,
          sowingDate: '2026-11-05',
          stage: 'sowing',
          completedActivities: ['Super Seeder से बिजाई (DBW 327)'],
          soilHealth: 94,
          moisturePct: 68,
          machineryExpense: 0,
          labourExpense: 0,
          materialExpense: 0,
          allocatedExpense: 0,
          estimatedYieldQtl: parcelYield,
          grainRatePerQtl: mspPerQtl,
          earnedIncome: parcelIncome,
          notes: `एकड़ #${acreNumStr} — गेहूं DBW 327 की बिजाई संपन्न`,
          coordinates: sliced?.centroid || {
            lat: Number((baseLat + (i - 1) * 0.00035).toFixed(6)),
            lng: Number((baseLng + ((i - 1) % 3) * 0.0004).toFixed(6)),
          },
          boundaries: sliced?.boundaries,
        };
      }

      return {
        id: `${plotId}-acre-${i}`,
        acreNumber: acreNumStr,
        name: `एकड़ #${acreNumStr} (${landmark})`,
        acres: acreVal,
        acreStatus: 'Empty',
        sowingMethod: undefined,
        expenseEntries: [],
        cropName: 'खाली खेत (गीला / बतर बाकी)',
        cropVariety: WET_EMPTY_ACRE_LABEL,
        sowingDate: '',
        stage: 'tilling',
        completedActivities: ['खेत गीला है — बतर आने का इंतजार (बिजाई बाकी)'],
        soilHealth: 91,
        moisturePct: 92,
        machineryExpense: 0,
        labourExpense: 0,
        materialExpense: 0,
        allocatedExpense: 0,
        estimatedYieldQtl: 0,
        grainRatePerQtl: mspPerQtl,
        earnedIncome: 0,
        notes: `एकड़ #${acreNumStr} — गीला होने की वजह से खाली (बतर आते ही बिजाई करेंगे)`,
        coordinates: sliced?.centroid || {
          lat: Number((baseLat + (i - 1) * 0.00035).toFixed(6)),
          lng: Number((baseLng + ((i - 1) % 3) * 0.0004).toFixed(6)),
        },
        boundaries: sliced?.boundaries,
      };
    }

    const baseYieldPerAcre = varietyMeta?.avgYieldQtlPerAcre || 23.5;
    const parcelYield = Math.round(acreVal * baseYieldPerAcre * 10) / 10;
    const parcelIncome = Math.round(parcelYield * mspPerQtl);

    return {
      id: `${plotId}-acre-${i}`,
      acreNumber: acreNumStr,
      name: `एकड़ #${acreNumStr} (${landmark})`,
      acres: acreVal,
      acreStatus: 'Seeded',
      sowingMethod: 'Super Seeder',
      expenseEntries: [],
      cropName: cropVariety.split('(')[0].trim() || 'गेहूं (Wheat)',
      cropVariety,
      sowingDate: '2026-11-05',
      stage: 'sowing',
      completedActivities: ['Super Seeder से बिजाई'],
      soilHealth: Math.min(98, Math.round(88 + (i % 7) * 1.5)),
      moisturePct: Math.min(95, Math.round(72 + (i === 1 ? 14 : (i % 5) * 3))),
      machineryExpense: 0,
      labourExpense: 0,
      materialExpense: 0,
      allocatedExpense: 0,
      estimatedYieldQtl: parcelYield,
      grainRatePerQtl: mspPerQtl,
      earnedIncome: parcelIncome,
      notes: `${landmark} — ${acreVal} एकड़`,
      coordinates: sliced?.centroid || {
        lat: Number((baseLat + (i - 1) * 0.00035).toFixed(6)),
        lng: Number((baseLng + ((i - 1) % 3) * 0.0004).toFixed(6)),
      },
      boundaries: sliced?.boundaries,
    };
  });
};

export interface AcreAnalyticsResult {
  plotName: string;
  totalAcres: number;
  totalMachinery: number;
  totalLabour: number;
  totalMaterials: number;
  totalExpense: number;
  costPerAcre: number;
  totalCropIncome: number;
  incomePerAcre: number;
  netProfit: number;
  profitPerAcre: number;
  subPlots: Array<{
    id: string;
    acreNumber: number | string;
    name: string;
    acres: number;
    acreStatus: AcreStatusType;
    sowingMethod?: SowingMethodType;
    sowingDate?: string;
    fasalAgeDays: number;
    cropVariety: string;
    soilHealth: number;
    moisturePct: number;
    machineryCost: number;
    labourCost: number;
    materialCost: number;
    totalExpense: number;
    estimatedYieldQtl: number;
    earnedIncome: number;
    netProfit: number;
    profitMarginPct: number;
  }>;
}

/**
 * Calculates both Per-Acre and Whole-Khet expenses and profit using ONLY the farmer's explicitly entered
 * Per-Acre Form expenses & Hisab-Kitab ledger entries (zero auto-inserted fake expenses!).
 */
export const calculatePlotAcreAnalytics = (
  plot: FarmPlot,
  store: FarmDataStore
): AcreAnalyticsResult => {
  const varietyMeta = findCropVarietyMeta(plot.crop);
  const defaultYield = varietyMeta?.avgYieldQtlPerAcre || 23.5;
  const defaultRate = varietyMeta?.defaultMandiRatePerQtl || 2425;

  const subPlotsList =
    plot.subPlots && plot.subPlots.length > 0
      ? plot.subPlots
      : generateAcreSubPlots(
          plot.id,
          plot.name,
          plot.acres,
          plot.coordinates?.lat,
          plot.coordinates?.lng,
          plot.crop,
          plot.boundaries
        );

  const sumSubPlotAcres = subPlotsList.reduce(
    (acc, sp) => acc + (Number(sp.acres) || 0),
    0
  );
  const totalAcres =
    sumSubPlotAcres > 0
      ? Math.round(sumSubPlotAcres * 100) / 100
      : Math.max(0.5, plot.acres);

  // Build per-acre analytics strictly from user-entered expenses on each AcreSubPlot
  const subPlots = subPlotsList.map((sp) => {
    const spAcres = Math.max(0.1, Number(sp.acres) || 1);
    const isEmptyWet = isAcreEmptyOrWet(sp);
    const status: AcreStatusType =
      sp.acreStatus || (isEmptyWet ? 'Empty' : 'Seeded');
    const ageMeta = calculateFasalAgeAndStage(status, sp.sowingDate);

    // Strictly use actual entered expenses (defaulting to 0, NEVER auto-inserting 4200/3150/6500!)
    const machCost = Number(sp.machineryExpense) || 0;
    const labCost = Number(sp.labourExpense) || 0;
    const matCost = Number(sp.materialExpense) || 0;
    const subExpense = machCost + labCost + matCost;

    if (isEmptyWet) {
      return {
        id: sp.id,
        acreNumber: sp.acreNumber,
        name: sp.name,
        acres: spAcres,
        acreStatus: status,
        sowingMethod: sp.sowingMethod,
        sowingDate: sp.sowingDate,
        fasalAgeDays: 0,
        cropVariety: sp.cropVariety || WET_EMPTY_ACRE_LABEL,
        soilHealth: sp.soilHealth || 91,
        moisturePct: sp.moisturePct || 92,
        machineryCost: machCost,
        labourCost: labCost,
        materialCost: matCost,
        totalExpense: subExpense,
        estimatedYieldQtl: 0,
        earnedIncome: 0,
        netProfit: -subExpense,
        profitMarginPct: 0,
      };
    }

    const estYield =
      sp.estimatedYieldQtl !== undefined
        ? sp.estimatedYieldQtl
        : Math.round(spAcres * defaultYield * 10) / 10;
    const rate = sp.grainRatePerQtl || defaultRate;
    const subIncome =
      sp.earnedIncome !== undefined
        ? sp.earnedIncome
        : Math.round(estYield * rate);

    const subProfit = subIncome - subExpense;
    const profitMarginPct =
      subIncome > 0 ? Math.round((subProfit / subIncome) * 100) : 0;

    return {
      id: sp.id,
      acreNumber: sp.acreNumber,
      name: sp.name,
      acres: spAcres,
      acreStatus: status,
      sowingMethod: sp.sowingMethod,
      sowingDate: sp.sowingDate,
      fasalAgeDays: ageMeta.days,
      cropVariety: sp.cropVariety || plot.crop,
      soilHealth: sp.soilHealth || 90,
      moisturePct: sp.moisturePct || 75,
      machineryCost: machCost,
      labourCost: labCost,
      materialCost: matCost,
      totalExpense: subExpense,
      estimatedYieldQtl: estYield,
      earnedIncome: subIncome,
      netProfit: subProfit,
      profitMarginPct,
    };
  });

  const totalMachinery = subPlots.reduce((acc, s) => acc + s.machineryCost, 0);
  const totalLabour = subPlots.reduce((acc, s) => acc + s.labourCost, 0);
  const totalMaterials = subPlots.reduce((acc, s) => acc + s.materialCost, 0);
  const totalExpense = subPlots.reduce((acc, s) => acc + s.totalExpense, 0);
  const totalCropIncome = subPlots.reduce((acc, s) => acc + s.earnedIncome, 0);
  const netProfit = totalCropIncome - totalExpense;

  return {
    plotName: plot.name,
    totalAcres,
    totalMachinery,
    totalLabour,
    totalMaterials,
    totalExpense,
    costPerAcre: Math.round(totalExpense / totalAcres),
    totalCropIncome,
    incomePerAcre: Math.round(totalCropIncome / totalAcres),
    netProfit,
    profitPerAcre: Math.round(netProfit / totalAcres),
    subPlots,
  };
};
