import React, { useState, useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  FarmPlot,
  WeatherData,
  Language,
  FarmDataStore,
  AcreSubPlot,
  PlotStage,
} from '../types/farm';
import { WeatherService } from '../services/weatherService';
import {
  calculatePolygonAcres,
  calculatePolygonCentroid,
  generateDefaultBoundary,
  generateAcreSubPlots,
  sliceOuterBoundaryIntoSubPolygons,
  isAcreEmptyOrWet,
  WET_EMPTY_ACRE_LABEL,
  WHEAT_DBW_327_LABEL,
  applyNarenBattarPresetToSubPlots,
  sowWetAcresOnBattar,
  formatDateDDMMYYYY,
  calculateFasalAgeAndStage,
} from '../utils/acreUtils';
import { ALL_CROP_VARIETIES } from '../constants/cropVarieties';
import { InteractiveSatelliteKhetMap } from './InteractiveSatelliteKhetMap';
import { AcreDemarcationModal } from './AcreDemarcationModal';
import { PerAcreProfitLossView } from './PerAcreProfitLossView';
import { PlotEditModal } from './PlotEditModal';
import { CropVarietiesExplorerModal } from './CropVarietiesExplorerModal';
import { PerAcreEntryForm } from './PerAcreEntryForm';
import {
  MapPin,
  Compass,
  Wind,
  Droplets,
  Sun,
  ShieldAlert,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Plus,
  LayoutGrid,
  Edit3,
  Navigation,
  Search,
  Check,
  Trash2,
  Undo2,
  Crosshair,
  Square,
  Layers,
  Calculator,
  ArrowRight,
  Maximize2,
  Minimize2,
  EyeOff,
  Eye,
  Bug,
  Stethoscope,
  Calendar,
} from 'lucide-react';

const MapCameraController: React.FC<{
  center: { lat: number; lng: number };
}> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !center) return;
    map.panTo(center);
  }, [map, center.lat, center.lng]);
  return null;
};

const GoogleMapShape: React.FC<{
  paths: Array<{ lat: number; lng: number }>;
  strokeColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  clickable?: boolean;
  onSelectPlot?: () => void;
  onForwardMapClick?: (lat: number, lng: number) => void;
}> = ({
  paths,
  strokeColor = '#10b981',
  fillColor = '#10b981',
  fillOpacity = 0.28,
  clickable = false,
  onSelectPlot,
  onForwardMapClick,
}) => {
  const map = useMap();

  useEffect(() => {
    const g = (window as any).google;
    if (!map || !g?.maps || !paths || paths.length < 2) return;

    if (paths.length === 2) {
      const line = new g.maps.Polyline({
        path: paths,
        strokeColor,
        strokeOpacity: 0.95,
        strokeWeight: 4,
        map,
        clickable: false,
      });
      return () => {
        line.setMap(null);
      };
    }

    const poly = new g.maps.Polygon({
      paths,
      strokeColor,
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor,
      fillOpacity,
      map,
      clickable,
    });

    let listener: any = null;
    if (clickable) {
      listener = poly.addListener('click', (e: any) => {
        if (onForwardMapClick && e?.latLng) {
          onForwardMapClick(e.latLng.lat(), e.latLng.lng());
        } else if (onSelectPlot) {
          onSelectPlot();
        }
      });
    }

    return () => {
      if (listener && g?.maps?.event) {
        g.maps.event.removeListener(listener);
      }
      poly.setMap(null);
    };
  }, [
    map,
    paths,
    strokeColor,
    fillColor,
    fillOpacity,
    clickable,
    onSelectPlot,
    onForwardMapClick,
  ]);

  return null;
};

interface FarmMapProps {
  plots: FarmPlot[];
  store?: FarmDataStore;
  onSaveStore?: (newStore: FarmDataStore) => void;
  onSelectPlot?: (plot: FarmPlot) => void;
  onUpdatePlot?: (plot: FarmPlot, oldName?: string) => void;
  onAddNewPlot?: (plot: FarmPlot) => void;
  onDeletePlot?: (plotId: string) => void;
  onNavigateToHisab?: (plotName: string) => void;
  language: Language;
}

const DEFAULT_CENTER = { lat: 29.6857, lng: 76.9905 };

export type MapToolMode =
  | 'draw_boundary'
  | 'mark_acres'
  | 'pick_location'
  | 'inspect';

const STANDARD_FARM_WORKS = [
  'रोटावेटर जुताई',
  'लेजर लेवलिंग',
  'सुपर सीडर बिजाई',
  'DAP बुवाई खाद',
  'पहली कोर सिंचाई',
  'दूसरी सिंचाई',
  'यूरिया टॉप ड्रेसिंग',
  'जिंक व सल्फर खाद',
  'खरपतवार नाशक स्प्रे',
  'कीटनाशक / फफूंदनाशक स्प्रे',
  'कंबाइन कटाई',
];

const STAGE_OPTIONS: Array<{ value: PlotStage; label: string }> = [
  { value: 'tilling', label: '🚜 जुताई / खेत तैयारी (Tilling)' },
  { value: 'sowing', label: '🌱 बिजाई व अंकुरण (Sowing)' },
  { value: 'growing', label: '🌾 वानस्पतिक बढ़वार (Growing)' },
  { value: 'flowering', label: '🌻 बाली / फूल व दाना भराव (Flowering)' },
  { value: 'harvesting', label: '🌾 पककर कटाई तैयार (Harvesting)' },
];

interface PestAlertItem {
  id: string;
  pestName: string;
  cropTarget: string;
  severity: 'high' | 'medium' | 'low';
  distanceInfo: string;
  symptoms: string;
  remedy: string;
  dosagePerAcre: string;
}

const buildNearbyPestAndDiseaseAlerts = (
  crop: string,
  weather: WeatherData | null,
  locationLabel: string
): PestAlertItem[] => {
  const c = (crop || '').toLowerCase();
  const humidity = weather?.humidity ?? 62;
  const temp = weather?.temperature ?? 24;
  const locShort = locationLabel.split(',')[0].trim() || 'आपके क्षेत्र';

  if (c.includes('paddy') || c.includes('धान') || c.includes('basmati')) {
    return [
      {
        id: 'pest-paddy-1',
        pestName: 'तना छेदक (Stem Borer / गोभ की सुंडी)',
        cropTarget: 'धान / बासमती',
        severity: humidity > 65 ? 'high' : 'medium',
        distanceInfo: `${locShort} के ~4 km दायरे में नमी (${humidity}%) के कारण सक्रिय`,
        symptoms:
          'पौधे की बीच वाली गोभ सूखकर पीली पड़ना (Dead Heart) और बालियां सफेद निकलना।',
        remedy:
          'क्लोरेंट्रानिलीप्रोल 18.5% SC (Coragen) या कार्टाप हाइड्रोक्लोराइड 4G का प्रयोग करें।',
        dosagePerAcre:
          'Coragen 60 ml को 150 लीटर पानी में मिलाकर प्रति एकड़ स्प्रे करें (या Cartap 4G @ 7.5 kg/एकड़)।',
      },
      {
        id: 'pest-paddy-2',
        pestName: 'शीथ ब्लाइट व गर्दन तोड़ (Sheath Blight & Neck Blast)',
        cropTarget: 'धान / बासमती',
        severity: 'medium',
        distanceInfo: `${locShort} के आस-पास नहर साइड खेतों में रिपोर्टेड`,
        symptoms:
          'तने के निचले हिस्से पर भूरे-हरे धब्बे और बाली की गर्दन काली पड़कर टूटना।',
        remedy:
          'एजोक्सिस्ट्रोबिन + टेबुकोनाजोल (Azoxystrobin + Tebuconazole) या ट्राइसाइक्लाजोल 75% WP का छिड़काव करें।',
        dosagePerAcre: '200 ml दवा को 180 लीटर पानी में मिलाकर प्रति एकड़ जड़ों व पत्तियों पर स्प्रे करें।',
      },
    ];
  }

  if (c.includes('mustard') || c.includes('सरसों')) {
    return [
      {
        id: 'pest-mustard-1',
        pestName: 'चेपा / माहू कीट (Mustard Aphids)',
        cropTarget: 'सरसों (Mustard)',
        severity: temp < 26 ? 'high' : 'medium',
        distanceInfo: `${locShort} के ~3.5 km रेडियस में बादल/ठंडक में प्रकोप`,
        symptoms:
          'फूलों और फलियों की टहनियों पर छोटे हरे-पीले कीटों का झुंड जो रस चूसकर फलियां सुखा देता है।',
        remedy:
          'इमिडाक्लोप्रिड 17.8% SL (Imidacloprid) या थायोमेथोक्साम 25% WG (Actara) का छिड़काव करें।',
        dosagePerAcre:
          'थायोमेथोक्साम 80 ग्राम या इमिडाक्लोप्रिड 70 ml को 150 लीटर पानी में मिलाकर शाम के समय प्रति एकड़ स्प्रे करें।',
      },
      {
        id: 'pest-mustard-2',
        pestName: 'सफेद रतुआ व झुलसा (White Rust & Alternaria Blight)',
        cropTarget: 'सरसों (Mustard)',
        severity: 'medium',
        distanceInfo: `${locShort} क्षेत्र में सुबह की ओस के कारण संभावित`,
        symptoms:
          'पत्तियों के नीचे सफेद फफोले और ऊपरी हिस्से पर काले-भूरे गोल धब्बे बनना।',
        remedy:
          'मैनकोजेब 75% WP (Indofil M-45) या मेटालैक्सिल + मैनकोजेब (Ridomil Gold) का स्प्रे करें।',
        dosagePerAcre: '600 ग्राम M-45 को 150 लीटर पानी में घोलकर प्रति एकड़ छिड़काव करें।',
      },
    ];
  }

  if (c.includes('sugar') || c.includes('गन्ना')) {
    return [
      {
        id: 'pest-sugar-1',
        pestName: 'अगेती चोटी बेधक व रेड रॉट (Early Shoot Borer & Red Rot)',
        cropTarget: 'गन्ना (Sugarcane)',
        severity: 'high',
        distanceInfo: `${locShort} के आस-पास गन्ना बेल्ट में निगरानी अलर्ट`,
        symptoms:
          'गन्ने की गोभ सूखना, पोरियों में छेद होना और गन्ना चीरने पर लाल रंग व सिरके जैसी गंध आना।',
        remedy:
          'क्लोरेंट्रानिलीप्रोल (Coragen) की ड्रेंचिंग और कार्बेन्डाजिम + मैनकोजेब का सुरक्षात्मक उपचार करें।',
        dosagePerAcre:
          'Coragen 150 ml को 400 लीटर पानी में मिलाकर गन्ने की जड़ों में प्रति एकड़ ड्रेंचिंग करें व सिंचाई करें।',
      },
    ];
  }

  // Default: Wheat (गेहूं) & Rabi Crops
  return [
    {
      id: 'pest-wheat-1',
      pestName: 'पीला रतुआ (Yellow Rust / धारीदार रतुआ)',
      cropTarget: 'गेहूं (Wheat)',
      severity: humidity >= 55 && temp <= 26 ? 'high' : 'medium',
      distanceInfo: `${locShort} से ~5 km दायरे में नमी (${humidity}%) व तापमान (${temp}°C) के कारण अलर्ट`,
      symptoms:
        'पत्तियों पर पीले रंग की धारियां बनना और हाथ लगाने पर पीला पाउडर (हल्दी जैसा) उंगलियों पर लगना।',
      remedy:
        'प्रोपिकोनाजोल 25% EC (Tilt) या टेबुकोनाजोल 25.9% EC (Folicur) का तुरंत छिड़काव करें।',
      dosagePerAcre:
        '200 ml Tilt (प्रोपिकोनाजोल) को 200 लीटर पानी में मिलाकर प्रति एकड़ साफ मौसम में स्प्रे करें।',
    },
    {
      id: 'pest-wheat-2',
      pestName: 'चेपा / माहू व तेला (Wheat Aphids & Jassids)',
      cropTarget: 'गेहूं (Wheat)',
      severity: 'medium',
      distanceInfo: `${locShort} के आस-पास बाली निकलने वाले खेतों में सक्रिय`,
      symptoms:
        'गेहूं की बालियों और पत्तियों पर हरे-काले छोटे कीट चिपककर दानों का दूध चूसते हैं।',
      remedy:
        'थायोमेथोक्साम 25% WG (Actara) का छिड़काव करें (यदि प्रति बाली 10 से अधिक चेपा दिखें)।',
      dosagePerAcre:
        '40–50 ग्राम थायोमेथोक्साम को 150 लीटर पानी में घोलकर प्रति एकड़ स्प्रे करें।',
    },
  ];
};

