import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { FarmPlot, AcreSubPlot, PlotStage } from '../types/farm';
import { generateAcreSubPlots, isAcreEmptyOrWet } from '../utils/acreUtils';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Droplets,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sprout,
  Tractor,
  Wind,
} from 'lucide-react';

export interface ThreeKhetDigitalTwinProps {
  plot: FarmPlot;
  selectedAcreId?: string;
  activeActivity: 'tilling' | 'sowing' | 'irrigation' | 'spray' | 'harvesting' | null;
  onSelectAcre: (acre: AcreSubPlot) => void;
  onTriggerActivity: (
    type: 'tilling' | 'sowing' | 'irrigation' | 'spray' | 'harvesting',
    acreId?: string
  ) => void;
}

// Module-scope reusable math objects (Zero GC in render loop)
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

interface Acre3DMeta {
  subPlot: AcreSubPlot;
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  stage: PlotStage;
  isEmptyWet: boolean;
  hasIrrigationWork: boolean;
  hasSprayWork: boolean;
  stalksInstanced?: THREE.InstancedMesh;
  earsInstanced?: THREE.InstancedMesh;
  baseTransforms: Array<{ x: number; z: number; scaleY: number; phase: number }>;
  waterPlane?: THREE.Mesh;
  signSprite?: THREE.Sprite;
}

const STAGE_HINDI: Record<PlotStage, string> = {
  tilling: '🚜 जुताई (Jutayi)',
  sowing: '🌱 बिजाई (Beejayi)',
  growing: '🌿 टिलरिंग / बढ़वार',
  flowering: '🌼 फूल व बाली (Flowering)',
  harvesting: '🌾 कटाई (Harvesting)',
};

const getDaysSinceSowing3D = (sowingDate?: string): number => {
  if (!sowingDate) return 45;
  const diff = Date.now() - new Date(sowingDate).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const isPointInPolygon2D = (
  x: number,
  z: number,
  poly: Array<{ x: number; z: number }>
): boolean => {
  if (poly.length < 3) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const zi = poly[i].z;
    const xj = poly[j].x;
    const zj = poly[j].z;
    const intersect =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const createAcreSignTexture = (
  acreNumber: string | number,
  acres: number,
  cropShort: string,
  stageLabel: string,
  daysCount: number,
  workSummary: string,
  expense: number,
  isSelected: boolean,
  isEmptyWet: boolean,
  moisturePct: number,
  maxAnisotropy: number
): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 184;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 560, 184);
    ctx.fillStyle = isSelected
      ? '#f59e0b'
      : isEmptyWet
      ? 'rgba(12, 74, 110, 0.94)'
      : 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = isSelected
      ? '#ffffff'
      : isEmptyWet
      ? '#38bdf8'
      : '#10b981';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(8, 8, 544, 168, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected
      ? '#0f172a'
      : isEmptyWet
      ? '#7dd3fc'
      : '#34d399';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(
      isEmptyWet
        ? `एकड़ #${acreNumber} (${acres}Ac) · 💧 खाली (गीला खेत)`
        : `एकड़ #${acreNumber} (${acres}Ac) · 🌾 ${cropShort.slice(0, 18)}`,
      24,
      46
    );

    ctx.fillStyle = isSelected ? '#1e293b' : '#f8fafc';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(
      isEmptyWet
        ? `⏳ स्थिति: गीला होने से खाली (नमी ${moisturePct}%)`
        : `⏱ ${daysCount} दिन · स्टेज: ${stageLabel}`,
      24,
      86
    );

    ctx.fillStyle = isSelected
      ? '#0f172a'
      : isEmptyWet
      ? '#bae6fd'
      : '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(
      isEmptyWet
        ? '✓ बतर आते ही गेहूं (DBW 327) की बिजाई करेंगे'
        : `✓ काम: ${workSummary.slice(0, 28)}`,
      24,
      122
    );

    ctx.fillStyle = isSelected ? '#0f172a' : '#fbbf24';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(
      isEmptyWet && expense === 0
        ? 'खर्च: ₹0 (बतर आने पर बिजाई बाकी)'
        : `खर्च: ₹${expense.toLocaleString('en-IN')}`,
      24,
      156
    );
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
};

