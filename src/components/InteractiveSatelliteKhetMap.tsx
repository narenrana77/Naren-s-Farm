import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FarmPlot, AcreSubPlot } from '../types/farm';
import { generateDefaultBoundary } from '../utils/acreUtils';
import { Maximize2, Minimize2, EyeOff, Eye } from 'lucide-react';

export interface InteractiveSatelliteKhetMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  mapStyle?: 'hybrid' | 'roadmap';
  hideMapLabels?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onToggleHideLabels?: () => void;
  plots: FarmPlot[];
  selectedPlotId?: string;
  isMarkingNewPlot?: boolean;
  toolMode: 'draw_boundary' | 'mark_acres' | 'pick_location' | 'inspect';
  draftBoundaryPoints: Array<{ lat: number; lng: number }>;
  draftAcreBoundaryPoints?: Array<{ lat: number; lng: number }>;
  activeAcreToMark?: string;
  selectedAcreSubPlot?: AcreSubPlot | null;
  onMapCoordinateClick: (lat: number, lng: number) => void;
  onDragBoundaryPoint: (index: number, lat: number, lng: number) => void;
  onDragAcreBoundaryPoint?: (index: number, lat: number, lng: number) => void;
  onDragAcrePin?: (subPlotId: string, lat: number, lng: number) => void;
  onSelectPlot?: (plot: FarmPlot) => void;
  onSelectAcreSubPlot?: (subPlot: AcreSubPlot) => void;
}

const ACRE_PALETTE = [
  '#14b8a6', // teal
  '#38bdf8', // sky
  '#a78bfa', // violet
  '#f472b6', // pink
  '#fb923c', // orange
  '#4ade80', // green
  '#facc15', // yellow
  '#60a5fa', // blue
];