const getDaysAfterSowing = (sowingDate?: string): number => {
  if (!sowingDate) return 45;
  const sown = new Date(sowingDate).getTime();
  if (Number.isNaN(sown)) return 45;
  const diffDays = Math.floor((Date.now() - sown) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
};

export const FarmMap: React.FC<FarmMapProps> = ({
  plots,
  store,
  onSaveStore,
  onSelectPlot,
  onUpdatePlot,
  onAddNewPlot,
  onDeletePlot,
  onNavigateToHisab,
  language,
}) => {
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(envKey);
  const [mapLoadError, setMapLoadError] = useState<boolean>(false);
  const [useGoogleEngine, setUseGoogleEngine] = useState<boolean>(false);

  const [selectedPlot, setSelectedPlot] = useState<FarmPlot | null>(
    plots[0] || null
  );
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    plots[0]?.coordinates || DEFAULT_CENTER
  );
  const [mapType, setMapType] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [hideMapLabels, setHideMapLabels] = useState<boolean>(true);
  const [isMapFullScreen, setIsMapFullScreen] = useState<boolean>(false);

  const [activeWeather, setActiveWeather] = useState<WeatherData | null>(null);
  const [activeLocationLabel, setActiveLocationLabel] = useState<string>(
    plots[0]?.locationName || plots[0]?.name || 'कनाल साइड खेत'
  );

  // Modals and View tabs
  const [showDemarcationModal, setShowDemarcationModal] =
    useState<boolean>(false);
  const [demarcationPlotId, setDemarcationPlotId] = useState<string>(
    plots[0]?.id || ''
  );
  const [showPlotEditModal, setShowPlotEditModal] = useState<boolean>(false);
  const [editingPlotObj, setEditingPlotObj] = useState<FarmPlot | null>(null);
  const [showVarietiesModal, setShowVarietiesModal] = useState<boolean>(false);
  const [mapViewTab, setMapViewTab] = useState<
    'satellite' | 'acre_grid' | 'acre_pnl'
  >('satellite');
  const [selectedAcreSubPlot, setSelectedAcreSubPlot] =
    useState<AcreSubPlot | null>(null);

  // 2-Step Khet Marking & Manual Acre Division State
  const [toolMode, setToolMode] = useState<MapToolMode>('draw_boundary');
  const [isMarkingNewPlot, setIsMarkingNewPlot] = useState<boolean>(false);
  const [newPlotCustomName, setNewPlotCustomName] = useState<string>(
    `खेत नं. ${plots.length + 1} (नया चक)`
  );
  const [newPlotCrop, setNewPlotCrop] = useState<string>(
    'Wheat (गेहूं - DBW 303 / करण वैष्णवी)'
  );
  const [manualActualTotalAcres, setManualActualTotalAcres] = useState<string>(
    String(plots[0]?.acres || 4)
  );
  const [useManualAcresOverride, setUseManualAcresOverride] =
    useState<boolean>(false);

  // Step 2: Manual Multi-Point Acre Division & Expense Tracking State
  const [activeAcreToMark, setActiveAcreToMark] = useState<string>('1');
  const [editableSubPlots, setEditableSubPlots] = useState<AcreSubPlot[]>([]);
  const [draftAcreBoundaryPoints, setDraftAcreBoundaryPoints] = useState<
    Array<{ lat: number; lng: number }>
  >([]);
  const [isFreshAcreClickSession, setIsFreshAcreClickSession] =
    useState<boolean>(false);
  const [customWorkInput, setCustomWorkInput] = useState<string>('');

  // Track whether the user has started clicking fresh corners on the map
  const [isFreshClickSession, setIsFreshClickSession] =
    useState<boolean>(false);

  const [draftBoundaryPoints, setDraftBoundaryPoints] = useState<
    Array<{ lat: number; lng: number }>
  >(() => {
    const first = plots[0];
    if (!first) return [];
    if (first.boundaries && first.boundaries.length >= 3) {
      return first.boundaries;
    }
    return generateDefaultBoundary(
      first.coordinates?.lat || DEFAULT_CENTER.lat,
      first.coordinates?.lng || DEFAULT_CENTER.lng,
      first.acres
    );
  });

  const [markingNotification, setMarkingNotification] = useState<string | null>(
    null
  );

  // Location Search Bar state
  const [locationSearchQuery, setLocationSearchQuery] = useState<string>('');
  const [searchingLocation, setSearchingLocation] = useState<boolean>(false);

  // Keep selectedPlot & editableSubPlots synced with updated plots array (including Undo restorations)
  useEffect(() => {
    if (selectedPlot) {
      const updated = plots.find((p) => p.id === selectedPlot.id);
      if (updated) {
        setSelectedPlot(updated);
        if (updated.subPlots && updated.subPlots.length > 0) {
          setEditableSubPlots(updated.subPlots);
          if (selectedAcreSubPlot) {
            const matchedAcre = updated.subPlots.find(
              (s) => s.id === selectedAcreSubPlot.id
            );
            if (matchedAcre) {
              setSelectedAcreSubPlot(matchedAcre);
            }
          }
        }
      } else if (plots[0]) {
        setSelectedPlot(plots[0]);
      }
    } else if (plots[0]) {
      setSelectedPlot(plots[0]);
    }
  }, [plots]);

  // Sync draftBoundaryPoints & editableSubPlots when switching selected plot
  useEffect(() => {
    if (isMarkingNewPlot) return;
    if (selectedPlot) {
      setIsFreshClickSession(false);
      setManualActualTotalAcres(String(selectedPlot.acres));
      const cLat = selectedPlot.coordinates?.lat || DEFAULT_CENTER.lat;
      const cLng = selectedPlot.coordinates?.lng || DEFAULT_CENTER.lng;
      const outerBounds =
        selectedPlot.boundaries && selectedPlot.boundaries.length >= 3
          ? selectedPlot.boundaries
          : generateDefaultBoundary(cLat, cLng, selectedPlot.acres);
      setDraftBoundaryPoints(outerBounds);

      const initialSubs =
        selectedPlot.subPlots && selectedPlot.subPlots.length > 0
          ? selectedPlot.subPlots
          : generateAcreSubPlots(
              selectedPlot.id,
              selectedPlot.name,
              selectedPlot.acres,
              cLat,
              cLng,
              selectedPlot.crop,
              outerBounds
            );

      const sliced = sliceOuterBoundaryIntoSubPolygons(
        outerBounds,
        initialSubs.map((s) => Number(s.acres) || 1)
      );

      const hydratedSubs: AcreSubPlot[] = initialSubs.map((sp, idx) => {
        const emptyWet = isAcreEmptyOrWet(sp);
        const mach = Number(sp.machineryExpense) || 0;
        const lab = Number(sp.labourExpense) || 0;
        const mat = Number(sp.materialExpense) || 0;
        const cropVar =
          sp.cropVariety ||
          (emptyWet ? WET_EMPTY_ACRE_LABEL : selectedPlot.crop);
        return {
          ...sp,
          acreStatus: sp.acreStatus || (emptyWet ? 'Empty' : 'Seeded'),
          sowingMethod:
            sp.sowingMethod || (emptyWet ? undefined : 'Super Seeder'),
          cropName: emptyWet
            ? 'खाली खेत (गीला / बतर बाकी)'
            : sp.cropName || cropVar.split('(')[0].trim() || 'गेहूं (Wheat)',
          cropVariety: cropVar,
          sowingDate: emptyWet
            ? ''
            : sp.sowingDate || selectedPlot.sowingDate || '2026-11-05',
          stage: emptyWet
            ? 'tilling'
            : sp.stage || selectedPlot.stage || 'sowing',
          moisturePct: emptyWet ? sp.moisturePct || 92 : sp.moisturePct || 68,
          completedActivities:
            sp.completedActivities && sp.completedActivities.length > 0
              ? sp.completedActivities
              : emptyWet
              ? ['खेत गीला है — बतर आने का इंतजार (बिजाई बाकी)']
              : ['सुपर सीडर बिजाई (DBW 327)'],
          boundaries:
            sp.boundaries && sp.boundaries.length >= 3
              ? sp.boundaries
              : sliced[idx]?.boundaries,
          coordinates: sp.coordinates || sliced[idx]?.centroid,
          machineryExpense: mach,
          labourExpense: lab,
          materialExpense: mat,
          allocatedExpense: mach + lab + mat,
        };
      });

      setEditableSubPlots(hydratedSubs);
      if (hydratedSubs[0]) {
        setActiveAcreToMark(String(hydratedSubs[0].acreNumber));
        setSelectedAcreSubPlot(hydratedSubs[0]);
        setDraftAcreBoundaryPoints(hydratedSubs[0].boundaries || []);
        setIsFreshAcreClickSession(false);
      }
    }
  }, [selectedPlot?.id, isMarkingNewPlot]);

  // Sync draftAcreBoundaryPoints whenever the user switches activeAcreToMark
  useEffect(() => {
    const targetSp = editableSubPlots.find(
      (sp) => String(sp.acreNumber) === String(activeAcreToMark)
    );
    if (targetSp) {
      setDraftAcreBoundaryPoints(targetSp.boundaries || []);
    }
  }, [activeAcreToMark]);

  useEffect(() => {
    fetch('/api/maps/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey && data.apiKey !== 'MY_GOOGLE_MAPS_API_KEY') {
          setApiKey(data.apiKey);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleProjectError = () => {
      setMapLoadError(true);
      setUseGoogleEngine(false);
    };
    window.addEventListener('gmp-project-error', handleProjectError);
    return () =>
      window.removeEventListener('gmp-project-error', handleProjectError);
  }, []);

  useEffect(() => {
    const initCoords = plots[0]?.coordinates || DEFAULT_CENTER;
    loadWeatherData(
      initCoords.lat,
      initCoords.lng,
      plots[0]?.name || 'कनाल साइड खेत'
    );
  }, []);

  const showToast = (msg: string) => {
    setMarkingNotification(msg);
    setTimeout(() => setMarkingNotification(null), 4200);
  };

  const loadWeatherData = async (lat: number, lon: number, label: string) => {
    setActiveLocationLabel(label);
    try {
      const resolvedLabel = await WeatherService.reverseGeocodeKhet(
        lat,
        lon,
        label
      );
      setActiveLocationLabel(resolvedLabel);
      const data = await WeatherService.getWeather(lat, lon, resolvedLabel);
      setActiveWeather(data);
    } catch {
      // ignore weather error
    }
  };

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = locationSearchQuery.trim();
    if (!q) return;

    const coordMatch = q.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      setMapCenter({ lat, lng });
      loadWeatherData(lat, lng, `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      showToast(
        `📍 नक्शा (${lat.toFixed(4)}, ${lng.toFixed(4)}) पर पहुंच गया! अब खेत के कोने क्लिक करें।`
      );
      return;
    }

    setSearchingLocation(true);
    try {
      const resp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          q
        )}&count=1&language=en&format=json`
      );
      const data = await resp.json();
      if (data?.results?.length > 0) {
        const place = data.results[0];
        const lat = Number(place.latitude.toFixed(6));
        const lng = Number(place.longitude.toFixed(6));
        const label = `${place.name}${place.admin1 ? ', ' + place.admin1 : ''}`;
        setMapCenter({ lat, lng });
        loadWeatherData(lat, lng, label);
        showToast(
          `📍 "${label}" का सैटेलाइट नक्शा खुल गया! अब Step 1 में पूरे खेत के कोने (P1, P2, P3, P4) मार्क करें।`
        );
      } else {
        showToast(
          '⚠️ यह स्थान नहीं मिला, कृपया जिला या तहसील का नाम लिखें (जैसे Karnal, Gharaunda, Panipat, Hisar)'
        );
      }
    } catch {
      showToast(
        '⚠️ लोकेशन खोजने में त्रुटि, कृपया सीधे नक्शे को खिसकाकर अपना खेत चुनें।'
      );
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleUseMyGPS = () => {
    if (!('geolocation' in navigator)) {
      showToast('⚠️ आपके ब्राउज़र में GPS उपलब्ध नहीं है।');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setMapCenter({ lat, lng });
        loadWeatherData(lat, lng, 'मेरी लाइव GPS लोकेशन');
        showToast(
          `📍 आपकी लाइव GPS लोकेशन (${lat.toFixed(4)}, ${lng.toFixed(4)}) खुल गई! अब खेत के कोने मार्क करें।`
        );
      },
      () => {
        showToast(
          '⚠️ GPS अनुमति नहीं मिली — ऊपर गांव का नाम खोजें या नक्शे पर सीधे क्लिक करें।'
        );
      },
      { timeout: 6000 }
    );
  };

  const applyNewFarmlandCoordinates = (
    lat: number,
    lng: number,
    placeLabel?: string
  ) => {
    const cleanLat = Number(lat.toFixed(6));
    const cleanLng = Number(lng.toFixed(6));
    setMapCenter({ lat: cleanLat, lng: cleanLng });
    loadWeatherData(
      cleanLat,
      cleanLng,
      placeLabel ||
        `${(selectedPlot?.name || 'फार्म').split('(')[0]} (${cleanLat.toFixed(
          4
        )}, ${cleanLng.toFixed(4)})`
    );

    const targetPlot = selectedPlot || plots[0];
    if (targetPlot && onUpdatePlot) {
      const newBoundary = generateDefaultBoundary(
        cleanLat,
        cleanLng,
        targetPlot.acres
      );
      const newSubPlots = generateAcreSubPlots(
        targetPlot.id,
        targetPlot.name,
        targetPlot.acres,
        cleanLat,
        cleanLng,
        targetPlot.crop,
        newBoundary
      );
      const updatedPlot: FarmPlot = {
        ...targetPlot,
        coordinates: { lat: cleanLat, lng: cleanLng },
        boundaries: newBoundary,
        subPlots: newSubPlots,
      };
      setSelectedPlot(updatedPlot);
      setDraftBoundaryPoints(newBoundary);
      setEditableSubPlots(newSubPlots);
      setIsFreshClickSession(true);
      onUpdatePlot(updatedPlot);
      showToast(
        `✅ "${(targetPlot.name || 'खेत').split('(')[0].trim()}" की लोकेशन और बाहरी बाउंड्री यहाँ सेट हो गई!`
      );
    }
  };

  // Unified coordinate click handler for Satellite Map
  const handleCoordinateAction = (lat: number, lng: number) => {
    const cleanLat = Number(lat.toFixed(6));
    const cleanLng = Number(lng.toFixed(6));

    if (toolMode === 'pick_location') {
      applyNewFarmlandCoordinates(cleanLat, cleanLng);
      setToolMode('draw_boundary');
      return;
    }

    // STEP 1: Click Corners P1, P2, P3, P4 for the Outer Khet Boundary
    if (toolMode === 'draw_boundary') {
      setDraftBoundaryPoints((prev) => {
        const basePoints = isFreshClickSession ? prev : [];
        const next = [...basePoints, { lat: cleanLat, lng: cleanLng }];
        const calcAc = next.length >= 3 ? calculatePolygonAcres(next) : 0;
        if (calcAc > 0 && !useManualAcresOverride) {
          setManualActualTotalAcres(String(calcAc));
        }
        const acresCalc =
          next.length >= 3
            ? ` — कुल रकबा: ${calcAc} एकड़ (${(calcAc * 4.8).toFixed(1)} बीघा)`
            : ` — अब अगला कोना (P${next.length + 1}) नक्शे पर क्लिक करें`;
        showToast(`📍 बाहरी बाउंड्री कोना P${next.length} मार्क हुआ!${acresCalc}`);
        return next;
      });
      setIsFreshClickSession(true);
      return;
    }

    // STEP 2: Click on map to add Multi-Point Corner Markers (A1, A2, A3, A4...) for the active Acre (#activeAcreToMark)
    if (toolMode === 'mark_acres') {
      const targetPlot = selectedPlot || plots[0];
      if (!targetPlot) return;

      const basePoints = isFreshAcreClickSession ? draftAcreBoundaryPoints : [];
      const nextAcrePoints = [...basePoints, { lat: cleanLat, lng: cleanLng }];
      setDraftAcreBoundaryPoints(nextAcrePoints);
      setIsFreshAcreClickSession(true);

      const calcAcres =
        nextAcrePoints.length >= 3
          ? calculatePolygonAcres(nextAcrePoints)
          : undefined;
      const centroid =
        nextAcrePoints.length >= 3
          ? calculatePolygonCentroid(nextAcrePoints)
          : { lat: cleanLat, lng: cleanLng };

      const updatedSubPlots = editableSubPlots.map((sp) => {
        if (String(sp.acreNumber) !== String(activeAcreToMark)) return sp;
        return {
          ...sp,
          acres: calcAcres && calcAcres > 0 ? calcAcres : sp.acres,
          coordinates: centroid,
          boundaries: nextAcrePoints,
        };
      });

      setEditableSubPlots(updatedSubPlots);
      const matched = updatedSubPlots.find(
        (sp) => String(sp.acreNumber) === String(activeAcreToMark)
      );
      if (matched) setSelectedAcreSubPlot(matched);

      const totalMarkedAcres = Number(
        updatedSubPlots
          .reduce((acc, s) => acc + (Number(s.acres) || 0), 0)
          .toFixed(2)
      );

      const updatedPlot: FarmPlot = {
        ...targetPlot,
        acres: totalMarkedAcres > 0 ? totalMarkedAcres : targetPlot.acres,
        subPlots: updatedSubPlots,
      };
      setSelectedPlot(updatedPlot);
      if (onUpdatePlot) {
        onUpdatePlot(updatedPlot);
      }

      if (nextAcrePoints.length < 3) {
        showToast(
          `📍 एकड़ #${activeAcreToMark} का कोना A${nextAcrePoints.length} मार्क हुआ! अब अगला कोना (A${
            nextAcrePoints.length + 1
          }) नक्शे पर क्लिक करें।`
        );
      } else {
        showToast(
          `✅ एकड़ #${activeAcreToMark} का कोना A${nextAcrePoints.length} मार्क हुआ (रकबा: ${calcAcres} एकड़)! और कोने जोड़ें या "अगला एकड़ मार्क करें →" दबाएं।`
        );
      }
      return;
    }

    loadWeatherData(
      cleanLat,
      cleanLng,
      `फील्ड स्पॉट (${cleanLat.toFixed(4)}, ${cleanLng.toFixed(4)})`
    );
  };

  // Dragging any outer boundary corner P1, P2, P3, P4 on the satellite map
  const handleDragBoundaryPoint = (
    idx: number,
    newLat: number,
    newLng: number
  ) => {
    setIsFreshClickSession(true);
    setDraftBoundaryPoints((prev) => {
      const updated = prev.map((pt, i) =>
        i === idx ? { lat: newLat, lng: newLng } : pt
      );
      if (updated.length >= 3) {
        const ac = calculatePolygonAcres(updated);
        if (!useManualAcresOverride) {
          setManualActualTotalAcres(String(ac));
        }
        showToast(
          `📐 कोना P${idx + 1} खिसकाया गया — नया रकबा: ${ac} एकड़ (${(
            ac * 4.8
          ).toFixed(1)} बीघा)`
        );
      }
      return updated;
    });
  };

  // Dragging any Multi-Point Corner (A1, A2, A3, A4...) of the active Acre on the satellite map!
  const handleDragAcreBoundaryPoint = (
    idx: number,
    newLat: number,
    newLng: number
  ) => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;

    setIsFreshAcreClickSession(true);
    const updatedPts = draftAcreBoundaryPoints.map((pt, i) =>
      i === idx ? { lat: newLat, lng: newLng } : pt
    );
    setDraftAcreBoundaryPoints(updatedPts);

    const calcAc =
      updatedPts.length >= 3 ? calculatePolygonAcres(updatedPts) : undefined;
    const centroid =
      updatedPts.length >= 3
        ? calculatePolygonCentroid(updatedPts)
        : updatedPts[0] || { lat: newLat, lng: newLng };

    const updatedSubPlots = editableSubPlots.map((sp) => {
      if (String(sp.acreNumber) !== String(activeAcreToMark)) return sp;
      return {
        ...sp,
        acres: calcAc && calcAc > 0 ? calcAc : sp.acres,
        coordinates: centroid,
        boundaries: updatedPts,
      };
    });

    setEditableSubPlots(updatedSubPlots);
    const matched = updatedSubPlots.find(
      (sp) => String(sp.acreNumber) === String(activeAcreToMark)
    );
    if (matched) setSelectedAcreSubPlot(matched);

    const updatedPlot: FarmPlot = {
      ...targetPlot,
      subPlots: updatedSubPlots,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }

    if (calcAc) {
      showToast(
        `📐 एकड़ #${activeAcreToMark} का कोना A${idx + 1} खिसकाया गया — रकबा: ${calcAc} एकड़`
      );
    }
  };

  // Dragging any Acre Center Pin (#1, #2, #3...) shifts that entire Acre polygon on the satellite map!
  const handleDragAcrePin = (
    subPlotId: string,
    newLat: number,
    newLng: number
  ) => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;

    let shiftedBoundsForActive: Array<{ lat: number; lng: number }> | null =
      null;

    const updatedSubPlots = editableSubPlots.map((sp) => {
      if (sp.id !== subPlotId) return sp;
      let nextBounds = sp.boundaries;
      if (sp.coordinates && sp.boundaries && sp.boundaries.length >= 1) {
        const dLat = newLat - sp.coordinates.lat;
        const dLng = newLng - sp.coordinates.lng;
        nextBounds = sp.boundaries.map((b) => ({
          lat: Number((b.lat + dLat).toFixed(6)),
          lng: Number((b.lng + dLng).toFixed(6)),
        }));
      }
      if (String(sp.acreNumber) === String(activeAcreToMark) && nextBounds) {
        shiftedBoundsForActive = nextBounds;
      }
      return {
        ...sp,
        coordinates: { lat: newLat, lng: newLng },
        boundaries: nextBounds,
      };
    });

    if (shiftedBoundsForActive) {
      setDraftAcreBoundaryPoints(shiftedBoundsForActive);
    }
    setEditableSubPlots(updatedSubPlots);
    const movedSp = updatedSubPlots.find((s) => s.id === subPlotId);
    if (movedSp) {
      setActiveAcreToMark(String(movedSp.acreNumber));
      setSelectedAcreSubPlot(movedSp);
      if (movedSp.boundaries) {
        setDraftAcreBoundaryPoints(movedSp.boundaries);
      }
      showToast(
        `📍 एकड़ #${movedSp.acreNumber} (${newLat.toFixed(4)}, ${newLng.toFixed(4)}) पर खिसकाया गया!`
      );
    }

    const updatedPlot: FarmPlot = {
      ...targetPlot,
      subPlots: updatedSubPlots,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }
  };

  // Clear active Acre's corners so farmer can click fresh Multi-Point Corners (A1, A2, A3, A4...)
  const handleStartFreshAcreCorners = (targetAcreNum?: string) => {
    const numToClear = targetAcreNum || activeAcreToMark;
    setActiveAcreToMark(String(numToClear));
    setDraftAcreBoundaryPoints([]);
    setIsFreshAcreClickSession(true);
    setEditableSubPlots((prev) =>
      prev.map((sp) =>
        String(sp.acreNumber) === String(numToClear)
          ? { ...sp, boundaries: [], coordinates: undefined }
          : sp
      )
    );
    showToast(
      `🎯 एकड़ #${numToClear} के कोने साफ कर दिए गए! अब नक्शे पर क्लिक करके इसके कोने (A1, A2, A3, A4...) मार्क करें।`
    );
  };

  // Place a 4-corner draggable 1-acre box for the active Acre
  const handlePlace4CornersForActiveAcre = () => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const box = generateDefaultBoundary(mapCenter.lat, mapCenter.lng, 1.0);
    setDraftAcreBoundaryPoints(box);
    setIsFreshAcreClickSession(true);
    const centroid = calculatePolygonCentroid(box);
    const updatedSubs = editableSubPlots.map((sp) =>
      String(sp.acreNumber) === String(activeAcreToMark)
        ? { ...sp, acres: 1.0, coordinates: centroid, boundaries: box }
        : sp
    );
    setEditableSubPlots(updatedSubs);
    const updatedPlot: FarmPlot = { ...targetPlot, subPlots: updatedSubs };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) onUpdatePlot(updatedPlot);
    showToast(
      `🔲 एकड़ #${activeAcreToMark} के 4 कोने (A1, A2, A3, A4) रख दिए गए हैं! इन्हें पकड़कर (Drag) अपने एकड़ के कोनों पर सेट करें।`
    );
  };

  const [markingCompletedBanner, setMarkingCompletedBanner] = useState(false);

  // Save current Acre's multi-point boundary and immediately move to the next Acre (or create a new one) for multi-point marking!
  const handleConfirmCurrentAcreAndNext = () => {
    const currentIdx = editableSubPlots.findIndex(
      (sp) => String(sp.acreNumber) === String(activeAcreToMark)
    );
    if (currentIdx >= 0 && currentIdx < editableSubPlots.length - 1) {
      const nextSp = editableSubPlots[currentIdx + 1];
      setActiveAcreToMark(String(nextSp.acreNumber));
      setSelectedAcreSubPlot(nextSp);
      setDraftAcreBoundaryPoints(nextSp.boundaries || []);
      setIsFreshAcreClickSession(false);
      showToast(
        `✅ एकड़ #${activeAcreToMark} सेव हो गया! अब नक्शे पर क्लिक करके "एकड़ #${nextSp.acreNumber}" के कोने (A1, A2, A3, A4...) मार्क करें!`
      );
    } else {
      // Create a fresh next Acre with empty boundaries so the farmer can immediately click A1, A2, A3, A4 on the map!
      handleAddManualAcreRow(true);
    }
  };

  // Finalize & Save All Marked Acres + Outer Khet Boundary ("Marking Complete & Save All")
  const handleCompleteAllAcreMarkingAndSave = () => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;

    // Sync any active draftAcreBoundaryPoints into the active acre
    const syncedList = editableSubPlots.map((sp) => {
      if (
        String(sp.acreNumber) === String(activeAcreToMark) &&
        draftAcreBoundaryPoints.length >= 3
      ) {
        const calcAc = calculatePolygonAcres(draftAcreBoundaryPoints);
        const cent = calculatePolygonCentroid(draftAcreBoundaryPoints);
        return {
          ...sp,
          acres: calcAc > 0 ? calcAc : sp.acres,
          boundaries: draftAcreBoundaryPoints,
          coordinates: cent,
        };
      }
      if (sp.boundaries && sp.boundaries.length >= 3) {
        const calcAc = calculatePolygonAcres(sp.boundaries);
        const cent = calculatePolygonCentroid(sp.boundaries);
        return {
          ...sp,
          acres: calcAc > 0 ? calcAc : sp.acres,
          coordinates: sp.coordinates || cent,
        };
      }
      return sp;
    });

    // If the user clicked "+ अगला एकड़" and left the very last acre empty (0 points) while earlier acres have points, drop the trailing empty placeholder
    const markedCount = syncedList.filter(
      (sp) => (sp.boundaries && sp.boundaries.length >= 3) || sp.coordinates
    ).length;
    const cleanedSubs =
      markedCount >= 1 && syncedList.length > 1
        ? syncedList
            .filter(
              (sp, idx) =>
                idx < syncedList.length - 1 ||
                (sp.boundaries && sp.boundaries.length >= 3) ||
                Boolean(sp.coordinates)
            )
            .map((sp, idx) => ({
              ...sp,
              acreNumber: idx + 1,
              name: sp.name?.includes('एकड़ #')
                ? `एकड़ #${idx + 1} (चक ${idx + 1})`
                : sp.name || `एकड़ #${idx + 1}`,
            }))
        : syncedList;

    const totalSavedAcres = Number(
      cleanedSubs
        .reduce((acc, s) => acc + (Number(s.acres) || 0), 0)
        .toFixed(2)
    );

    const outerPts =
      draftBoundaryPoints.length >= 3
        ? draftBoundaryPoints
        : targetPlot.boundaries && targetPlot.boundaries.length >= 3
        ? targetPlot.boundaries
        : [];

    const outerCentroid =
      outerPts.length >= 3
        ? calculatePolygonCentroid(outerPts)
        : targetPlot.coordinates || mapCenter;

    const updatedPlot: FarmPlot = {
      ...targetPlot,
      acres: totalSavedAcres > 0 ? totalSavedAcres : targetPlot.acres,
      coordinates: outerCentroid,
      boundaries: outerPts.length >= 3 ? outerPts : targetPlot.boundaries,
      subPlots: cleanedSubs,
      currentActivity: `${cleanedSubs.length} एकड़ मल्टी-पॉइंट मार्किंग पूर्ण व सेव`,
    };

    setEditableSubPlots(cleanedSubs);
    if (cleanedSubs[0]) {
      setSelectedAcreSubPlot(cleanedSubs[0]);
      setActiveAcreToMark(String(cleanedSubs[0].acreNumber));
      setDraftAcreBoundaryPoints(cleanedSubs[0].boundaries || []);
    }
    setIsFreshAcreClickSession(false);
    setSelectedPlot(updatedPlot);
    setManualActualTotalAcres(String(updatedPlot.acres));
    setToolMode('inspect');
    setIsMapFullScreen(false);
    setMarkingCompletedBanner(true);

    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }

    showToast(
      `🎉 मार्किंग पूरी! "${(updatedPlot.name || 'खेत').split('(')[0].trim()}" के सभी ${cleanedSubs.length} एकड़ (${updatedPlot.acres} Ac) सेव हो गए और सिमुलेशन मैप से जुड़ गए!`
    );
  };

  // Reset all fixed/auto acres so farmer can mark Acre #1, #2, #3... from scratch using Multi-Point Markers
  const handleResetAllAcresForManualMultiPointMarking = () => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const baseCrop =
      targetPlot.crop || 'Wheat (गेहूं - DBW 303 / करण वैष्णवी)';
    const firstCustomAcre: AcreSubPlot = {
      id: `${targetPlot.id}-acre-${Date.now()}-1`,
      acreNumber: 1,
      name: 'एकड़ #1 (चक 1)',
      acres: 1.0,
      cropName: baseCrop.split('(')[0].trim() || 'गेहूं (Wheat)',
      cropVariety: baseCrop,
      sowingDate: targetPlot.sowingDate || '2025-11-15',
      stage: targetPlot.stage || 'growing',
      completedActivities: ['रोटावेटर जुताई', 'सुपर सीडर बिजाई'],
      notes: 'दोमट (Loamy) · ट्यूबवेल + नहर',
      machineryExpense: 4200,
      labourExpense: 3150,
      materialExpense: 6500,
      allocatedExpense: 13850,
      earnedIncome: 52000,
      estimatedYieldQtl: 22,
      boundaries: [],
      coordinates: undefined,
    };
    setEditableSubPlots([firstCustomAcre]);
    setSelectedAcreSubPlot(firstCustomAcre);
    setActiveAcreToMark('1');
    setDraftAcreBoundaryPoints([]);
    setIsFreshAcreClickSession(true);
    setToolMode('mark_acres');
    const updatedPlot: FarmPlot = {
      ...targetPlot,
      subPlots: [firstCustomAcre],
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) onUpdatePlot(updatedPlot);
    showToast(
      '🎯 अब कोई भी फिक्स एकड़ नहीं है! नक्शे पर क्लिक करके "एकड़ #1" के मल्टी-पॉइंट कोने (A1, A2, A3, A4...) मार्क करें!'
    );
  };

  // Start fresh outer khet boundary marking on the map (Step 1) — opens Full Screen Map automatically!
  const handleStartFreshBoundaryMarking = (
    asNewPlot = false,
    openFullScreen = true
  ) => {
    if (!selectedPlot && plots[0]) {
      setSelectedPlot(plots[0]);
    }
    setIsMarkingNewPlot(asNewPlot);
    setIsFreshClickSession(true);
    setHideMapLabels(true);
    if (openFullScreen) {
      setIsMapFullScreen(true);
    }
    if (asNewPlot) {
      setNewPlotCustomName(`खेत नं. ${plots.length + 1} (नया चक)`);
      setUseManualAcresOverride(false);
    }
    setDraftBoundaryPoints([]);
    setToolMode('draw_boundary');
    showToast(
      '🎯 Step 1: सैटेलाइट नक्शे पर अपने पूरे खेत के बाहरी कोने (P1, P2, P3, P4) क्लिक करें!'
    );
  };

  const handlePlace4CornerBoxAtCenter = () => {
    const acresToUse =
      Number(manualActualTotalAcres) > 0
        ? Number(manualActualTotalAcres)
        : selectedPlot?.acres || 4.0;
    const box = generateDefaultBoundary(
      mapCenter.lat,
      mapCenter.lng,
      acresToUse
    );
    setDraftBoundaryPoints(box);
    setIsFreshClickSession(true);
    setToolMode('draw_boundary');
    showToast(
      '🔲 नक्शे के बीच में 4-कोने (P1, P2, P3, P4) रख दिए गए हैं! इन्हें पकड़कर अपने पूरे खेत की मेड़ पर सेट करें।'
    );
  };

  // Save Step 1 (Outer Khet Boundary) and switch to Step 2 (Multi-Point Acre Marking — NOT fixed strips!)
  const handleSaveBoundaryPoints = (proceedToStep2 = false) => {
    if (draftBoundaryPoints.length < 3) {
      showToast(
        '⚠️ पूरे खेत की बाउंड्री सेव करने के लिए नक्शे पर कम से कम 3 कोने (P1, P2, P3) क्लिक करें!'
      );
      return;
    }

    const centroid = calculatePolygonCentroid(draftBoundaryPoints);
    const gpsCalculatedAcres = calculatePolygonAcres(draftBoundaryPoints);
    const parsedManualAcres = Number(manualActualTotalAcres);
    const finalAcres =
      useManualAcresOverride && parsedManualAcres > 0
        ? Number(parsedManualAcres.toFixed(2))
        : gpsCalculatedAcres;

    const baseCrop =
      (isMarkingNewPlot ? newPlotCrop : selectedPlot?.crop) ||
      'Wheat (गेहूं - DBW 303 / करण वैष्णवी)';

    // Create Acre #1 with empty boundaries and ₹0 auto-expense so the farmer can mark every acre manually and enter expenses via the Per-Acre Form!
    const firstManualAcre: AcreSubPlot = {
      id: `acre-${Date.now()}-1`,
      acreNumber: 1,
      name: 'एकड़ #1 (चक 1)',
      acres: 1.0,
      acreStatus: 'Empty',
      cropName: 'खाली खेत (गीला / बतर बाकी)',
      cropVariety: WET_EMPTY_ACRE_LABEL,
      sowingDate: '',
      stage: 'tilling',
      completedActivities: ['खाली खेत — प्रति-एकड़ फॉर्म में स्टेटस व खर्च दर्ज करें'],
      notes: 'दोमट (Loamy) · ट्यूबवेल + नहर',
      machineryExpense: 0,
      labourExpense: 0,
      materialExpense: 0,
      allocatedExpense: 0,
      expenseEntries: [],
      earnedIncome: 0,
      estimatedYieldQtl: 0,
      boundaries: [],
      coordinates: undefined,
    };

    if (isMarkingNewPlot && onAddNewPlot) {
      const newId = 'plot-' + Date.now();
      const plotTitle =
        newPlotCustomName.trim() ||
        `खेत नं. ${plots.length + 1} (${finalAcres} एकड़)`;
      const newPlot: FarmPlot = {
        id: newId,
        name: plotTitle,
        crop: baseCrop,
        acres: finalAcres,
        stage: 'growing',
        progressPct: 50,
        soilHealth: 90,
        moisturePct: 75,
        sowingDate: new Date().toISOString().split('T')[0],
        expectedHarvestDate: '2026-04-15',
        currentActivity:
          'सैटेलाइट नक्शे पर पूरे खेत की बाउंड्री व मल्टी-पॉइंट एकड़ विभाजन सेट किया गया',
        notes: `${finalAcres} एकड़ (${draftBoundaryPoints.length} बाउंड्री पॉइंट्स)`,
        coordinates: centroid,
        boundaries: draftBoundaryPoints,
        subPlots: [firstManualAcre],
      };
      onAddNewPlot(newPlot);
      setSelectedPlot(newPlot);
      setEditableSubPlots([firstManualAcre]);
      setSelectedAcreSubPlot(firstManualAcre);
      setActiveAcreToMark('1');
      setDraftAcreBoundaryPoints([]);
      setIsFreshAcreClickSession(true);
      setIsMarkingNewPlot(false);
      setIsFreshClickSession(false);
      setMapCenter(centroid);
      loadWeatherData(centroid.lat, centroid.lng, plotTitle);
      if (proceedToStep2) {
        setToolMode('mark_acres');
        setHideMapLabels(true);
        showToast(
          `✅ Step 1 सेव! अब Step 2 में नक्शे पर क्लिक करके "एकड़ #1" के मल्टी-पॉइंट कोने (A1, A2, A3, A4...) अपने हिसाब से मार्क करें!`
        );
      } else {
        showToast(
          `✅ नया खेत "${plotTitle}" (${finalAcres} एकड़) सैटेलाइट नक्शे पर सेव हो गया!`
        );
      }
      return;
    }

    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;

    const updatedPlot: FarmPlot = {
      ...targetPlot,
      coordinates: centroid,
      acres: finalAcres,
      boundaries: draftBoundaryPoints,
      subPlots: [firstManualAcre],
    };

    setSelectedPlot(updatedPlot);
    setEditableSubPlots([firstManualAcre]);
    setSelectedAcreSubPlot(firstManualAcre);
    setActiveAcreToMark('1');
    setDraftAcreBoundaryPoints([]);
    setIsFreshAcreClickSession(true);
    setIsFreshClickSession(false);
    setMapCenter(centroid);
    loadWeatherData(centroid.lat, centroid.lng, targetPlot.name);
    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }

    if (proceedToStep2) {
      setToolMode('mark_acres');
      setHideMapLabels(true);
      showToast(
        `✅ पूरे खेत की बाउंड्री सेव! अब नक्शे पर क्लिक करके "एकड़ #1" के मल्टी-पॉइंट कोने (A1, A2, A3, A4...) मार्क करें!`
      );
    } else {
      showToast(
        `✅ "${(targetPlot.name || 'खेत')
          .split('(')[0]
          .trim()}" की बाहरी बाउंड्री (${finalAcres} एकड़) सेव हो गई!`
      );
    }
  };

  // Optional Step 2 Helper: Auto-Slice the saved Outer Khet Boundary only if user explicitly asks for equal strips
  const handleSliceOuterBoundaryByManualAcres = (
    customSubPlots?: AcreSubPlot[]
  ) => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const listToSlice = customSubPlots || editableSubPlots;
    if (listToSlice.length === 0) return;

    const outerPts =
      draftBoundaryPoints.length >= 3
        ? draftBoundaryPoints
        : targetPlot.boundaries && targetPlot.boundaries.length >= 3
        ? targetPlot.boundaries
        : generateDefaultBoundary(
            targetPlot.coordinates?.lat || DEFAULT_CENTER.lat,
            targetPlot.coordinates?.lng || DEFAULT_CENTER.lng,
            targetPlot.acres
          );

    const weights = listToSlice.map((sp) =>
      Math.max(0.1, Number(sp.acres) || 1)
    );
    const slicedGeometries = sliceOuterBoundaryIntoSubPolygons(
      outerPts,
      weights
    );

    const updatedSubs = listToSlice.map((sp, idx) => ({
      ...sp,
      acreNumber: idx + 1,
      boundaries: slicedGeometries[idx]?.boundaries || sp.boundaries,
      coordinates: slicedGeometries[idx]?.centroid || sp.coordinates,
    }));

    const totalManualAcres = Number(
      updatedSubs
        .reduce((acc, s) => acc + (Number(s.acres) || 0), 0)
        .toFixed(2)
    );

    const updatedPlot: FarmPlot = {
      ...targetPlot,
      acres: totalManualAcres > 0 ? totalManualAcres : targetPlot.acres,
      boundaries: outerPts,
      subPlots: updatedSubs,
    };

    setEditableSubPlots(updatedSubs);
    const activeMatched =
      updatedSubs.find(
        (s) => String(s.acreNumber) === String(activeAcreToMark)
      ) || updatedSubs[0];
    if (activeMatched) {
      setDraftAcreBoundaryPoints(activeMatched.boundaries || []);
      setIsFreshAcreClickSession(false);
    }
    setSelectedPlot(updatedPlot);
    setManualActualTotalAcres(String(updatedPlot.acres));
    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }
    showToast(
      `📐 बाहरी बाउंड्री के अंदर सभी ${updatedSubs.length} एकड़ चक बराबर बांटे गए! आप किसी भी एकड़ के कोने (A1, A2, A3, A4) ड्रैग भी कर सकते हैं।`
    );
  };

  // Add a new Acre row for custom Multi-Point Corner Marking (does NOT overwrite other acres' custom polygons!)
  const handleAddManualAcreRow = (startEmptyMultiPoint = true) => {
    const targetPlot = selectedPlot || plots[0];
    const nextNum = editableSubPlots.length + 1;
    const baseCrop =
      targetPlot?.crop || 'Wheat (गेहूं - DBW 303 / करण वैष्णवी)';
    const newRow: AcreSubPlot = {
      id: `${targetPlot?.id || 'plot'}-acre-${Date.now()}`,
      acreNumber: nextNum,
      name: `एकड़ #${nextNum} (चक ${nextNum})`,
      acres: 1.0,
      acreStatus: 'Empty',
      cropName: 'खाली खेत (गीला / बतर बाकी)',
      cropVariety: WET_EMPTY_ACRE_LABEL,
      sowingDate: '',
      stage: 'tilling',
      completedActivities: ['खाली खेत — प्रति-एकड़ फॉर्म में स्टेटस व खर्च दर्ज करें'],
      notes: 'दोमट (Loamy) · ट्यूबवेल + नहर',
      machineryExpense: 0,
      labourExpense: 0,
      materialExpense: 0,
      allocatedExpense: 0,
      expenseEntries: [],
      earnedIncome: 0,
      estimatedYieldQtl: 0,
      boundaries: [],
      coordinates: undefined,
    };
    const nextList = [...editableSubPlots, newRow];
    setEditableSubPlots(nextList);
    setActiveAcreToMark(String(nextNum));
    setSelectedAcreSubPlot(newRow);
    setToolMode('mark_acres');
    if (startEmptyMultiPoint) {
      setDraftAcreBoundaryPoints([]);
      setIsFreshAcreClickSession(true);
    }
    if (targetPlot) {
      const updatedPlot: FarmPlot = {
        ...targetPlot,
        subPlots: nextList,
      };
      setSelectedPlot(updatedPlot);
      if (onUpdatePlot) onUpdatePlot(updatedPlot);
    }
    showToast(
      `🎯 "एकड़ #${nextNum}" जुड़ गया! अब नक्शे पर क्लिक करके एकड़ #${nextNum} के मल्टी-पॉइंट कोने (A1, A2, A3, A4...) मार्क करें!`
    );
  };

  const handleRemoveManualAcreRow = (idToRemove: string) => {
    if (editableSubPlots.length <= 1) {
      showToast('⚠️ खेत में कम से कम 1 एकड़/चक होना आवश्यक है।');
      return;
    }
    const filtered = editableSubPlots
      .filter((s) => s.id !== idToRemove)
      .map((s, i) => ({ ...s, acreNumber: i + 1 }));
    handleSliceOuterBoundaryByManualAcres(filtered);
  };

  const handleUpdateSingleAcreField = (
    acreId: string,
    field: keyof AcreSubPlot,
    value: any
  ) => {
    setEditableSubPlots((prev) => {
      const next = prev.map((sp) => {
        if (sp.id !== acreId) return sp;
        const updated: AcreSubPlot = {
          ...sp,
          [field]: value,
        };
        if (field === 'cropVariety' && typeof value === 'string') {
          updated.cropName = value.split('(')[0].trim();
        }
        if (
          field === 'machineryExpense' ||
          field === 'labourExpense' ||
          field === 'materialExpense'
        ) {
          const mach = Number(updated.machineryExpense) || 0;
          const lab = Number(updated.labourExpense) || 0;
          const mat = Number(updated.materialExpense) || 0;
          updated.allocatedExpense = mach + lab + mat;
        }
        return updated;
      });
      const matching = next.find((s) => s.id === acreId);
      if (matching && selectedAcreSubPlot?.id === acreId) {
        setSelectedAcreSubPlot(matching);
      }
      return next;
    });
  };

  const handleToggleAcreActivity = (acreId: string, workLabel: string) => {
    const target = editableSubPlots.find((s) => s.id === acreId);
    if (!target) return;
    const currentList = target.completedActivities || [];
    const exists = currentList.includes(workLabel);
    const nextList = exists
      ? currentList.filter((w) => w !== workLabel)
      : [...currentList, workLabel];
    handleUpdateSingleAcreField(acreId, 'completedActivities', nextList);
  };

  const handleSaveAllManualAcresAndExpenses = () => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const totalManualAcres = Number(
      editableSubPlots
        .reduce((acc, s) => acc + (Number(s.acres) || 0), 0)
        .toFixed(2)
    );
    const updatedPlot: FarmPlot = {
      ...targetPlot,
      acres: totalManualAcres > 0 ? totalManualAcres : targetPlot.acres,
      subPlots: editableSubPlots,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) {
      onUpdatePlot(updatedPlot);
    }
    showToast(
      `✅ सभी ${editableSubPlots.length} एकड़ का फसल विवरण, स्टेज, किए गए काम और खर्चा सेव हो गया!`
    );
  };

  // 1-Click Preset: Set Acre #5 and #6 to Wheat DBW 327, and all other Acres to Wet/Empty (Waiting for Battar)
  const handleApplyNarenDBW327AndWetPreset = () => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const baseList =
      editableSubPlots.length >= 6
        ? editableSubPlots
        : generateAcreSubPlots(
            targetPlot.id,
            targetPlot.name,
            Math.max(8, targetPlot.acres),
            targetPlot.coordinates?.lat || DEFAULT_CENTER.lat,
            targetPlot.coordinates?.lng || DEFAULT_CENTER.lng,
            WHEAT_DBW_327_LABEL,
            draftBoundaryPoints.length >= 3
              ? draftBoundaryPoints
              : targetPlot.boundaries
          );
    const nextSubs = applyNarenBattarPresetToSubPlots(baseList);
    setEditableSubPlots(nextSubs);
    const acre5 =
      nextSubs.find((s) => Number(s.acreNumber) === 5) || nextSubs[0];
    if (acre5) {
      setSelectedAcreSubPlot(acre5);
      setActiveAcreToMark(String(acre5.acreNumber));
    }
    const updatedPlot: FarmPlot = {
      ...targetPlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity:
        'एकड़ #5 व #6 में गेहूं DBW 327 बुवाई पूर्ण — बाकी एकड़ गीला होने से खाली (बतर का इंतजार)',
      subPlots: nextSubs,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) onUpdatePlot(updatedPlot);
    showToast(
      '✅ सेटअप लागू: एकड़ #5 और #6 में गेहूं (DBW 327) बोया हुआ है, और बाकी सभी एकड़ गीला होने की वजह से खाली (बतर के इंतजार में) सेट हो गए!'
    );
  };

  // 1-Click Battar Action: Sow a specific wet acre (or all remaining wet acres) with Wheat DBW 327 when Battar arrives!
  const handleSowOnBattar = (targetAcreId?: string) => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const nextSubs = sowWetAcresOnBattar(
      editableSubPlots,
      targetAcreId,
      WHEAT_DBW_327_LABEL,
      todayStr
    );
    setEditableSubPlots(nextSubs);
    if (targetAcreId) {
      const updatedOne = nextSubs.find((s) => s.id === targetAcreId);
      if (updatedOne) setSelectedAcreSubPlot(updatedOne);
    }
    const remainingWetCount = nextSubs.filter((s) =>
      isAcreEmptyOrWet(s)
    ).length;
    const updatedPlot: FarmPlot = {
      ...targetPlot,
      crop: WHEAT_DBW_327_LABEL,
      stage: 'sowing',
      currentActivity:
        remainingWetCount === 0
          ? 'सभी एकड़ों में बतर आने पर गेहूं DBW 327 की बिजाई पूर्ण!'
          : `बतर आने पर बिजाई जारी — अभी ${remainingWetCount} एकड़ में बतर का इंतजार`,
      subPlots: nextSubs,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) onUpdatePlot(updatedPlot);
    showToast(
      targetAcreId
        ? `🌾 बतर आने पर इस एकड़ में गेहूं (DBW 327) की बिजाई दर्ज हो गई! (${remainingWetCount} एकड़ अभी खाली)`
        : '🌾 बधाई हो! बतर आने पर बाकी सभी खाली एकड़ों में गेहूं (DBW 327) की बिजाई दर्ज हो गई!'
    );
  };

  // Mark a single acre as Empty/Wet (Waiting for Battar)
  const handleMarkSingleAcreWetEmpty = (acreId: string) => {
    const targetPlot = selectedPlot || plots[0];
    if (!targetPlot) return;
    const nextSubs = editableSubPlots.map((sp) => {
      if (sp.id !== acreId) return sp;
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
        notes: `एकड़ #${sp.acreNumber} — गीला होने की वजह से खाली (बतर आते ही गेहूं DBW 327 की बिजाई करेंगे)`,
      };
    });
    setEditableSubPlots(nextSubs);
    const updatedOne = nextSubs.find((s) => s.id === acreId);
    if (updatedOne) setSelectedAcreSubPlot(updatedOne);
    const updatedPlot: FarmPlot = {
      ...targetPlot,
      subPlots: nextSubs,
    };
    setSelectedPlot(updatedPlot);
    if (onUpdatePlot) onUpdatePlot(updatedPlot);
    showToast(
      `💧 एकड़ #${updatedOne?.acreNumber || ''} को "गीला होने से खाली (बतर का इंतजार)" मार्क कर दिया गया!`
    );
  };

  const handleSelectPlotPin = (plot: FarmPlot) => {
    setIsMarkingNewPlot(false);
    setIsFreshClickSession(false);
    setSelectedPlot(plot);
    if (plot.coordinates) {
      setMapCenter(plot.coordinates);
      loadWeatherData(plot.coordinates.lat, plot.coordinates.lng, plot.name);
    }
    if (onSelectPlot) {
      onSelectPlot(plot);
    }
  };

  const getCropEmoji = (crop?: string) => {
    const c = (crop || '').toLowerCase();
    if (c.includes('wheat') || c.includes('गेहूं')) return '🌾';
    if (c.includes('paddy') || c.includes('धान') || c.includes('basmati'))
      return '🍚';
    if (c.includes('mustard') || c.includes('सरसों')) return '🟡';
    if (c.includes('sugar') || c.includes('गन्ना')) return '🎋';
    if (c.includes('maize') || c.includes('मक्का') || c.includes('bajra'))
      return '🌽';
    if (c.includes('potato') || c.includes('आलू') || c.includes('tomato'))
      return '🥔';
    if (c.includes('tilling') || c.includes('जुताई')) return '🚜';
    return '🌱';
  };

  const liveBoundaryAcres =
    draftBoundaryPoints.length >= 3
      ? calculatePolygonAcres(draftBoundaryPoints)
      : 0;
  const effectiveStep1Acres =
    useManualAcresOverride && Number(manualActualTotalAcres) > 0
      ? Number(manualActualTotalAcres)
      : liveBoundaryAcres > 0
      ? liveBoundaryAcres
      : selectedPlot?.acres || 0;
  const liveBoundaryBigha = Number((effectiveStep1Acres * 4.8).toFixed(1));
  const activeTargetPlot = selectedPlot || plots[0] || null;

  // Currently focused Acre Sub-Plot (for the Acre Kundali Inspector Card)
  const focusedAcreSubPlot =
    editableSubPlots.find(
      (sp) => String(sp.acreNumber) === String(activeAcreToMark)
    ) ||
    selectedAcreSubPlot ||
    editableSubPlots[0] ||
    null;

  // Live Whole-Khet & Per-Acre Expense Totals
  const totalManualDividedAcres = Number(
    editableSubPlots
      .reduce((acc, sp) => acc + (Number(sp.acres) || 0), 0)
      .toFixed(2)
  );
  const wholeKhetMachineryExp = editableSubPlots.reduce(
    (acc, sp) => acc + (Number(sp.machineryExpense) || 0),
    0
  );
  const wholeKhetLabourExp = editableSubPlots.reduce(
    (acc, sp) => acc + (Number(sp.labourExpense) || 0),
    0
  );
  const wholeKhetMaterialExp = editableSubPlots.reduce(
    (acc, sp) => acc + (Number(sp.materialExpense) || 0),
    0
  );
  const wholeKhetTotalExpense = editableSubPlots.reduce((acc, sp) => {
    const itemized =
      (Number(sp.machineryExpense) || 0) +
      (Number(sp.labourExpense) || 0) +
      (Number(sp.materialExpense) || 0);
    return acc + (itemized > 0 ? itemized : Number(sp.allocatedExpense) || 0);
  }, 0);
  const wholeKhetTotalIncome = editableSubPlots.reduce(
    (acc, sp) => acc + (Number(sp.earnedIncome) || 0),
    0
  );
  const wholeKhetNetProfit = wholeKhetTotalIncome - wholeKhetTotalExpense;
  const avgExpensePerAcre =
    totalManualDividedAcres > 0
      ? Math.round(wholeKhetTotalExpense / totalManualDividedAcres)
      : 0;

  // Nearby Pest & Disease Alerts for the marked Khet's location & crop
  const pestAlerts = buildNearbyPestAndDiseaseAlerts(
    focusedAcreSubPlot?.cropVariety || activeTargetPlot?.crop || 'Wheat',
    activeWeather,
    activeLocationLabel
  );

  // Reusable Map Viewport Element (renders either embedded or inside the Full-Screen Studio Modal)
  const renderSatelliteMapCanvas = () => (
    <div className="relative w-full h-full">
      {markingNotification && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-2xl bg-slate-950/95 text-white text-xs font-bold border-2 border-amber-400 shadow-2xl pointer-events-none max-w-[92%] text-center">
          <span>{markingNotification}</span>
        </div>
      )}

      {useGoogleEngine && apiKey && !mapLoadError ? (
        <APIProvider apiKey={apiKey}>
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={mapCenter}
            defaultZoom={17}
            mapTypeId={
              mapType === 'hybrid' && hideMapLabels ? 'satellite' : mapType
            }
            gestureHandling="greedy"
            disableDefaultUI={false}
            onClick={(e: any) => {
              if (!e.detail?.latLng) return;
              handleCoordinateAction(
                e.detail.latLng.lat,
                e.detail.latLng.lng
              );
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraController center={mapCenter} />

            {plots.map((plot) => {
              const isSel =
                !isMarkingNewPlot && activeTargetPlot?.id === plot.id;
              if (!isSel && (toolMode === 'draw_boundary' || toolMode === 'mark_acres')) {
                return null;
              }
              if (toolMode === 'draw_boundary' && isSel) return null;
              const polyPts =
                plot.boundaries && plot.boundaries.length >= 3
                  ? plot.boundaries
                  : generateDefaultBoundary(
                      plot.coordinates?.lat || DEFAULT_CENTER.lat,
                      plot.coordinates?.lng || DEFAULT_CENTER.lng,
                      plot.acres
                    );
              return (
                <GoogleMapShape
                  key={`poly-${plot.id}`}
                  paths={polyPts}
                  strokeColor={isSel ? '#10b981' : '#f59e0b'}
                  fillColor={isSel ? '#10b981' : '#f59e0b'}
                  fillOpacity={isSel ? 0.18 : 0.12}
                  clickable={toolMode === 'inspect'}
                  onSelectPlot={() => handleSelectPlotPin(plot)}
                  onForwardMapClick={handleCoordinateAction}
                />
              );
            })}

            {toolMode === 'draw_boundary' &&
              draftBoundaryPoints.length >= 2 && (
                <GoogleMapShape
                  paths={draftBoundaryPoints}
                  strokeColor="#fbbf24"
                  fillColor="#10b981"
                  fillOpacity={0.32}
                  clickable={false}
                />
              )}

            {toolMode === 'draw_boundary' &&
              draftBoundaryPoints.map((pt, idx) => (
                <AdvancedMarker
                  key={`bpt-${idx}`}
                  position={pt}
                  draggable={true}
                  onDragEnd={(e: any) => {
                    if (!e?.latLng) return;
                    handleDragBoundaryPoint(
                      idx,
                      Number(e.latLng.lat().toFixed(6)),
                      Number(e.latLng.lng().toFixed(6))
                    );
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 font-mono font-black text-[11px] border-2 border-white shadow-xl cursor-grab flex items-center justify-center">
                    P{idx + 1}
                  </div>
                </AdvancedMarker>
              ))}

            {toolMode === 'mark_acres' &&
              draftAcreBoundaryPoints.length >= 2 && (
                <GoogleMapShape
                  paths={draftAcreBoundaryPoints}
                  strokeColor="#fbbf24"
                  fillColor="#fbbf24"
                  fillOpacity={0.28}
                  clickable={false}
                />
              )}

            {toolMode === 'mark_acres' &&
              draftAcreBoundaryPoints.map((pt, idx) => (
                <AdvancedMarker
                  key={`acre-bpt-${idx}`}
                  position={pt}
                  draggable={true}
                  onDragEnd={(e: any) => {
                    if (!e?.latLng) return;
                    handleDragAcreBoundaryPoint(
                      idx,
                      Number(e.latLng.lat().toFixed(6)),
                      Number(e.latLng.lng().toFixed(6))
                    );
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-cyan-400 text-slate-950 font-mono font-black text-[10px] border-2 border-white shadow-xl cursor-grab flex items-center justify-center">
                    A{idx + 1}
                  </div>
                </AdvancedMarker>
              ))}

            {toolMode !== 'draw_boundary' &&
              editableSubPlots.map((sp) => {
                if (!sp.coordinates) return null;
                return (
                  <AdvancedMarker
                    key={`acre-pin-${sp.id}`}
                    position={sp.coordinates}
                    draggable={true}
                    onDragEnd={(e: any) => {
                      if (!e?.latLng) return;
                      handleDragAcrePin(
                        sp.id,
                        Number(e.latLng.lat().toFixed(6)),
                        Number(e.latLng.lng().toFixed(6))
                      );
                    }}
                    onClick={() => {
                      setSelectedAcreSubPlot(sp);
                      setActiveAcreToMark(String(sp.acreNumber));
                      setDraftAcreBoundaryPoints(sp.boundaries || []);
                      setIsFreshAcreClickSession(false);
                    }}
                  >
                    <div
                      className={`w-7 h-7 rounded-full font-mono font-black text-xs border-2 shadow-xl cursor-grab flex items-center justify-center ${
                        String(sp.acreNumber) === String(activeAcreToMark)
                          ? 'bg-amber-400 text-slate-950 border-white scale-115'
                          : 'bg-slate-950 text-emerald-300 border-emerald-400'
                      }`}
                    >
                      {sp.acreNumber}
                    </div>
                  </AdvancedMarker>
                );
              })}
          </Map>
        </APIProvider>
      ) : (
        <InteractiveSatelliteKhetMap
          center={mapCenter}
          zoom={17}
          mapStyle={mapType}
          hideMapLabels={hideMapLabels}
          isFullScreen={isMapFullScreen}
          onToggleFullScreen={() => setIsMapFullScreen((v) => !v)}
          onToggleHideLabels={() => setHideMapLabels((v) => !v)}
          plots={plots.map((p) =>
            p.id === activeTargetPlot?.id
              ? { ...p, subPlots: editableSubPlots }
              : p
          )}
          selectedPlotId={activeTargetPlot?.id}
          isMarkingNewPlot={isMarkingNewPlot}
          toolMode={toolMode}
          draftBoundaryPoints={draftBoundaryPoints}
          draftAcreBoundaryPoints={draftAcreBoundaryPoints}
          activeAcreToMark={activeAcreToMark}
          selectedAcreSubPlot={selectedAcreSubPlot}
          onMapCoordinateClick={handleCoordinateAction}
          onDragBoundaryPoint={handleDragBoundaryPoint}
          onDragAcreBoundaryPoint={handleDragAcreBoundaryPoint}
          onDragAcrePin={handleDragAcrePin}
          onSelectPlot={handleSelectPlotPin}
          onSelectAcreSubPlot={(sp) => {
            setSelectedAcreSubPlot(sp);
            setActiveAcreToMark(String(sp.acreNumber));
            setDraftAcreBoundaryPoints(sp.boundaries || []);
            setIsFreshAcreClickSession(false);
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* FULL-SCREEN KHET & ACRE MARKING STUDIO OVERLAY (z-[9999] ABOVE EVERYTHING) */}
      {isMapFullScreen && (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col overflow-hidden">
          {/* Ultra-Clean Top Control Bar in Full Screen */}
          <div className="px-3 sm:px-5 py-2.5 bg-slate-900 border-b border-emerald-500/40 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setToolMode('draw_boundary');
                  setHideMapLabels(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  toolMode === 'draw_boundary'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>STEP 1: पूरे खेत की बाउंड्री (P1–P4)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setToolMode('mark_acres');
                  setHideMapLabels(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                  toolMode === 'mark_acres'
                    ? 'bg-teal-400 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>STEP 2: मल्टी-पॉइंट से एकड़ मार्क करें (A1, A2, A3, A4...)</span>
              </button>

              {/* Inline Village Search & GPS inside Full Screen */}
              <form
                onSubmit={handleSearchLocation}
                className="flex items-center gap-1.5 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700"
              >
                <input
                  type="text"
                  value={locationSearchQuery}
                  onChange={(e) => setLocationSearchQuery(e.target.value)}
                  placeholder="गांव/शहर खोजें..."
                  className="w-28 sm:w-36 px-2 py-0.5 rounded-lg bg-slate-950 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  खोजें
                </button>
                <button
                  type="button"
                  onClick={handleUseMyGPS}
                  className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  GPS
                </button>
              </form>
            </div>

            {/* Middle Quick Actions based on active step */}
            <div className="flex flex-wrap items-center gap-1.5">
              {toolMode === 'draw_boundary' ? (
                <>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-xs font-black">
                    {draftBoundaryPoints.length} कोने · {effectiveStep1Acres} एकड़
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartFreshBoundaryMarking(false, true)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    🎯 नए कोने (Start P1)
                  </button>
                  <button
                    type="button"
                    onClick={handlePlace4CornerBoxAtCenter}
                    className="px-2.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    🔲 4-कोने रखें
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftBoundaryPoints((prev) => prev.slice(0, -1))
                    }
                    disabled={draftBoundaryPoints.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold cursor-pointer"
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveBoundaryPoints(true)}
                    disabled={draftBoundaryPoints.length < 3}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>बाउंड्री सेव व Step 2 (एकड़ मार्क करें) →</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-mono text-xs font-black">
                    एकड़ #{activeAcreToMark}: {draftAcreBoundaryPoints.length}{' '}
                    कोने (
                    {draftAcreBoundaryPoints.length >= 3
                      ? `${calculatePolygonAcres(draftAcreBoundaryPoints)} एकड़`
                      : 'नक्शे पर क्लिक करें'}
                    )
                  </span>

                  <button
                    type="button"
                    onClick={() => handleStartFreshAcreCorners()}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer"
                    title="इस एकड़ के कोने साफ करके नक्शे पर नए सिरे से A1, A2, A3, A4 क्लिक करें"
                  >
                    🎯 इस एकड़ (#{activeAcreToMark}) के नए कोने
                  </button>

                  <button
                    type="button"
                    onClick={handlePlace4CornersForActiveAcre}
                    className="px-2.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    🔲 4-कोने रखें
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const next = draftAcreBoundaryPoints.slice(0, -1);
                      setDraftAcreBoundaryPoints(next);
                      setEditableSubPlots((prev) =>
                        prev.map((sp) =>
                          String(sp.acreNumber) === String(activeAcreToMark)
                            ? { ...sp, boundaries: next }
                            : sp
                        )
                      );
                    }}
                    disabled={draftAcreBoundaryPoints.length === 0}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold cursor-pointer"
                  >
                    Undo कोना
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmCurrentAcreAndNext}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ यह एकड़ सेव → अगला एकड़ मार्क करें</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCompleteAllAcreMarkingAndSave}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1.5 shadow-lg ring-2 ring-white/80"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✅ मार्किंग पूरी — सभी एकड़ सेव करें</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAllAcresForManualMultiPointMarking}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/50 text-rose-200 text-xs font-bold cursor-pointer"
                    title="सभी ऑटो/फिक्स एकड़ हटाकर खुद एकड़ #1 से मल्टी-पॉइंट मार्क करें"
                  >
                    🧹 सभी एकड़ रीसेट करें
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsMapFullScreen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>फुल-स्क्रीन बंद</span>
              </button>
            </div>
          </div>

          {/* 90% Viewport Clean Satellite Map */}
          <div className="flex-1 relative">{renderSatelliteMapCanvas()}</div>

          {/* Sleek Bottom Strip in Full-Screen Mode to Pick/Mark Any Acre with Multi-Point Markers + Final Marking Complete Button */}
          <div className="px-4 py-2.5 bg-slate-900/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-cyan-300 mr-1 whitespace-nowrap">
                किस एकड़ के कोने (A1, A2, A3, A4...) मार्क करने हैं:
              </span>
              {editableSubPlots.map((sp) => {
                const ptCount = sp.boundaries?.length || 0;
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => {
                      setToolMode('mark_acres');
                      setActiveAcreToMark(String(sp.acreNumber));
                      setSelectedAcreSubPlot(sp);
                      setDraftAcreBoundaryPoints(sp.boundaries || []);
                      setIsFreshAcreClickSession(false);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold whitespace-nowrap cursor-pointer ${
                      String(sp.acreNumber) === String(activeAcreToMark)
                        ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-white'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    एकड़ #{sp.acreNumber} ({sp.acres}Ac · {ptCount} कोने)
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleAddManualAcreRow(true)}
                className="px-3 py-1 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black whitespace-nowrap cursor-pointer"
              >
                + नया एकड़ मार्क करें
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {focusedAcreSubPlot && (
                <div className="hidden md:flex items-center gap-2 text-xs mr-2">
                  <span className="text-emerald-300 font-bold">
                    एकड़ #{focusedAcreSubPlot.acreNumber}:{' '}
                    {focusedAcreSubPlot.cropVariety}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-amber-300 font-mono">
                    खर्च: ₹
                    {(
                      (Number(focusedAcreSubPlot.machineryExpense) || 0) +
                      (Number(focusedAcreSubPlot.labourExpense) || 0) +
                      (Number(focusedAcreSubPlot.materialExpense) || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCompleteAllAcreMarkingAndSave}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg ring-2 ring-white/80 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>✅ सभी एकड़ मार्किंग पूरी — सेव करें (Save All Acres)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Top Header & Full-Screen Map Launcher */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 p-5 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight">
                🛰️ खेत व प्रति-एकड़ नक्शा (Farm &amp; Acre Map)
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHideMapLabels(true);
                setIsMapFullScreen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>⛶ फुल-स्क्रीन मैप में खेत व एकड़ मार्क करें</span>
            </button>

            <button
              type="button"
              onClick={handleCompleteAllAcreMarkingAndSave}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-lime-400 to-amber-300 hover:from-lime-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>✅ मार्किंग पूरी — सभी एकड़ सेव करें</span>
            </button>

            <button
              type="button"
              onClick={() => handleStartFreshBoundaryMarking(true, true)}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ नया खेत जोड़ें</span>
            </button>

            <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 border border-white/15">
              <button
                type="button"
                onClick={() => setMapViewTab('satellite')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mapViewTab === 'satellite'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🛰️ नक्शा व एकड़ कुंडली
              </button>
              <button
                type="button"
                onClick={() => setMapViewTab('acre_pnl')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  mapViewTab === 'acre_pnl'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>पूरा खेत व प्रति-एकड़ हिसाब</span>
              </button>
            </div>
          </div>
        </div>

        {/* Farm Plots Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3.5 border-t border-white/10">
          <span className="text-xs font-bold text-slate-300">आपके खेत:</span>
          {plots.map((plot) => {
            const isSel = !isMarkingNewPlot && activeTargetPlot?.id === plot.id;
            return (
              <button
                key={plot.id}
                type="button"
                onClick={() => handleSelectPlotPin(plot)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 border transition-all ${
                  isSel
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-300'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                }`}
              >
                <span>{getCropEmoji(plot.crop)}</span>
                <span>{(plot.name || 'खेत').split('(')[0].trim()}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/25 text-white font-mono">
                  {plot.acres} Ac ({plot.subPlots?.length || Math.ceil(plot.acres)} एकड़ पिन)
                </span>
              </button>
            );
          })}
        </div>

        {/* Post-Save Confirmation Banner with Direct Acre-Wise Expense & Simulation Action */}
        {markingCompletedBanner && activeTargetPlot && (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-white">
                  ✅ खेत बाउंड्री और सभी {editableSubPlots.length} एकड़ ({activeTargetPlot.acres} एकड़) सफलतापूर्वक सेव हो गए!
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5">
                  अब आपके चिह्नित खेत का असली आकार (Polygon Shape) सिमुलेशन मैप से जुड़ गया है और आप हर एकड़ के हिसाब से खर्चा व कार्य (जुताई/बिजाई/टिलरिंग/फ्लावरिंग) दर्ज कर सकते हैं।
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {onNavigateToHisab && (
                <button
                  type="button"
                  onClick={() => onNavigateToHisab(activeTargetPlot.name)}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black cursor-pointer shadow-md"
                >
                  💰 एकड़-वार खर्चा व काम जोड़ें →
                </button>
              )}
              <button
                type="button"
                onClick={() => setMarkingCompletedBanner(false)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-slate-200 text-xs font-bold cursor-pointer"
              >
                ठीक है
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB: Per-Acre Profit & Loss Full Accounting */}
      {mapViewTab === 'acre_pnl' && (
        <PerAcreProfitLossView
          plots={plots}
          store={store || ({} as any)}
          language={language}
          onOpenDemarcation={(id) => {
            setDemarcationPlotId(id);
            setShowDemarcationModal(true);
          }}
          onNavigateToHisab={onNavigateToHisab}
        />
      )}

      {/* MAIN SATELLITE MAP + ACRE KUNDALI + WEATHER & PEST RADAR */}
      {mapViewTab === 'satellite' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left 7 Cols: Clean Satellite Map with Moveable Acre Pins */}
            <div className="lg:col-span-7 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
              {/* Village Search & Live GPS Bar */}
              <form
                onSubmit={handleSearchLocation}
                className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-100 dark:bg-slate-800/90 p-2 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="अपना गांव / शहर खोजें (Karnal, Gharaunda, Hisar)..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchingLocation}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  {searchingLocation ? '...' : '🔍 खोजें'}
                </button>
                <button
                  type="button"
                  onClick={handleUseMyGPS}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>मेरी GPS</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHideMapLabels(true);
                    setIsMapFullScreen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>फुल-स्क्रीन</span>
                </button>
              </form>

              {/* Simple 2-Step Switcher + Hide Labels Toggle (Clicking Step 1 or Step 2 opens Full-Screen Map!) */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setToolMode('draw_boundary');
                      setHideMapLabels(true);
                      setIsMapFullScreen(true);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'draw_boundary'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>1. खेत बाउंड्री (P1–P4 फुल-स्क्रीन)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setToolMode('mark_acres');
                      setHideMapLabels(true);
                      setIsMapFullScreen(true);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      toolMode === 'mark_acres'
                        ? 'bg-teal-400 text-slate-950 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>2. मल्टी-पॉइंट से एकड़ मार्क करें (A1, A2, A3, A4... फुल-स्क्रीन)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHideMapLabels((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
                      hideMapLabels
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {hideMapLabels ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>लेबल बंद (Clean)</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>लेबल चालू</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Compact Instruction Strip */}
              {toolMode === 'draw_boundary' ? (
                <div className="p-3 rounded-2xl bg-slate-900 text-white border border-amber-400/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">
                      Step 1: नक्शे पर कोने (P1–P4) क्लिक या ड्रैग करें ({effectiveStep1Acres} एकड़)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handlePlace4CornerBoxAtCenter();
                        setHideMapLabels(true);
                        setIsMapFullScreen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-teal-400 text-slate-950 font-black cursor-pointer"
                    >
                      🔲 4-कोने रखें
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBoundaryPoints(true)}
                      disabled={draftBoundaryPoints.length < 3}
                      className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black cursor-pointer disabled:opacity-40"
                    >
                      ✅ सेव व Step 2 (एकड़ मार्क करें) →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-900 text-white border border-teal-400/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-teal-300">
                    Step 2 (एकड़ #{activeAcreToMark} — {draftAcreBoundaryPoints.length} कोने): नक्शे पर क्लिक करके कोने (A1, A2, A3, A4...) लगाएं या ड्रैग करें!
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartFreshAcreCorners()}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black cursor-pointer"
                    >
                      🎯 नए कोने (Start A1)
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCurrentAcreAndNext}
                      className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 font-black cursor-pointer"
                    >
                      + सेव व अगला एकड़ →
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteAllAcreMarkingAndSave}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-400 to-lime-400 text-slate-950 font-black cursor-pointer flex items-center gap-1 shadow-md ring-1 ring-white/80"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✅ मार्किंग पूरी — सभी एकड़ सेव करें</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAllAcresForManualMultiPointMarking}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/30 border border-rose-400 text-rose-200 font-bold cursor-pointer"
                    >
                      🧹 सभी एकड़ रीसेट
                    </button>
                  </div>
                </div>
              )}

              {/* Satellite Map Viewport (Mounted here only when Full-Screen is closed) */}
              {!isMapFullScreen && (
                <div className="w-full h-[440px] sm:h-[490px] rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-inner">
                  {renderSatelliteMapCanvas()}
                </div>
              )}
            </div>

            {/* Right 5 Cols: Selected Acre Complete Kundali (Crop, Variety, Sowing Date, Stage, Completed Works, Expense) */}
            <div className="lg:col-span-5 space-y-4">
              {focusedAcreSubPlot && (
                <div className="bg-white/95 dark:bg-slate-900/95 border-2 border-emerald-500/50 rounded-3xl p-5 shadow-xl space-y-4">
                  {/* Quick Farm Setup Banner: Acre #5 & #6 Sown DBW 327 + Remaining Wet/Empty & Battar Sowing */}
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-sky-950 border border-emerald-500/40 text-white space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-emerald-300">
                        🌾 वर्तमान खेत स्थिति: {editableSubPlots.filter((s) => !isAcreEmptyOrWet(s)).length} एकड़ में बुवाई पूर्ण ·{' '}
                        <span className="text-sky-300">
                          {editableSubPlots.filter((s) => isAcreEmptyOrWet(s)).length} एकड़ गीले/खाली (बतर का इंतजार)
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleApplyNarenDBW327AndWetPreset}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black cursor-pointer shadow-sm"
                      >
                        ⚡ एकड़ #5 व #6 में गेहूं DBW 327 + बाकी गीले/खाली
                      </button>
                      {editableSubPlots.some((s) => isAcreEmptyOrWet(s)) && (
                        <button
                          type="button"
                          onClick={() => handleSowOnBattar()}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black cursor-pointer shadow-sm"
                        >
                          🚜 बतर आ गई — बाकी सभी खाली एकड़ों में बिजाई करें
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Acre Selector Pills at Top of Card */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {editableSubPlots.map((sp) => {
                        const emptyWet = isAcreEmptyOrWet(sp);
                        const isFocused = sp.id === focusedAcreSubPlot.id;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => {
                              setActiveAcreToMark(String(sp.acreNumber));
                              setSelectedAcreSubPlot(sp);
                              setDraftAcreBoundaryPoints(sp.boundaries || []);
                              setIsFreshAcreClickSession(false);
                            }}
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 border ${
                              isFocused
                                ? emptyWet
                                  ? 'bg-sky-500 text-slate-950 border-white shadow-md'
                                  : 'bg-emerald-500 text-slate-950 border-white shadow-md'
                                : emptyWet
                                ? 'bg-sky-950/80 text-sky-300 border-sky-500/40'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            <span>{emptyWet ? '💧' : '🌾'}</span>
                            <span>
                              #{sp.acreNumber} ({emptyWet ? 'खाली/गीला' : 'DBW 327'})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddManualAcreRow(true)}
                      className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shrink-0 cursor-pointer"
                    >
                      + नया एकड़
                    </button>
                  </div>

                  {/* Selected Acre Title & Sown vs Wet/Empty Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        चयनित एकड़ कुंडली (Selected Acre Details)
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        एकड़ #{focusedAcreSubPlot.acreNumber} —{' '}
                        {focusedAcreSubPlot.name}
                      </h3>
                    </div>
                    <div className="text-right font-mono">
                      {isAcreEmptyOrWet(focusedAcreSubPlot) ? (
                        <span className="px-2.5 py-1 rounded-xl bg-sky-500/20 border border-sky-400 text-xs font-black text-sky-600 dark:text-sky-300 inline-block">
                          💧 गीला / खाली (बतर बाकी)
                        </span>
                      ) : (
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                          🌱 {getDaysAfterSowing(focusedAcreSubPlot.sowingDate)}{' '}
                          दिन की फसल (बोया हुआ)
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        रकबा: {focusedAcreSubPlot.acres} एकड़
                      </span>
                    </div>
                  </div>

                  {/* 1-Click Toggle for This Acre: Sown (DBW 327) vs Empty due to Wet Soil (Waiting for Battar) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSowOnBattar(focusedAcreSubPlot.id)
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center justify-center gap-1.5 ${
                        !isAcreEmptyOrWet(focusedAcreSubPlot)
                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span>🌾 फसल बोई हुई है (DBW 327)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleMarkSingleAcreWetEmpty(focusedAcreSubPlot.id)
                      }
                      className={`py-2 px-3 rounded-xl text-xs font-black cursor-pointer border transition-all flex items-center justify-center gap-1.5 ${
                        isAcreEmptyOrWet(focusedAcreSubPlot)
                          ? 'bg-sky-600 text-white border-sky-400 shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span>💧 गीला होने से खाली (बतर बाकी)</span>
                    </button>
                  </div>

                  {/* DEDICATED PER-ACRE ENTRY FORM (1. Acre Status, 2. Sowing Date DD/MM/YYYY + Fasal Age & Stage, 3. Sowing Method, 4. Expense with Worker & Rate Memory) */}
                  {activeTargetPlot && (
                    <PerAcreEntryForm
                      plot={{
                        ...activeTargetPlot,
                        subPlots: editableSubPlots,
                      }}
                      acre={focusedAcreSubPlot}
                      store={store}
                      onSaveAcreAndStore={(
                        updatedPlot,
                        updatedStore,
                        toastMsg
                      ) => {
                        setEditableSubPlots(updatedPlot.subPlots || []);
                        const refreshedAcre = (updatedPlot.subPlots || []).find(
                          (s) => s.id === focusedAcreSubPlot.id
                        );
                        if (refreshedAcre) {
                          setSelectedAcreSubPlot(refreshedAcre);
                        }
                        setSelectedPlot(updatedPlot);
                        if (updatedStore && onSaveStore) {
                          onSaveStore(updatedStore);
                        } else if (onUpdatePlot) {
                          onUpdatePlot(updatedPlot);
                        }
                        if (toastMsg) {
                          showToast(toastMsg);
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ACCURATE KHET WEATHER + NEARBY PEST & DISEASE OUTBREAK RADAR & REMEDIES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 4 Cols: Synced Khet Location Weather */}
            <div className="lg:col-span-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                    📍 चिह्नित खेत का सटीक मौसम
                  </span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{activeLocationLabel}</span>
                  </h4>
                </div>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {activeWeather ? `${activeWeather.temperature}°C` : '25.5°C'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70">
                  <Droplets className="w-4 h-4 text-blue-500 mx-auto mb-0.5" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeWeather ? activeWeather.humidity : 58}%
                  </span>
                  <span className="block text-[10px] text-slate-500 font-sans">
                    आर्द्रता (नमी)
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70">
                  <Wind className="w-4 h-4 text-teal-500 mx-auto mb-0.5" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeWeather ? activeWeather.windSpeed : 8.5} km/h
                  </span>
                  <span className="block text-[10px] text-slate-500 font-sans">
                    हवा की गति
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70">
                  <Sun className="w-4 h-4 text-amber-500 mx-auto mb-0.5" />
                  <span className="font-bold text-slate-900 dark:text-white">
                    {activeWeather ? activeWeather.precipitationChance : 5}%
                  </span>
                  <span className="block text-[10px] text-slate-500 font-sans">
                    बारिश संभावना
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs flex items-start gap-2.5">
                {activeWeather?.agriAdvice.isSuitableForSpray !== false ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {activeWeather?.agriAdvice.title || 'स्प्रे व सिंचाई के लिए अनुकूल मौसम'}
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-300">
                    {activeWeather?.agriAdvice.sprayWindowAdvice ||
                      'हवा सामान्य है, खेत में दवा छिड़काव एवं खाद का कार्य सुरक्षित रूप से किया जा सकता है।'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right 8 Cols: Nearby Pest & Disease Attack Radar + Remedies */}
            <div className="lg:col-span-8 bg-white/95 dark:bg-slate-900/95 border border-rose-500/30 rounded-3xl p-5 shadow-xl space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <Bug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      🦠 आस-पास कीट व रोग प्रकोप राडार एवं प्रमाणित उपचार (Nearby Pest & Disease Alerts)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      आपके चिह्नित खेत ({activeLocationLabel}) के मौसम और फसल ({(focusedAcreSubPlot?.cropVariety || activeTargetPlot?.crop || '').split('(')[0]}) के आधार पर क्षेत्रीय अलर्ट व इलाज
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pestAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                          {alert.distanceInfo}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                          {alert.pestName}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                          alert.severity === 'high'
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {alert.severity === 'high' ? '⚠️ उच्च सतर्कता' : 'मध्यम सतर्कता'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <strong>लक्षण:</strong> {alert.symptoms}
                    </p>

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1">
                      <div className="flex items-center gap-1 font-black text-emerald-800 dark:text-emerald-300">
                        <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                        <span>प्रमाणित उपचार व प्रति-एकड़ खुराक:</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-semibold">
                        {alert.remedy}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                        मात्रा: {alert.dosagePerAcre}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ALL ACRES OVERVIEW TABLE (Crop, Variety, Sowing Date, Stage, Completed Works & Expense) */}
          {activeTargetPlot && (
            <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    📋 {activeTargetPlot.name} — सभी एकड़ का फसल, बिजाई, स्टेज, कार्य व खर्च ब्यौरा
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    किसी भी एकड़ पर क्लिक करके ऊपर उसकी पूरी कुंडली एडिट करें या नक्शे पर उसकी पिन खिसकाएं।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddManualAcreRow(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नया एकड़ जोड़ें</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAllManualAcresAndExpenses}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>सभी सेव करें</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[980px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-2">एकड़ #</th>
                      <th className="py-2.5 px-2">1. Acre Status</th>
                      <th className="py-2.5 px-2">2. Sowing Date (DD/MM/YYYY) व उम्र</th>
                      <th className="py-2.5 px-2">3. Sowing Method</th>
                      <th className="py-2.5 px-2">फसल व स्टेज</th>
                      <th className="py-2.5 px-2">4. दर्ज मशीनरी / कामगार (Worker & Job)</th>
                      <th className="py-2.5 px-2">दर्ज खर्च (₹)</th>
                      <th className="py-2.5 px-2 text-right">कार्रवाई (Edit / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
                    {editableSubPlots.map((sp) => {
                      const rowExp =
                        (Number(sp.machineryExpense) || 0) +
                        (Number(sp.labourExpense) || 0) +
                        (Number(sp.materialExpense) || 0) ||
                        Number(sp.allocatedExpense) ||
                        0;
                      const isSel =
                        String(sp.acreNumber) === String(activeAcreToMark);
                      const statusVal =
                        sp.acreStatus ||
                        (isAcreEmptyOrWet(sp) ? 'Empty' : 'Seeded');
                      const ageStage = calculateFasalAgeAndStage(
                        statusVal,
                        sp.sowingDate
                      );
                      return (
                        <tr
                          key={sp.id}
                          onClick={() => {
                            setActiveAcreToMark(String(sp.acreNumber));
                            setSelectedAcreSubPlot(sp);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-3 px-2 font-mono font-black">
                            <span
                              className={`px-2.5 py-1 rounded-lg ${
                                isSel
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              एकड़ #{sp.acreNumber} ({sp.acres}Ac)
                            </span>
                          </td>
                          <td className="py-3 px-2 font-black">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] inline-block ${
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
                          <td className="py-3 px-2 font-mono">
                            <span className="block font-bold">
                              {formatDateDDMMYYYY(sp.sowingDate)}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              {ageStage.fasalAgeText}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-bold text-cyan-700 dark:text-cyan-300">
                            {statusVal === 'Seeded'
                              ? sp.sowingMethod || 'Super Seeder'
                              : '—'}
                          </td>
                          <td className="py-3 px-2 font-bold">
                            <div className="text-slate-900 dark:text-white">
                              {statusVal === 'Seeded'
                                ? sp.cropVariety || activeTargetPlot.crop
                                : 'खाली खेत'}
                            </div>
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">
                              {ageStage.stageLabelHi}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {(sp.expenseEntries || []).length > 0 ? (
                              <div className="space-y-0.5">
                                {(sp.expenseEntries || []).map((e) => (
                                  <div
                                    key={e.id}
                                    className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300"
                                  >
                                    🚜 {e.machineryOrJob} • {e.workerName} (₹
                                    {e.rate} · {formatDateDDMMYYYY(e.date)})
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                कोई खर्च दर्ज नहीं (₹0)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-mono font-black text-rose-600 dark:text-rose-400">
                            ₹{rowExp.toLocaleString('en-IN')}
                          </td>
                          <td
                            className="py-3 px-2 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveAcreToMark(String(sp.acreNumber));
                                  setSelectedAcreSubPlot(sp);
                                }}
                                className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                title="इस एकड़ का फॉर्म एडिट करें"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>एडिट</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveManualAcreRow(sp.id)}
                                className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                                title="एकड़ हटाएं (Delete)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>हटाएं</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AcreDemarcationModal
        isOpen={showDemarcationModal}
        onClose={() => setShowDemarcationModal(false)}
        plots={plots}
        currentSelectedPlotId={demarcationPlotId || activeTargetPlot?.id}
        onSavePlot={(updated, oldName) => {
          setSelectedPlot(updated);
          if (onUpdatePlot) onUpdatePlot(updated, oldName);
        }}
        onAddNewPlot={(newPlot) => {
          setSelectedPlot(newPlot);
          if (onAddNewPlot) onAddNewPlot(newPlot);
        }}
        onDeletePlot={onDeletePlot}
        language={language}
      />

      {onUpdatePlot && onAddNewPlot && (
        <PlotEditModal
          isOpen={showPlotEditModal}
          onClose={() => setShowPlotEditModal(false)}
          plot={editingPlotObj}
          plots={plots}
          onSavePlot={(savedPlot, oldName) => {
            const exists = plots.some((p) => p.id === savedPlot.id);
            if (exists) {
              onUpdatePlot(savedPlot, oldName);
            } else {
              onAddNewPlot(savedPlot);
            }
            setSelectedPlot(savedPlot);
          }}
          onDeletePlot={onDeletePlot}
          onOpenAcreDemarcation={(id) => {
            setDemarcationPlotId(id);
            setShowDemarcationModal(true);
          }}
          language={language}
        />
      )}

      <CropVarietiesExplorerModal
        isOpen={showVarietiesModal}
        onClose={() => setShowVarietiesModal(false)}
        plots={plots}
        onAssignVarietyToPlot={(plotId, varietyLabel) => {
          const target = plots.find((p) => p.id === plotId);
          if (target && onUpdatePlot) {
            const updated: FarmPlot = {
              ...target,
              crop: varietyLabel,
              subPlots: (target.subPlots || []).map((sp) => ({
                ...sp,
                cropVariety: varietyLabel,
              })),
            };
            onUpdatePlot(updated);
          }
        }}
        language={language}
      />
    </div>
  );
};