export const ThreeKhetDigitalTwin: React.FC<ThreeKhetDigitalTwinProps> = ({
  plot,
  selectedAcreId,
  activeActivity,
  onSelectAcre,
  onTriggerActivity,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [show3DLabels, setShow3DLabels] = useState<boolean>(true);
  const [isFullScreen3D, setIsFullScreen3D] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'tractor' | 'top'>('overview');

  const plotRef = useRef<FarmPlot>(plot);
  plotRef.current = plot;

  const activeActivityRef = useRef(activeActivity);
  activeActivityRef.current = activeActivity;

  const selectedAcreIdRef = useRef(selectedAcreId);
  selectedAcreIdRef.current = selectedAcreId;

  const onSelectAcreRef = useRef(onSelectAcre);
  onSelectAcreRef.current = onSelectAcre;

  const cameraPresetRef = useRef(cameraPreset);
  cameraPresetRef.current = cameraPreset;

  const show3DLabelsRef = useRef(show3DLabels);
  show3DLabelsRef.current = show3DLabels;

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl =
          probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xdbeafe);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.012);

    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      pmremGenerator.dispose();
    } catch {
      // ignore env error
    }

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 250);
    camera.position.set(0, 22, 30);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 65;
    controls.target.set(0, 0, 0);

    // 3-Point Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f6212, 0.85);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(22, 34, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 90;
    const d = 28;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rimLight.position.set(-20, 18, -22);
    scene.add(rimLight);

    // Outdoor Ground + Irrigation Canal + Tubewell Kotha + Perimeter Trees
    const groundGeo = new THREE.PlaneGeometry(180, 180);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      roughness: 0.92,
      metalness: 0.02,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const canalGroup = new THREE.Group();
    const canalBankGeo = new THREE.BoxGeometry(38, 0.45, 2.6);
    const canalBankMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.85,
    });
    const canalBank = new THREE.Mesh(canalBankGeo, canalBankMat);
    canalBank.position.set(0, 0.18, -13.5);
    canalBank.receiveShadow = true;
    canalGroup.add(canalBank);

    const canalWaterGeo = new THREE.PlaneGeometry(37.4, 1.8, 32, 4);
    const canalWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 0.9,
    });
    const canalWater = new THREE.Mesh(canalWaterGeo, canalWaterMat);
    canalWater.rotation.x = -Math.PI / 2;
    canalWater.position.set(0, 0.42, -13.5);
    canalGroup.add(canalWater);
    scene.add(canalGroup);

    const buildTubewellKotha = () => {
      const group = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.8,
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        roughness: 0.6,
      });
      const pipeMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.3,
        metalness: 0.8,
      });

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.35, 3.2),
        canalBankMat
      );
      base.position.y = 0.175;
      group.add(base);

      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.2, 2.6),
        wallMat
      );
      walls.position.y = 1.45;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.1, 4), roofMat);
      roof.position.y = 3.1;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      group.add(roof);

      const deliveryPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 1.8, 12),
        pipeMat
      );
      deliveryPipe.rotation.z = Math.PI / 2;
      deliveryPipe.position.set(1.8, 1.1, 0);
      group.add(deliveryPipe);

      const waterSpout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 1.1, 12),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.85,
        })
      );
      waterSpout.position.set(2.6, 0.55, 0);
      group.add(waterSpout);

      const solarPanel = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.08, 1.4),
        new THREE.MeshStandardMaterial({
          color: 0x1e3a8a,
          roughness: 0.2,
          metalness: 0.7,
        })
      );
      solarPanel.position.set(0, 3.65, 0.3);
      solarPanel.rotation.x = 0.35;
      group.add(solarPanel);

      group.position.set(-16, 0, -13.5);
      return group;
    };
    scene.add(buildTubewellKotha());

    const buildTree = (x: number, z: number, scale: number) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 1.6 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
      );
      trunk.position.y = 0.8 * scale;
      trunk.castShadow = true;
      tree.add(trunk);

      const crownMat = new THREE.MeshStandardMaterial({
        color: 0x15803d,
        roughness: 0.75,
      });
      const c1 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.1 * scale, 1),
        crownMat
      );
      c1.position.y = 2.1 * scale;
      c1.castShadow = true;
      tree.add(c1);

      const c2 = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.85 * scale, 1),
        crownMat
      );
      c2.position.set(0.4 * scale, 2.7 * scale, 0.2 * scale);
      tree.add(c2);

      tree.position.set(x, 0, z);
      return tree;
    };
    [
      [-18, -10, 1.1],
      [-18, 2, 0.95],
      [-18, 11, 1.15],
      [18, -11, 1.05],
      [18, 4, 1.2],
      [12, -15, 0.9],
      [-8, -15.5, 1.0],
    ].forEach(([tx, tz, sc]) => scene.add(buildTree(tx, tz, sc)));

    const khetRootGroup = new THREE.Group();
    scene.add(khetRootGroup);

    const raycastTargets: THREE.Object3D[] = [];
    const acresMetaList: Acre3DMeta[] = [];

    // Composite 9-Part 3D Tractor
    const buildCompositeTractor = (implementColor = 0xf59e0b) => {
      const tractor = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.35,
        metalness: 0.3,
      });
      const darkMetalMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.5,
      });
      const tireMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.85,
      });
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.4,
        metalness: 0.4,
      });

      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.65, 2.1),
        bodyMat
      );
      chassis.position.set(0, 0.72, 0);
      chassis.castShadow = true;
      tractor.add(chassis);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.12, 1.25),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      );
      roof.position.set(0, 1.75, -0.35);
      roof.castShadow = true;
      tractor.add(roof);

      [-0.5, 0.5].forEach((px) => {
        [-0.85, 0.15].forEach((pz) => {
          const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6),
            darkMetalMat
          );
          pillar.position.set(px, 1.35, pz);
          tractor.add(pillar);
        });
      });

      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
        darkMetalMat
      );
      exhaust.position.set(0.42, 1.35, 0.55);
      tractor.add(exhaust);

      const rearWheelGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.34, 16);
      rearWheelGeo.rotateZ(Math.PI / 2);
      [-0.7, 0.7].forEach((wx) => {
        const w = new THREE.Mesh(rearWheelGeo, tireMat);
        w.position.set(wx, 0.58, -0.48);
        w.castShadow = true;
        const rim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.36, 12).rotateZ(Math.PI / 2),
          rimMat
        );
        w.add(rim);
        tractor.add(w);
      });

      const frontWheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
      frontWheelGeo.rotateZ(Math.PI / 2);
      [-0.62, 0.62].forEach((wx) => {
        const fw = new THREE.Mesh(frontWheelGeo, tireMat);
        fw.position.set(wx, 0.36, 0.72);
        fw.castShadow = true;
        tractor.add(fw);
      });

      const implement = new THREE.Mesh(
        new THREE.BoxGeometry(1.85, 0.42, 0.65),
        new THREE.MeshStandardMaterial({
          color: implementColor,
          roughness: 0.45,
          metalness: 0.4,
        })
      );
      implement.position.set(0, 0.32, -1.35);
      implement.castShadow = true;
      tractor.add(implement);

      return tractor;
    };

    // Composite 6-Part 3D Agricultural Spray Drone
    const buildAgriSprayDrone = () => {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.28, 0.8),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.7,
        })
      );
      drone.add(body);

      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.24, 0.35, 12),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 })
      );
      tank.position.y = -0.25;
      drone.add(tank);

      [
        [-0.65, -0.65],
        [0.65, -0.65],
        [-0.65, 0.65],
        [0.65, 0.65],
      ].forEach(([rx, rz]) => {
        const arm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.95, 6),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        arm.rotation.z = Math.PI / 2;
        arm.rotation.y = Math.atan2(rz, rx);
        arm.position.set(rx * 0.5, 0.05, rz * 0.5);
        drone.add(arm);

        const rotor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 0.02, 12),
          new THREE.MeshBasicMaterial({
            color: 0x94a3b8,
            transparent: true,
            opacity: 0.65,
          })
        );
        rotor.position.set(rx, 0.14, rz);
        drone.add(rotor);
      });

      const sprayMist = new THREE.Mesh(
        new THREE.ConeGeometry(1.15, 2.4, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.28,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      sprayMist.position.y = -1.4;
      drone.add(sprayMist);

      return drone;
    };

    const mainTractor = buildCompositeTractor(0xf59e0b);
    scene.add(mainTractor);

    const sprayDrone = buildAgriSprayDrone();
    sprayDrone.position.set(0, 3.8, 0);
    scene.add(sprayDrone);

    const currentPlot = plotRef.current;
    const subPlots =
      currentPlot.subPlots && currentPlot.subPlots.length > 0
        ? currentPlot.subPlots
        : generateAcreSubPlots(
            currentPlot.id,
            currentPlot.name,
            currentPlot.acres,
            currentPlot.coordinates?.lat,
            currentPlot.coordinates?.lng,
            currentPlot.crop
          );

    const count = subPlots.length;
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count * 1.3))));
    const rows = Math.ceil(count / cols);
    const tileW = 7.4;
    const tileD = 7.4;
    const gap = 0.85;
    const totalW = cols * tileW + (cols - 1) * gap;
    const totalD = rows * tileD + (rows - 1) * gap;

    // Collect all GPS polygon vertices from outer Khet boundary and marked Acres to project exact Khet shape into 3D!
    const allGpsPoints: Array<{ lat: number; lng: number }> = [
      ...(currentPlot.boundaries || []),
      ...subPlots.flatMap((sp) => sp.boundaries || []),
      ...subPlots
        .map((sp) => sp.coordinates)
        .filter((c): c is { lat: number; lng: number } => Boolean(c)),
    ];

    const hasRealGpsPolygons =
      (currentPlot.boundaries && currentPlot.boundaries.length >= 3) ||
      subPlots.some((sp) => sp.boundaries && sp.boundaries.length >= 3);

    let centerLat = currentPlot.coordinates?.lat || 29.6857;
    let centerLng = currentPlot.coordinates?.lng || 76.9905;
    let worldScale = 0.14;

    if (allGpsPoints.length >= 3) {
      const lats = allGpsPoints.map((p) => p.lat);
      const lngs = allGpsPoints.map((p) => p.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      centerLat = (minLat + maxLat) / 2;
      centerLng = (minLng + maxLng) / 2;
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const spanXMeters = Math.max(25, (maxLng - minLng) * 111320 * cosLat);
      const spanZMeters = Math.max(25, (maxLat - minLat) * 110540);
      const maxSpanMeters = Math.max(spanXMeters, spanZMeters);
      worldScale = 25.0 / maxSpanMeters;
    }

    const projectGpsTo3D = (pt: { lat: number; lng: number }) => {
      const cosLat = Math.cos((centerLat * Math.PI) / 180);
      const dxMeters = (pt.lng - centerLng) * 111320 * cosLat;
      const dzMeters = -(pt.lat - centerLat) * 110540;
      return {
        x: dxMeters * worldScale,
        z: dzMeters * worldScale,
      };
    };

    // Render Outer Khet Boundary Polygon in 3D if available so the exact Khet shape is visible!
    if (currentPlot.boundaries && currentPlot.boundaries.length >= 3) {
      const outer3DPts = currentPlot.boundaries.map(projectGpsTo3D);
      const outerShape = new THREE.Shape();
      // Note: rotation.x = Math.PI / 2 maps shape (x, y) -> world (x, y_shape, -y_depth), so we use (pt.x, pt.z) and rotate X by +Math.PI/2
      outer3DPts.forEach((p, i) => {
        if (i === 0) outerShape.moveTo(p.x, p.z);
        else outerShape.lineTo(p.x, p.z);
      });
      outerShape.closePath();

      const outerBaseGeo = new THREE.ExtrudeGeometry(outerShape, {
        depth: 0.12,
        bevelEnabled: false,
      });
      outerBaseGeo.rotateX(Math.PI / 2);
      const outerBaseMesh = new THREE.Mesh(
        outerBaseGeo,
        new THREE.MeshStandardMaterial({
          color: 0x3f2e1e,
          roughness: 0.95,
        })
      );
      outerBaseMesh.position.y = 0.13;
      outerBaseMesh.receiveShadow = true;
      khetRootGroup.add(outerBaseMesh);

      const outerBundMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.55,
      });
      for (let i = 0; i < outer3DPts.length; i++) {
        const p1 = outer3DPts[i];
        const p2 = outer3DPts[(i + 1) % outer3DPts.length];
        const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (segLen > 0.05) {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(segLen + 0.22, 0.46, 0.24),
            outerBundMat
          );
          wall.position.set((p1.x + p2.x) / 2, 0.23, (p1.z + p2.z) / 2);
          wall.rotation.y = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
          khetRootGroup.add(wall);
        }
      }
    }

    const stalkGeo = new THREE.CylinderGeometry(0.025, 0.045, 1.0, 5);
    stalkGeo.translate(0, 0.5, 0);
    const earGeo = new THREE.SphereGeometry(0.075, 6, 6);
    earGeo.scale(1, 2.2, 1);
    earGeo.translate(0, 1.05, 0);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    subPlots.forEach((sp, idx) => {
      const r = Math.floor(idx / cols);
      const c = idx % cols;
      let cx = -totalW / 2 + tileW / 2 + c * (tileW + gap);
      let cz = -totalD / 2 + tileD / 2 + r * (tileD + gap);
      let acreWidth = tileW;
      let acreDepth = tileD;
      let polyPts2D: Array<{ x: number; z: number }> = [];

      if (sp.boundaries && sp.boundaries.length >= 3) {
        polyPts2D = sp.boundaries.map(projectGpsTo3D);
      } else if (hasRealGpsPolygons && sp.coordinates) {
        const projCenter = projectGpsTo3D(sp.coordinates);
        const halfSide = Math.max(2.6, Math.sqrt(sp.acres || 1) * 3.1);
        polyPts2D = [
          { x: projCenter.x - halfSide, z: projCenter.z - halfSide },
          { x: projCenter.x + halfSide, z: projCenter.z - halfSide },
          { x: projCenter.x + halfSide, z: projCenter.z + halfSide },
          { x: projCenter.x - halfSide, z: projCenter.z + halfSide },
        ];
      } else {
        polyPts2D = [
          { x: cx - tileW / 2, z: cz - tileD / 2 },
          { x: cx + tileW / 2, z: cz - tileD / 2 },
          { x: cx + tileW / 2, z: cz + tileD / 2 },
          { x: cx - tileW / 2, z: cz + tileD / 2 },
        ];
      }

      if (polyPts2D.length >= 3) {
        const xs = polyPts2D.map((p) => p.x);
        const zs = polyPts2D.map((p) => p.z);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minZ = Math.min(...zs);
        const maxZ = Math.max(...zs);
        cx = polyPts2D.reduce((s, p) => s + p.x, 0) / polyPts2D.length;
        cz = polyPts2D.reduce((s, p) => s + p.z, 0) / polyPts2D.length;
        acreWidth = Math.max(2.2, maxX - minX);
        acreDepth = Math.max(2.2, maxZ - minZ);
      }

      const emptyWet = isAcreEmptyOrWet(sp);
      const stage: PlotStage = emptyWet
        ? 'tilling'
        : sp.stage || currentPlot.stage || 'growing';
      const works = sp.completedActivities || [];
      const hasIrrigationWork = works.some(
        (w) => w.includes('सिंचाई') || w.toLowerCase().includes('irrigat')
      );
      const hasSprayWork = works.some(
        (w) => w.includes('स्प्रे') || w.toLowerCase().includes('spray')
      );

      const isSelectedAcre =
        sp.id === selectedAcreIdRef.current ||
        (idx === 0 && !selectedAcreIdRef.current);

      const soilColor = emptyWet
        ? 0x3b2416
        : stage === 'tilling'
        ? 0x5c3a21
        : hasIrrigationWork
        ? 0x3e2723
        : 0x6b4423;

      // Extrude exact Acre Polygon shape in 3D!
      const acreShape = new THREE.Shape();
      polyPts2D.forEach((p, i) => {
        if (i === 0) acreShape.moveTo(p.x, p.z);
        else acreShape.lineTo(p.x, p.z);
      });
      acreShape.closePath();

      const bedGeo = new THREE.ExtrudeGeometry(acreShape, {
        depth: 0.28,
        bevelEnabled: false,
      });
      bedGeo.rotateX(Math.PI / 2);
      const bedMat = new THREE.MeshStandardMaterial({
        color: soilColor,
        roughness: emptyWet ? 0.35 : 0.9,
      });
      const bedMesh = new THREE.Mesh(bedGeo, bedMat);
      bedMesh.position.set(0, 0.28, 0);
      bedMesh.receiveShadow = true;
      bedMesh.userData = { acreSubPlot: sp };
      khetRootGroup.add(bedMesh);
      raycastTargets.push(bedMesh);

      // Build 3D mud bund walls along every exact polygon edge (A1 -> A2 -> A3 -> A4...)
      const bundColor = isSelectedAcre
        ? 0x10b981
        : emptyWet
        ? 0x0284c7
        : 0x854d0e;
      const bundMat = new THREE.MeshStandardMaterial({
        color: bundColor,
        roughness: 0.75,
      });
      const bThick = isSelectedAcre ? 0.26 : 0.16;
      const bHeight = isSelectedAcre ? 0.44 : 0.34;

      for (let i = 0; i < polyPts2D.length; i++) {
        const p1 = polyPts2D[i];
        const p2 = polyPts2D[(i + 1) % polyPts2D.length];
        const segLen = Math.hypot(p2.x - p1.x, p2.z - p1.z);
        if (segLen > 0.05) {
          const edgeBund = new THREE.Mesh(
            new THREE.BoxGeometry(segLen + bThick * 0.5, bHeight, bThick),
            bundMat
          );
          edgeBund.position.set(
            (p1.x + p2.x) / 2,
            bHeight / 2,
            (p1.z + p2.z) / 2
          );
          edgeBund.rotation.y = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
          khetRootGroup.add(edgeBund);
        }
      }

      // Exact Polygon Water Plane for Irrigation animation OR Wet/Empty Soil Sheen
      const waterShapeGeo = new THREE.ShapeGeometry(acreShape);
      waterShapeGeo.rotateX(Math.PI / 2);
      const waterPlane = new THREE.Mesh(
        waterShapeGeo,
        new THREE.MeshPhysicalMaterial({
          color: emptyWet ? 0x0284c7 : 0x0ea5e9,
          roughness: 0.12,
          metalness: 0.1,
          transparent: true,
          opacity: hasIrrigationWork ? 0.55 : emptyWet ? 0.36 : 0.0,
          side: THREE.DoubleSide,
        })
      );
      waterPlane.position.set(0, 0.31, 0);
      khetRootGroup.add(waterPlane);

      // 3D Billboard Sign Sprite above each Acre
      const exp =
        (Number(sp.machineryExpense) || 0) +
        (Number(sp.labourExpense) || 0) +
        (Number(sp.materialExpense) || 0) ||
        Number(sp.allocatedExpense) ||
        0;
      const rawVar = sp.cropVariety || currentPlot.crop || 'गेहूं DBW 327';
      const cropShort = rawVar.includes('DBW 327')
        ? 'गेहूं DBW 327'
        : rawVar.split('(')[0].trim();
      const daysSinceSow = getDaysSinceSowing3D(
        sp.sowingDate || currentPlot.sowingDate
      );
      const latestWorksSummary =
        works.length > 0
          ? works.slice(-2).join(', ')
          : STAGE_HINDI[stage] || 'रोटावेटर जुताई, बिजाई';

      const signTex = createAcreSignTexture(
        sp.acreNumber,
        sp.acres,
        cropShort,
        STAGE_HINDI[stage] || 'बढ़वार',
        daysSinceSow,
        latestWorksSummary,
        exp,
        isSelectedAcre,
        emptyWet,
        sp.moisturePct || 92,
        maxAniso
      );
      const signMat = new THREE.SpriteMaterial({
        map: signTex,
        transparent: true,
        depthWrite: false,
      });
      const signSprite = new THREE.Sprite(signMat);
      signSprite.position.set(cx, 2.45, cz);
      signSprite.scale.set(4.8, 1.58, 1);
      signSprite.userData = { acreSubPlot: sp };
      khetRootGroup.add(signSprite);
      raycastTargets.push(signSprite);

      // Crop InstancedMesh inside the exact Acre Polygon! (Skip if Empty/Wet waiting for Battar)
      const cropText = (sp.cropVariety || currentPlot.crop || '').toLowerCase();
      const isMustard =
        cropText.includes('mustard') || cropText.includes('सरसों');
      const isSugarcane =
        cropText.includes('sugar') || cropText.includes('गन्ना');
      const isPaddy =
        cropText.includes('paddy') ||
        cropText.includes('धान') ||
        cropText.includes('basmati');

      const baseTransforms: Array<{
        x: number;
        z: number;
        scaleY: number;
        phase: number;
      }> = [];

      let stalksInstanced: THREE.InstancedMesh | undefined;
      let earsInstanced: THREE.InstancedMesh | undefined;

      if (!emptyWet && stage !== 'tilling') {
        const xs = polyPts2D.map((p) => p.x);
        const zs = polyPts2D.map((p) => p.z);
        const minX = Math.min(...xs) + 0.35;
        const maxX = Math.max(...xs) - 0.35;
        const minZ = Math.min(...zs) + 0.35;
        const maxZ = Math.max(...zs) - 0.35;

        const gridRows = 11;
        const gridCols = 14;
        const candidatePoints: Array<{
          px: number;
          pz: number;
          pr: number;
          pc: number;
        }> = [];

        for (let pr = 0; pr < gridRows; pr++) {
          const pz =
            minZ + (pr / Math.max(1, gridRows - 1)) * Math.max(0.5, maxZ - minZ);
          for (let pc = 0; pc < gridCols; pc++) {
            const px =
              minX +
              (pc / Math.max(1, gridCols - 1)) * Math.max(0.5, maxX - minX) +
              ((pr % 2) * 0.1 - 0.05);
            if (isPointInPolygon2D(px, pz, polyPts2D)) {
              candidatePoints.push({ px, pz, pr, pc });
            }
          }
        }

        const totalPlants = candidatePoints.length;
        if (totalPlants > 0) {
          let stalkColorHex = 0x16a34a;
          let heightBase = 0.85;
          if (stage === 'sowing') {
            stalkColorHex = 0x4ade80;
            heightBase = 0.32;
          } else if (stage === 'growing') {
            stalkColorHex = isPaddy ? 0x15803d : 0x16a34a;
            heightBase = isSugarcane ? 1.65 : 0.95;
          } else if (stage === 'flowering') {
            stalkColorHex = 0x15803d;
            heightBase = isSugarcane ? 1.9 : 1.15;
          } else if (stage === 'harvesting') {
            stalkColorHex = 0xd97706;
            heightBase = 1.1;
          }

          const stalkMat = new THREE.MeshStandardMaterial({
            color: stalkColorHex,
            roughness: 0.65,
          });
          stalksInstanced = new THREE.InstancedMesh(
            stalkGeo,
            stalkMat,
            totalPlants
          );
          stalksInstanced.castShadow = !isSoftwareGl;

          const showEars = stage === 'flowering' || stage === 'harvesting';
          if (showEars) {
            const earColor = isMustard
              ? 0xfacc15
              : stage === 'harvesting'
              ? 0xf59e0b
              : 0xa3e635;
            const earMat = new THREE.MeshStandardMaterial({
              color: earColor,
              roughness: 0.5,
            });
            earsInstanced = new THREE.InstancedMesh(earGeo, earMat, totalPlants);
          }

          candidatePoints.forEach(({ px, pz, pr, pc }, pIdx) => {
            const sy =
              heightBase * (0.88 + ((pr * 7 + pc * 13) % 10) * 0.025);
            const phase = pr * 0.5 + pc * 0.35;

            baseTransforms.push({ x: px, z: pz, scaleY: sy, phase });

            _pos.set(px, 0.28, pz);
            _euler.set(0, 0, 0);
            _quat.setFromEuler(_euler);
            _scale.set(1, sy, 1);
            _mat4.compose(_pos, _quat, _scale);
            stalksInstanced!.setMatrixAt(pIdx, _mat4);

            _color.setHex(stalkColorHex);
            _color.offsetHSL(0, 0, (((pr + pc) % 5) - 2) * 0.015);
            stalksInstanced!.setColorAt(pIdx, _color);

            if (earsInstanced) {
              earsInstanced.setMatrixAt(pIdx, _mat4);
            }
          });

          stalksInstanced.instanceMatrix.needsUpdate = true;
          if (stalksInstanced.instanceColor) {
            stalksInstanced.instanceColor.needsUpdate = true;
          }
          stalksInstanced.computeBoundingSphere();
          khetRootGroup.add(stalksInstanced);

          if (earsInstanced) {
            earsInstanced.instanceMatrix.needsUpdate = true;
            earsInstanced.computeBoundingSphere();
            khetRootGroup.add(earsInstanced);
          }
        }
      }

      acresMetaList.push({
        subPlot: sp,
        centerX: cx,
        centerZ: cz,
        width: acreWidth,
        depth: acreDepth,
        stage,
        isEmptyWet: emptyWet,
        hasIrrigationWork,
        hasSprayWork,
        stalksInstanced,
        earsInstanced,
        baseTransforms,
        waterPlane,
        signSprite,
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const moveDist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moveDist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(raycastTargets, false);
      if (hits.length > 0) {
        const hitSp = hits[0].object.userData?.acreSubPlot as
          | AcreSubPlot
          | undefined;
        if (hitSp && onSelectAcreRef.current) {
          onSelectAcreRef.current(hitSp);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const targetMeta =
        acresMetaList.find((m) => m.subPlot.id === selectedAcreIdRef.current) ||
        acresMetaList[0];

      if (targetMeta) {
        const act = activeActivityRef.current;
        const speed = act ? 3.2 : 1.35;
        const cycle = (elapsed * speed) % 8;
        const passIndex = Math.floor(cycle / 2);
        const tInPass = (cycle % 2) / 2;
        const dir = passIndex % 2 === 0 ? 1 : -1;

        const tx =
          targetMeta.centerX +
          dir * ((tInPass - 0.5) * (targetMeta.width - 2.2));
        const tz =
          targetMeta.centerZ -
          targetMeta.depth / 2 +
          1.4 +
          (passIndex / 3) * (targetMeta.depth - 2.8);

        mainTractor.position.set(tx, 0.28, tz);
        mainTractor.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        mainTractor.position.y = 0.28 + Math.sin(elapsed * 28) * 0.012;
      }

      const droneTarget =
        activeActivityRef.current === 'spray'
          ? targetMeta
          : acresMetaList.find((m) => m.hasSprayWork) || targetMeta;

      if (droneTarget) {
        sprayDrone.visible = true;
        const dx =
          droneTarget.centerX +
          Math.sin(elapsed * 1.4) * (droneTarget.width * 0.35);
        const dz =
          droneTarget.centerZ +
          Math.cos(elapsed * 1.1) * (droneTarget.depth * 0.35);
        sprayDrone.position.set(dx, 3.6 + Math.sin(elapsed * 3.5) * 0.18, dz);
        sprayDrone.rotation.z = Math.cos(elapsed * 1.4) * 0.08;
      } else {
        sprayDrone.visible = false;
      }

      acresMetaList.forEach((meta) => {
        if (meta.signSprite) {
          meta.signSprite.visible = show3DLabelsRef.current;
        }

        if (meta.waterPlane) {
          const mat = meta.waterPlane.material as THREE.MeshPhysicalMaterial;
          const isIrrigatingNow =
            activeActivityRef.current === 'irrigation' &&
            meta.subPlot.id === targetMeta?.subPlot.id;
          const targetOpacity =
            isIrrigatingNow || meta.hasIrrigationWork
              ? 0.58 + Math.sin(elapsed * 3) * 0.08
              : meta.isEmptyWet
              ? 0.36 + Math.sin(elapsed * 1.8) * 0.04
              : 0.0;
          mat.opacity = THREE.MathUtils.damp(
            mat.opacity,
            targetOpacity,
            4,
            delta
          );
        }

        if (meta.stalksInstanced && meta.baseTransforms.length > 0) {
          for (let i = 0; i < meta.baseTransforms.length; i++) {
            const bt = meta.baseTransforms[i];
            const swayZ = Math.sin(elapsed * 2.2 + bt.phase) * 0.075;
            const swayX = Math.cos(elapsed * 1.8 + bt.phase) * 0.04;

            _pos.set(bt.x, 0.28, bt.z);
            _euler.set(swayX, 0, swayZ);
            _quat.setFromEuler(_euler);
            _scale.set(1, bt.scaleY, 1);
            _mat4.compose(_pos, _quat, _scale);
            meta.stalksInstanced.setMatrixAt(i, _mat4);
            if (meta.earsInstanced) {
              meta.earsInstanced.setMatrixAt(i, _mat4);
            }
          }
          meta.stalksInstanced.instanceMatrix.needsUpdate = true;
          if (meta.earsInstanced) {
            meta.earsInstanced.instanceMatrix.needsUpdate = true;
          }
        }
      });

      if (cameraPresetRef.current === 'tractor' && targetMeta) {
        controls.target.lerp(mainTractor.position, 0.08);
      } else if (cameraPresetRef.current === 'top') {
        _pos.set(0, 34, 4);
        camera.position.lerp(_pos, 0.05);
        controls.target.lerp(_pos.set(0, 0, 0), 0.08);
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth || 800;
      const nh = container.clientHeight || 520;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, [
    plot.id,
    plot.acres,
    (plot.subPlots || []).length,
    selectedAcreId,
    isFullScreen3D,
  ]);

  const activeSubPlots = plot.subPlots || [];
  const selectedAcre =
    activeSubPlots.find((s) => s.id === selectedAcreId) || activeSubPlots[0];

  return (
    <div
      className={
        isFullScreen3D
          ? 'fixed inset-0 z-50 w-screen h-screen bg-slate-950 flex flex-col overflow-hidden'
          : 'relative w-full h-[540px] sm:h-[600px] rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-2xl bg-slate-950'
      }
    >
      {/* 1. Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Top-Left Minimal Spec & Selected Khet Badge */}
      <div className="absolute top-3 left-3 z-10 pointer-events-auto flex flex-wrap items-center gap-2">
        <div className="px-3.5 py-2 rounded-2xl bg-slate-950/90 text-white border border-white/15 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-emerald-400">
              🌾 3D डिजिटल खेत: {plot.name}
            </span>
            <span className="text-[11px] font-mono text-amber-300">
              ({plot.acres} एकड़ · {activeSubPlots.length} चक)
            </span>
          </div>
          {selectedAcre && (
            <p className="text-[11px] text-slate-300 mt-0.5">
              चयनित: <strong>एकड़ #{selectedAcre.acreNumber}</strong> ·{' '}
              {selectedAcre.cropVariety || plot.crop} ·{' '}
              {STAGE_HINDI[selectedAcre.stage || plot.stage]}
            </p>
          )}
        </div>
      </div>

      {/* 3. Top-Right Camera & Full-Screen Quick Controls */}
      <div className="absolute top-3 right-3 z-10 pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShow3DLabels((v) => !v)}
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-bold border border-white/15 flex items-center gap-1 cursor-pointer shadow-lg"
        >
          {show3DLabels ? (
            <>
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D बोर्ड छुपाएं</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>3D बोर्ड दिखाएं</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() =>
            setCameraPreset((p) =>
              p === 'overview'
                ? 'tractor'
                : p === 'tractor'
                ? 'top'
                : 'overview'
            )
          }
          className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-bold border border-white/15 flex items-center gap-1 cursor-pointer shadow-lg"
        >
          <Camera className="w-3.5 h-3.5 text-amber-400" />
          <span>
            {cameraPreset === 'overview'
              ? 'पूरा खेत व्यू'
              : cameraPreset === 'tractor'
              ? 'ट्रैक्टर फॉलो'
              : 'टॉप मैप व्यू'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsFullScreen3D((v) => !v)}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer shadow-lg"
        >
          {isFullScreen3D ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>छोटा करें</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>फुल-स्क्रीन 3D</span>
            </>
          )}
        </button>
      </div>

      {/* 4. Collapsible Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-4xl pointer-events-auto flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="px-3.5 py-1 rounded-t-xl bg-slate-950/95 text-emerald-300 text-[11px] font-black border border-b-0 border-white/15 flex items-center gap-1 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>▴ 3D खेत कंट्रोल व लाइव एनिमेशन दिखाएं</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>▾ कंट्रोल छुपाएं (Cinema View)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full p-3 rounded-2xl bg-slate-950/95 text-white border border-white/15 shadow-2xl space-y-2.5">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">
                  एकड़ चुनें:
                </span>
                {activeSubPlots.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => onSelectAcre(sp)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold whitespace-nowrap cursor-pointer ${
                      sp.id === selectedAcre?.id
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    एकड़ #{sp.acreNumber} ({sp.acres}Ac)
                  </button>
                ))}
              </div>

              {selectedAcre && (
                <span className="text-[11px] text-amber-300 font-bold whitespace-nowrap">
                  बिजाई: {selectedAcre.sowingDate || plot.sowingDate} · काम:{' '}
                  {(selectedAcre.completedActivities || []).join(', ') ||
                    'निगरानी जारी'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => onTriggerActivity('tilling', selectedAcre?.id)}
                className="py-2 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Tractor className="w-3.5 h-3.5" />
                <span>🚜 3D जुताई चलाएं</span>
              </button>

              <button
                type="button"
                onClick={() => onTriggerActivity('sowing', selectedAcre?.id)}
                className="py-2 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sprout className="w-3.5 h-3.5" />
                <span>🌱 3D बिजाई करें</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onTriggerActivity('irrigation', selectedAcre?.id)
                }
                className="py-2 px-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 border border-blue-400/40 text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>💧 3D नहर सिंचाई</span>
              </button>

              <button
                type="button"
                onClick={() => onTriggerActivity('spray', selectedAcre?.id)}
                className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wind className="w-3.5 h-3.5" />
                <span>🚁 3D ड्रोन स्प्रे</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onTriggerActivity('harvesting', selectedAcre?.id)
                }
                className="col-span-2 sm:col-span-1 py-2 px-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>🌾 3D कटाई</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