export const InteractiveSatelliteKhetMap: React.FC<InteractiveSatelliteKhetMapProps> = ({
  center,
  zoom = 17,
  mapStyle = 'hybrid',
  hideMapLabels = true,
  isFullScreen = false,
  onToggleFullScreen,
  onToggleHideLabels,
  plots,
  selectedPlotId,
  isMarkingNewPlot = false,
  toolMode,
  draftBoundaryPoints,
  draftAcreBoundaryPoints = [],
  activeAcreToMark,
  selectedAcreSubPlot,
  onMapCoordinateClick,
  onDragBoundaryPoint,
  onDragAcreBoundaryPoint,
  onDragAcrePin,
  onSelectPlot,
  onSelectAcreSubPlot,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<{
    satellite?: L.TileLayer;
    labels?: L.TileLayer;
    roadmap?: L.TileLayer;
  }>({});
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const lastCenterRef = useRef<{ lat: number; lng: number }>(center);

  // Self-contained state if parent does not control full-screen or label hiding
  const [localFullScreen, setLocalFullScreen] = useState<boolean>(false);
  const [localHideLabels, setLocalHideLabels] = useState<boolean>(true);

  const effectiveFullScreen = onToggleFullScreen ? isFullScreen : localFullScreen;
  const effectiveHideLabels = onToggleHideLabels
    ? hideMapLabels
    : localHideLabels;

  // Keep latest callbacks in refs so Leaflet event listeners always invoke fresh handlers
  const clickHandlerRef = useRef(onMapCoordinateClick);
  clickHandlerRef.current = onMapCoordinateClick;

  const dragHandlerRef = useRef(onDragBoundaryPoint);
  dragHandlerRef.current = onDragBoundaryPoint;

  const dragAcreBoundaryHandlerRef = useRef(onDragAcreBoundaryPoint);
  dragAcreBoundaryHandlerRef.current = onDragAcreBoundaryPoint;

  const dragAcrePinRef = useRef(onDragAcrePin);
  dragAcrePinRef.current = onDragAcrePin;

  const selectPlotRef = useRef(onSelectPlot);
  selectPlotRef.current = onSelectPlot;

  const selectAcreRef = useRef(onSelectAcreSubPlot);
  selectAcreRef.current = onSelectAcreSubPlot;

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Pure High-Resolution Esri World Imagery Satellite Layer (ZERO road/village text labels baked in)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    );

    // Optional Place Labels Layer (ONLY added when user explicitly turns labels ON)
    const labelsLayer = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    );

    // Clean OpenStreetMap Roadmap Layer
    const roadmapLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
      }
    );

    tileLayersRef.current = {
      satellite: satelliteLayer,
      labels: labelsLayer,
      roadmap: roadmapLayer,
    };

    if (mapStyle === 'roadmap') {
      roadmapLayer.addTo(map);
    } else {
      satelliteLayer.addTo(map);
      if (!effectiveHideLabels) {
        labelsLayer.addTo(map);
      }
    }

    const overlayGroup = L.layerGroup().addTo(map);
    overlayGroupRef.current = overlayGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      clickHandlerRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Re-validate Leaflet canvas size whenever Full-Screen or toolMode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const t1 = window.setTimeout(() => map.invalidateSize(), 50);
    const t2 = window.setTimeout(() => map.invalidateSize(), 220);
    const t3 = window.setTimeout(() => map.invalidateSize(), 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [effectiveFullScreen, toolMode]);

  // 2. Switch between Pure Satellite (No Labels), Hybrid Labels, and Roadmap layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const { satellite, labels, roadmap } = tileLayersRef.current;
    if (!map || !satellite || !labels || !roadmap) return;

    if (mapStyle === 'roadmap') {
      if (map.hasLayer(satellite)) map.removeLayer(satellite);
      if (map.hasLayer(labels)) map.removeLayer(labels);
      if (!map.hasLayer(roadmap)) roadmap.addTo(map);
    } else {
      if (map.hasLayer(roadmap)) map.removeLayer(roadmap);
      if (!map.hasLayer(satellite)) satellite.addTo(map);
      if (effectiveHideLabels) {
        if (map.hasLayer(labels)) map.removeLayer(labels);
      } else {
        if (!map.hasLayer(labels)) labels.addTo(map);
      }
    }
  }, [mapStyle, effectiveHideLabels]);

  // 3. Smoothly fly/pan when `center` prop changes meaningfully
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !center) return;
    const prev = lastCenterRef.current;
    const dist = Math.hypot(center.lat - prev.lat, center.lng - prev.lng);
    if (dist > 0.00005) {
      lastCenterRef.current = center;
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), 17), {
        animate: true,
      });
    }
  }, [center.lat, center.lng]);

  // 4. Render Outer Khet Boundary, Step 1 Corners (P1..P4), and Step 2 Multi-Point Acre Boundaries (A1..An)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // A. Render Farm Plots Outer Polygon (Zero text labels on map during boundary or acre marking)
    plots.forEach((plot) => {
      const isSelected = !isMarkingNewPlot && plot.id === selectedPlotId;

      // During acre marking or boundary drawing, hide non-selected plots so there is zero visual clutter
      if (
        (toolMode === 'mark_acres' || toolMode === 'draw_boundary') &&
        !isSelected
      ) {
        return;
      }

      const hideSavedPolygonBecauseEditing =
        toolMode === 'draw_boundary' && isSelected;

      const coords = plot.coordinates || { lat: 29.6872, lng: 76.989 };
      const boundaryPts =
        plot.boundaries && plot.boundaries.length >= 3
          ? plot.boundaries
          : generateDefaultBoundary(coords.lat, coords.lng, plot.acres || 4);

      if (!hideSavedPolygonBecauseEditing && boundaryPts.length >= 3) {
        const latLngs = boundaryPts.map(
          (pt) => [pt.lat, pt.lng] as [number, number]
        );
        const poly = L.polygon(latLngs, {
          color: isSelected ? '#10b981' : '#f59e0b',
          weight: isSelected ? 4 : 2,
          fillColor: isSelected ? '#10b981' : '#f59e0b',
          fillOpacity:
            isSelected && toolMode === 'mark_acres'
              ? 0.04
              : isSelected
              ? 0.18
              : 0.12,
          dashArray: isSelected ? undefined : '6, 4',
          interactive: toolMode === 'inspect',
        });

        if (toolMode === 'inspect') {
          poly.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            if (selectPlotRef.current) selectPlotRef.current(plot);
          });
        }
        poly.addTo(group);
      }
    });

    // B. Step 1: Render Active Outer Khet Boundary Drawing (Polygon / Line + Moveable Corner Pins P1, P2, P3, P4...)
    if (toolMode === 'draw_boundary') {
      const latLngs = draftBoundaryPoints.map(
        (pt) => [pt.lat, pt.lng] as [number, number]
      );

      if (latLngs.length === 2) {
        L.polyline(latLngs, {
          color: '#fbbf24',
          weight: 4,
          dashArray: '8, 6',
          interactive: false,
        }).addTo(group);
      } else if (latLngs.length >= 3) {
        L.polygon(latLngs, {
          color: '#fbbf24',
          weight: 3.5,
          fillColor: '#10b981',
          fillOpacity: 0.22,
          interactive: false,
        }).addTo(group);
      }

      // Moveable Corner Markers (P1, P2, P3, P4...)
      draftBoundaryPoints.forEach((pt, idx) => {
        const cornerHtml = `
          <div style="transform: translate(-50%, -50%);" class="w-7 h-7 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-black text-[11px] border-2 border-white shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center select-none">
            P${idx + 1}
          </div>
        `;

        const cornerMarker = L.marker([pt.lat, pt.lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'leaflet-div-icon',
            html: cornerHtml,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        });

        cornerMarker.on('dragend', () => {
          const pos = cornerMarker.getLatLng();
          dragHandlerRef.current(
            idx,
            Number(pos.lat.toFixed(6)),
            Number(pos.lng.toFixed(6))
          );
        });

        cornerMarker.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
        });

        cornerMarker.addTo(group);
      });
    }

    // C. Step 2: Render Multi-Point Acre Sub-Polygons & Draggable Corner Markers (A1, A2, A3, A4...)
    const activePlot = plots.find((p) => p.id === selectedPlotId) || plots[0];
    if (activePlot && toolMode !== 'draw_boundary') {
      (activePlot.subPlots || []).forEach((sp, idx) => {
        const color = ACRE_PALETTE[idx % ACRE_PALETTE.length];
        const isTargetAcre =
          toolMode === 'mark_acres' &&
          String(sp.acreNumber) === String(activeAcreToMark);
        const isAcreSelected = selectedAcreSubPlot?.id === sp.id;

        // If this is the target acre currently being marked with draftAcreBoundaryPoints, we render its live draft polygon below
        const subPointsToRender =
          isTargetAcre && draftAcreBoundaryPoints.length > 0
            ? draftAcreBoundaryPoints
            : sp.boundaries || [];

        // 1. Render sub-plot polygon or line inside the outer khet
        if (subPointsToRender.length === 2 && isTargetAcre) {
          const lineLatLngs = subPointsToRender.map(
            (pt) => [pt.lat, pt.lng] as [number, number]
          );
          L.polyline(lineLatLngs, {
            color: '#fbbf24',
            weight: 3.5,
            dashArray: '6, 5',
            interactive: false,
          }).addTo(group);
        } else if (subPointsToRender.length >= 3) {
          const subLatLngs = subPointsToRender.map(
            (pt) => [pt.lat, pt.lng] as [number, number]
          );
          const subPoly = L.polygon(subLatLngs, {
            color: isTargetAcre ? '#fbbf24' : color,
            weight: isTargetAcre ? 3.5 : 2.5,
            fillColor: isTargetAcre ? '#fbbf24' : color,
            fillOpacity: isTargetAcre ? 0.28 : 0.16,
            dashArray: isTargetAcre ? undefined : '5, 4',
            interactive: false,
          });
          subPoly.addTo(group);
        }

        // 2. Render Moveable Center Pin for each Acre that has been placed (or has >= 1 point)
        const hasPlacement =
          subPointsToRender.length > 0 || Boolean(sp.coordinates);
        if (hasPlacement) {
          const acreCoords =
            subPointsToRender.length >= 3
              ? {
                  lat:
                    subPointsToRender.reduce((s, p) => s + p.lat, 0) /
                    subPointsToRender.length,
                  lng:
                    subPointsToRender.reduce((s, p) => s + p.lng, 0) /
                    subPointsToRender.length,
                }
              : sp.coordinates || subPointsToRender[0];

          if (acreCoords) {
            const pinHtml = `
              <div style="transform: translate(-50%, -50%);" class="w-7 h-7 rounded-full font-mono font-black text-xs shadow-2xl flex items-center justify-center border-2 cursor-grab active:cursor-grabbing select-none transition-transform ${
                isTargetAcre || isAcreSelected
                  ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/50 scale-110'
                  : 'bg-slate-950/95 text-emerald-300 border-emerald-400 hover:scale-110'
              }" title="एकड़ #${sp.acreNumber} — क्लिक करके इसके कोने (A1, A2, A3, A4) एडिट करें या पकड़कर खिसकाएं">
                ${sp.acreNumber}
              </div>
            `;

            const acreMarker = L.marker([acreCoords.lat, acreCoords.lng], {
              draggable: true,
              interactive: true,
              icon: L.divIcon({
                className: 'leaflet-div-icon',
                html: pinHtml,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              }),
            });

            // Dragging the Acre Center Pin shifts the entire Acre polygon
            acreMarker.on('dragend', () => {
              const pos = acreMarker.getLatLng();
              if (dragAcrePinRef.current) {
                dragAcrePinRef.current(
                  sp.id,
                  Number(pos.lat.toFixed(6)),
                  Number(pos.lng.toFixed(6))
                );
              }
            });

            acreMarker.on('click', (e: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(e);
              if (selectAcreRef.current) selectAcreRef.current(sp);
            });

            acreMarker.addTo(group);
          }
        }
      });

      // 3. Render DRAGGABLE Multi-Point Corner Markers (A1, A2, A3, A4...) for the currently active Acre!
      if (toolMode === 'mark_acres' && draftAcreBoundaryPoints.length > 0) {
        draftAcreBoundaryPoints.forEach((pt, idx) => {
          const ptHtml = `
            <div style="transform: translate(-50%, -50%);" class="w-7 h-7 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-black text-[10px] border-2 border-white shadow-2xl cursor-grab active:cursor-grabbing flex items-center justify-center select-none" title="एकड़ #${activeAcreToMark} का कोना A${idx + 1} — पकड़कर खिसकाएं (Drag Corner)">
              A${idx + 1}
            </div>
          `;
          const acreCornerMarker = L.marker([pt.lat, pt.lng], {
            draggable: true,
            interactive: true,
            icon: L.divIcon({
              className: 'leaflet-div-icon',
              html: ptHtml,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          });

          acreCornerMarker.on('dragend', () => {
            const pos = acreCornerMarker.getLatLng();
            if (dragAcreBoundaryHandlerRef.current) {
              dragAcreBoundaryHandlerRef.current(
                idx,
                Number(pos.lat.toFixed(6)),
                Number(pos.lng.toFixed(6))
              );
            }
          });

          acreCornerMarker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
          });

          acreCornerMarker.addTo(group);
        });
      }
    }
  }, [
    plots,
    selectedPlotId,
    isMarkingNewPlot,
    toolMode,
    draftBoundaryPoints,
    draftAcreBoundaryPoints,
    activeAcreToMark,
    selectedAcreSubPlot,
    effectiveHideLabels,
  ]);

  const handleToggleFS = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    } else {
      setLocalFullScreen((prev) => !prev);
    }
  };

  const handleToggleLabels = () => {
    if (onToggleHideLabels) {
      onToggleHideLabels();
    } else {
      setLocalHideLabels((prev) => !prev);
    }
  };

  return (
    <div
      className={
        effectiveFullScreen && !onToggleFullScreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 select-none'
          : 'relative w-full h-full select-none'
      }
    >
      <div
        ref={containerRef}
        className={`w-full h-full ${
          toolMode !== 'inspect' ? 'cursor-crosshair' : 'cursor-grab'
        }`}
      />

      {/* Built-in Top-Right Controls on Every Map: Hide Labels + Full-Screen Toggle */}
      <div className="absolute top-3 right-3 z-[900] flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleLabels}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black shadow-xl border flex items-center gap-1 cursor-pointer transition-all ${
            effectiveHideLabels
              ? 'bg-slate-950/90 text-emerald-300 border-emerald-400/70'
              : 'bg-white/95 text-slate-900 border-slate-300'
          }`}
          title="सैटेलाइट नक्शे के नाम/लेबल छुपाएं या दिखाएं"
        >
          {effectiveHideLabels ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>लेबल बंद (Clean)</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <span>लेबल चालू</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleToggleFS}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black shadow-xl border flex items-center gap-1.5 cursor-pointer transition-all ${
            effectiveFullScreen
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-white'
          }`}
          title={
            effectiveFullScreen
              ? 'फुल-स्क्रीन मैप बंद करें'
              : 'मैप को फुल-स्क्रीन में खोलें'
          }
        >
          {effectiveFullScreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>फुल-स्क्रीन बंद करें</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>फुल-स्क्रीन मैप</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
