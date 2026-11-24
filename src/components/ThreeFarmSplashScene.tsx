import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type AvengersCameraShot =
  | 'auto_movie'
  | 'cap_tractor'
  | 'hulk_urea'
  | 'spidey_broadcast'
  | 'sky_thor_iron';

interface ThreeFarmSplashSceneProps {
  onLoaded?: () => void;
  cameraShot?: AvengersCameraShot;
}

// Pre-allocated math helpers at module scope (Zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 0.8, 0);
const _dummyObj = new THREE.Object3D();

export const ThreeFarmSplashScene: React.FC<ThreeFarmSplashSceneProps> = ({
  onLoaded,
  cameraShot = 'auto_movie',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const cameraShotRef = useRef<AvengersCameraShot>(cameraShot);
  cameraShotRef.current = cameraShot;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection guard (runs once)
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    // 2. Scene, Sky & Camera
    const scene = new THREE.Scene();
    const skyColor = 0x0b1d3a;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.028);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(5.4, 2.6, 6.2);
    camera.lookAt(0, 0.8, 0);

    // 3. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL context unavailable:', err);
      if (onLoadedRef.current) onLoadedRef.current();
      return;
    }

    // Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 4. Balanced 3-Point Studio & Golden Hour Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0x064e3b, 1.15);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfde047, 2.5);
    sunLight.position.set(8, 11, 7);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 28;
      sunLight.shadow.camera.left = -7;
      sunLight.shadow.camera.right = 7;
      sunLight.shadow.camera.top = 7;
      sunLight.shadow.camera.bottom = -7;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    scene.add(sunLight);

    // Thor's Thunder Rim Light (Cyan/Blue)
    const thunderLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    thunderLight.position.set(-7, 8, -5);
    scene.add(thunderLight);

    // 5. Disposables Tracking & Procedural Canvas Textures
    const materialsToDispose: THREE.Material[] = [];
    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const texturesToDispose: THREE.Texture[] = [envTexture];

    // Procedural Canvas Texture for Captain's Shield
    const createShieldTexture = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        const cx = 128;
        const cy = 128;
        const rings = [
          { r: 126, color: '#dc2626' },
          { r: 98, color: '#f8fafc' },
          { r: 72, color: '#dc2626' },
          { r: 46, color: '#1d4ed8' },
        ];
        rings.forEach((ring) => {
          ctx.beginPath();
          ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
          ctx.fillStyle = ring.color;
          ctx.fill();
        });
        // White Star in center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const outerAngle = (i * 72 - 90) * (Math.PI / 180);
          const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
          const ox = cx + Math.cos(outerAngle) * 40;
          const oy = cy + Math.sin(outerAngle) * 40;
          const ix = cx + Math.cos(innerAngle) * 16;
          const iy = cy + Math.sin(innerAngle) * 16;
          if (i === 0) ctx.moveTo(ox, oy);
          else ctx.lineTo(ox, oy);
          ctx.lineTo(ix, iy);
        }
        ctx.closePath();
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texturesToDispose.push(tex);
      return tex;
    };

    // Procedural Canvas Texture for "UREA / DAP" Fertilizer Sacks
    const createSackTexture = (label: string) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(18, 40, 220, 176);
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 8;
        ctx.strokeRect(24, 46, 208, 164);
        ctx.fillStyle = '#14532d';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, 128, 125);
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('50 KG KHAD', 128, 175);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texturesToDispose.push(tex);
      return tex;
    };

    const shieldTex = createShieldTexture();
    const ureaSackTex = createSackTexture('UREA');
    const dapSackTex = createSackTexture('DAP');

    // PBR Materials
    const matTractorGreen = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.2,
      metalness: 0.4,
    });
    const matTractorDarkGreen = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      roughness: 0.45,
      metalness: 0.25,
    });
    const matTractorYellow = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.35,
    });
    const matTireRubber = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const matChrome = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.92,
    });
    const matCabinGlass = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.42,
      roughness: 0.1,
      metalness: 0.3,
    });
    const matSoil = new THREE.MeshStandardMaterial({
      color: 0x3b2618,
      roughness: 0.94,
      metalness: 0.03,
    });
    const matFurrow = new THREE.MeshStandardMaterial({
      color: 0x27170e,
      roughness: 0.96,
      metalness: 0.02,
    });
    const matWheat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
      metalness: 0.12,
    });
    const matGreenCrop = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.55,
      metalness: 0.08,
    });
    const matSkin = new THREE.MeshStandardMaterial({
      color: 0xfdba74,
      roughness: 0.55,
      metalness: 0.05,
    });
    const matCapBlue = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.35,
      metalness: 0.3,
    });
    const matCapRed = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.35,
    });
    const matShield = new THREE.MeshStandardMaterial({
      map: shieldTex,
      roughness: 0.18,
      metalness: 0.82,
    });
    const matHulkGreen = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.42,
      metalness: 0.1,
    });
    const matHulkPurple = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      roughness: 0.65,
      metalness: 0.05,
    });
    const matHulkHair = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.05,
    });
    const matUreaSack = new THREE.MeshStandardMaterial({
      map: ureaSackTex,
      roughness: 0.78,
      metalness: 0.05,
    });
    const matDapSack = new THREE.MeshStandardMaterial({
      map: dapSackTex,
      roughness: 0.78,
      metalness: 0.05,
    });
    const matIronRed = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.15,
      metalness: 0.88,
    });
    const matIronGold = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.14,
      metalness: 0.92,
    });
    const matArcGlow = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 3.2,
    });
    const matThorArmor = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.8,
    });
    const matThorCape = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.55,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const matMjolnirGlow = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.5,
      roughness: 0.2,
      metalness: 0.85,
    });
    const matHeadlightGlow = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: 2.4,
    });

    materialsToDispose.push(
      matTractorGreen,
      matTractorDarkGreen,
      matTractorYellow,
      matTireRubber,
      matChrome,
      matCabinGlass,
      matSoil,
      matFurrow,
      matWheat,
      matGreenCrop,
      matSkin,
      matCapBlue,
      matCapRed,
      matShield,
      matHulkGreen,
      matHulkPurple,
      matHulkHair,
      matUreaSack,
      matDapSack,
      matIronRed,
      matIronGold,
      matArcGlow,
      matThorArmor,
      matThorCape,
      matMjolnirGlow,
      matHeadlightGlow
    );

    // 6. Ground, Scrolling Furrows & Instanced Crops
    const terrainGeo = new THREE.PlaneGeometry(50, 50);
    geometriesToDispose.push(terrainGeo);
    const terrain = new THREE.Mesh(terrainGeo, matSoil);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -0.52;
    terrain.receiveShadow = !isSoftwareGl;
    scene.add(terrain);

    // Distant Hills & Trees on Horizon (Natural Outdoor Perimeter)
    const hillGeo = new THREE.ConeGeometry(4.5, 3.2, 7);
    geometriesToDispose.push(hillGeo);
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.85,
      metalness: 0.05,
    });
    materialsToDispose.push(hillMat);
    for (let h = -3; h <= 3; h++) {
      const hill = new THREE.Mesh(hillGeo, hillMat);
      hill.position.set(h * 5.2, 0.8, -16 - (Math.abs(h) % 2) * 2.5);
      hill.scale.set(1.4, 0.8 + (Math.abs(h) % 3) * 0.2, 1.1);
      scene.add(hill);
    }

    const furrowGeo = new THREE.BoxGeometry(0.26, 0.09, 32);
    geometriesToDispose.push(furrowGeo);
    for (let f = -8; f <= 8; f++) {
      const furrow = new THREE.Mesh(furrowGeo, matFurrow);
      furrow.position.set(f * 0.95, -0.49, 0);
      scene.add(furrow);
    }

    // Scrolling Cross Ties on Tractor Path
    const tieGeo = new THREE.BoxGeometry(2.2, 0.04, 0.18);
    geometriesToDispose.push(tieGeo);
    const trackTies: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const tie = new THREE.Mesh(tieGeo, matFurrow);
      tie.position.set(0, -0.48, -11 + i * 1.4);
      scene.add(tie);
      trackTies.push(tie);
    }

    // Golden Wheat & Green Crop Rows (Scrolling smoothly backward)
    const wheatEarGeo = new THREE.ConeGeometry(0.08, 0.42, 6);
    geometriesToDispose.push(wheatEarGeo);
    const wheatStalks: THREE.Mesh[] = [];
    for (let i = 0; i < 64; i++) {
      const isRightSide = i % 2 === 0;
      const row = Math.floor(i / 2);
      const ear = new THREE.Mesh(wheatEarGeo, isRightSide ? matWheat : matGreenCrop);
      const side = isRightSide ? 1 : -1;
      const x = side * (1.75 + (row % 4) * 0.82);
      const z = -11 + (row % 16) * 1.45;
      ear.position.set(x, -0.22, z);
      scene.add(ear);
      wheatStalks.push(ear);
    }

    // ==================== HERO 1: CAPTAIN KISAN + 3D TRACTOR ====================
    const tractorGroup = new THREE.Group();

    const chassisGeo = new THREE.BoxGeometry(0.95, 0.35, 2.25);
    const hoodGeo = new THREE.BoxGeometry(0.98, 0.72, 1.45);
    const grillGeo = new THREE.BoxGeometry(0.88, 0.56, 0.06);
    geometriesToDispose.push(chassisGeo, hoodGeo, grillGeo);

    const chassisMesh = new THREE.Mesh(chassisGeo, matTractorDarkGreen);
    chassisMesh.position.set(0, 0.08, 0);
    tractorGroup.add(chassisMesh);

    const hoodMesh = new THREE.Mesh(hoodGeo, matTractorGreen);
    hoodMesh.position.set(0, 0.44, 0.42);
    hoodMesh.castShadow = !isSoftwareGl;
    tractorGroup.add(hoodMesh);

    const stripeGeo = new THREE.BoxGeometry(1.01, 0.09, 1.42);
    geometriesToDispose.push(stripeGeo);
    const stripeMesh = new THREE.Mesh(stripeGeo, matTractorYellow);
    stripeMesh.position.set(0, 0.52, 0.42);
    tractorGroup.add(stripeMesh);

    const grillMesh = new THREE.Mesh(grillGeo, matTractorYellow);
    grillMesh.position.set(0, 0.42, 1.15);
    tractorGroup.add(grillMesh);

    // Captain's Iconic Shield Mounted on Front & Side of Tractor!
    const shieldGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24);
    geometriesToDispose.push(shieldGeo);
    const frontShield = new THREE.Mesh(shieldGeo, matShield);
    frontShield.rotation.x = Math.PI / 2;
    frontShield.position.set(0, 0.45, 1.22);
    tractorGroup.add(frontShield);

    // Twin Headlights
    const hlGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.06, 10);
    geometriesToDispose.push(hlGeo);
    for (const hx of [-0.32, 0.32]) {
      const hlMesh = new THREE.Mesh(hlGeo, matHeadlightGlow);
      hlMesh.rotation.x = Math.PI / 2;
      hlMesh.position.set(hx, 0.46, 1.17);
      tractorGroup.add(hlMesh);
    }

    // Cabin Roof & Pillars
    const cabinRoofGeo = new THREE.BoxGeometry(1.18, 0.1, 1.22);
    const glassGeo = new THREE.BoxGeometry(1.06, 0.86, 1.06);
    const pillarGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.9, 6);
    geometriesToDispose.push(cabinRoofGeo, glassGeo, pillarGeo);

    const cabinRoof = new THREE.Mesh(cabinRoofGeo, matTractorGreen);
    cabinRoof.position.set(0, 1.58, -0.58);
    cabinRoof.castShadow = !isSoftwareGl;
    tractorGroup.add(cabinRoof);

    const glassMesh = new THREE.Mesh(glassGeo, matCabinGlass);
    glassMesh.position.set(0, 1.1, -0.58);
    glassMesh.renderOrder = 2;
    tractorGroup.add(glassMesh);

    for (const px of [-0.5, 0.5]) {
      for (const pz of [-1.08, -0.08]) {
        const pillar = new THREE.Mesh(pillarGeo, matChrome);
        pillar.position.set(px, 1.1, pz);
        tractorGroup.add(pillar);
      }
    }

    // Articulated Captain Kisan Inside the Tractor Cabin Steering!
    const capDriverGroup = new THREE.Group();
    capDriverGroup.position.set(0, 0.72, -0.52);

    const capTorsoGeo = new THREE.BoxGeometry(0.42, 0.46, 0.26);
    const capHeadGeo = new THREE.SphereGeometry(0.16, 14, 14);
    const capHelmetGeo = new THREE.SphereGeometry(0.172, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const capArmGeo = new THREE.CapsuleGeometry(0.065, 0.28, 6, 8);
    geometriesToDispose.push(capTorsoGeo, capHeadGeo, capHelmetGeo, capArmGeo);

    const capTorso = new THREE.Mesh(capTorsoGeo, matCapBlue);
    capTorso.position.y = 0.22;
    capDriverGroup.add(capTorso);

    // Back Shield on Captain's Back
    const backShield = new THREE.Mesh(shieldGeo, matShield);
    backShield.rotation.x = Math.PI / 2;
    backShield.scale.set(0.85, 0.85, 0.85);
    backShield.position.set(0, 0.26, -0.16);
    capDriverGroup.add(backShield);

    const capHead = new THREE.Mesh(capHeadGeo, matSkin);
    capHead.position.y = 0.58;
    capDriverGroup.add(capHead);

    const capHelmet = new THREE.Mesh(capHelmetGeo, matCapBlue);
    capHelmet.position.y = 0.59;
    capDriverGroup.add(capHelmet);

    const capLeftArm = new THREE.Mesh(capArmGeo, matCapBlue);
    capLeftArm.position.set(-0.26, 0.28, 0.16);
    capLeftArm.rotation.x = Math.PI / 2.6;
    capDriverGroup.add(capLeftArm);

    const capRightArm = new THREE.Mesh(capArmGeo, matCapBlue);
    capRightArm.position.set(0.26, 0.28, 0.16);
    capRightArm.rotation.x = Math.PI / 2.6;
    capDriverGroup.add(capRightArm);

    tractorGroup.add(capDriverGroup);

    // Rear Fenders & Exhaust
    const fenderGeo = new THREE.BoxGeometry(0.36, 0.12, 0.95);
    const exhaustGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.95, 8);
    geometriesToDispose.push(fenderGeo, exhaustGeo);
    for (const fx of [-0.68, 0.68]) {
      const fender = new THREE.Mesh(fenderGeo, matTractorGreen);
      fender.position.set(fx, 0.72, -0.62);
      tractorGroup.add(fender);
    }
    const exhaustMesh = new THREE.Mesh(exhaustGeo, matChrome);
    exhaustMesh.position.set(0.42, 1.08, 0.68);
    tractorGroup.add(exhaustMesh);

    // Rear Cultivator / Rotavator Plowing Attachment
    const cultivatorBarGeo = new THREE.BoxGeometry(1.9, 0.12, 0.16);
    const tineGeo = new THREE.BoxGeometry(0.06, 0.42, 0.08);
    geometriesToDispose.push(cultivatorBarGeo, tineGeo);
    const cultivatorBar = new THREE.Mesh(cultivatorBarGeo, matCapRed);
    cultivatorBar.position.set(0, -0.08, -1.45);
    tractorGroup.add(cultivatorBar);
    for (let t = -3; t <= 3; t++) {
      const tine = new THREE.Mesh(tineGeo, matChrome);
      tine.position.set(t * 0.26, -0.28, -1.45);
      tine.rotation.x = 0.25;
      tractorGroup.add(tine);
    }

    // 4 Rotating 3D Wheels
    const rearWheels: THREE.Group[] = [];
    const frontWheels: THREE.Group[] = [];
    const createWheel = (radius: number, w: number) => {
      const wheelGroup = new THREE.Group();
      const tireGeo = new THREE.CylinderGeometry(radius, radius, w, 16);
      const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, w * 1.03, 12);
      const hubGeo = new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, w * 1.12, 8);
      const lugGeo = new THREE.BoxGeometry(w * 0.92, 0.06, 0.09);
      geometriesToDispose.push(tireGeo, rimGeo, hubGeo, lugGeo);

      const tireMesh = new THREE.Mesh(tireGeo, matTireRubber);
      tireMesh.rotation.z = Math.PI / 2;
      tireMesh.castShadow = !isSoftwareGl;
      wheelGroup.add(tireMesh);

      for (let t = 0; t < 10; t++) {
        const angle = (t / 10) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, matTireRubber);
        lug.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
        lug.rotation.x = angle;
        wheelGroup.add(lug);
      }

      const rimMesh = new THREE.Mesh(rimGeo, matTractorYellow);
      rimMesh.rotation.z = Math.PI / 2;
      wheelGroup.add(rimMesh);

      const hubMesh = new THREE.Mesh(hubGeo, matChrome);
      hubMesh.rotation.z = Math.PI / 2;
      wheelGroup.add(hubMesh);
      return wheelGroup;
    };

    const rearRadius = 0.66;
    const frontRadius = 0.42;
    const rlWheel = createWheel(rearRadius, 0.4);
    rlWheel.position.set(-0.72, 0.14, -0.62);
    tractorGroup.add(rlWheel);
    rearWheels.push(rlWheel);

    const rrWheel = createWheel(rearRadius, 0.4);
    rrWheel.position.set(0.72, 0.14, -0.62);
    tractorGroup.add(rrWheel);
    rearWheels.push(rrWheel);

    const flWheel = createWheel(frontRadius, 0.26);
    flWheel.position.set(-0.64, -0.1, 0.78);
    tractorGroup.add(flWheel);
    frontWheels.push(flWheel);

    const frWheel = createWheel(frontRadius, 0.26);
    frWheel.position.set(0.64, -0.1, 0.78);
    tractorGroup.add(frWheel);
    frontWheels.push(frWheel);

    scene.add(tractorGroup);

    // ==================== HERO 2: HULK KISAN CARRYING UREA & DAP SACKS ====================
    const hulkGroup = new THREE.Group();
    hulkGroup.position.set(1.85, -0.52, 0.65);

    const hulkTorsoGeo = new THREE.BoxGeometry(0.92, 0.95, 0.56);
    const hulkChestGeo = new THREE.BoxGeometry(0.98, 0.48, 0.62);
    const hulkHeadGeo = new THREE.BoxGeometry(0.38, 0.42, 0.38);
    const hulkHairGeo = new THREE.BoxGeometry(0.41, 0.16, 0.41);
    const hulkLegGeo = new THREE.CapsuleGeometry(0.18, 0.48, 6, 10);
    const hulkArmGeo = new THREE.CapsuleGeometry(0.17, 0.56, 6, 10);
    const sackGeo = new THREE.BoxGeometry(0.72, 0.36, 0.52);
    geometriesToDispose.push(
      hulkTorsoGeo,
      hulkChestGeo,
      hulkHeadGeo,
      hulkHairGeo,
      hulkLegGeo,
      hulkArmGeo,
      sackGeo
    );

    const hulkTorso = new THREE.Mesh(hulkTorsoGeo, matHulkGreen);
    hulkTorso.position.y = 1.18;
    hulkTorso.castShadow = !isSoftwareGl;
    hulkGroup.add(hulkTorso);

    const hulkChest = new THREE.Mesh(hulkChestGeo, matHulkGreen);
    hulkChest.position.set(0, 1.38, 0.03);
    hulkGroup.add(hulkChest);

    const hulkHead = new THREE.Mesh(hulkHeadGeo, matHulkGreen);
    hulkHead.position.set(0, 1.86, 0.04);
    hulkGroup.add(hulkHead);

    const hulkHair = new THREE.Mesh(hulkHairGeo, matHulkHair);
    hulkHair.position.set(0, 2.08, 0.04);
    hulkGroup.add(hulkHair);

    // Hulk's animated legs (Purple shorts + Green muscular calves)
    const hulkLeftLeg = new THREE.Mesh(hulkLegGeo, matHulkPurple);
    hulkLeftLeg.position.set(-0.24, 0.46, 0);
    hulkGroup.add(hulkLeftLeg);

    const hulkRightLeg = new THREE.Mesh(hulkLegGeo, matHulkPurple);
    hulkRightLeg.position.set(0.24, 0.46, 0);
    hulkGroup.add(hulkRightLeg);

    // Hulk's raised muscular arms holding Giant UREA & DAP Sacks on his shoulders!
    const hulkLeftArm = new THREE.Mesh(hulkArmGeo, matHulkGreen);
    hulkLeftArm.position.set(-0.64, 1.56, 0.1);
    hulkLeftArm.rotation.z = 0.35;
    hulkGroup.add(hulkLeftArm);

    const hulkRightArm = new THREE.Mesh(hulkArmGeo, matHulkGreen);
    hulkRightArm.position.set(0.64, 1.56, 0.1);
    hulkRightArm.rotation.z = -0.35;
    hulkGroup.add(hulkRightArm);

    // 2 Stacked Fertilizer Sacks on each shoulder ("UREA" & "DAP")
    const sackLeft1 = new THREE.Mesh(sackGeo, matUreaSack);
    sackLeft1.position.set(-0.52, 1.84, -0.05);
    sackLeft1.rotation.z = 0.12;
    hulkGroup.add(sackLeft1);

    const sackLeft2 = new THREE.Mesh(sackGeo, matDapSack);
    sackLeft2.position.set(-0.5, 2.18, -0.05);
    sackLeft2.rotation.z = 0.06;
    hulkGroup.add(sackLeft2);

    const sackRight1 = new THREE.Mesh(sackGeo, matDapSack);
    sackRight1.position.set(0.52, 1.84, -0.05);
    sackRight1.rotation.z = -0.12;
    hulkGroup.add(sackRight1);

    const sackRight2 = new THREE.Mesh(sackGeo, matUreaSack);
    sackRight2.position.set(0.5, 2.18, -0.05);
    sackRight2.rotation.z = -0.06;
    hulkGroup.add(sackRight2);

    scene.add(hulkGroup);

    // ==================== HERO 3: SPIDEY KISAN BROADCASTING SEEDS & UREA (छींटा) ====================
    const spideyGroup = new THREE.Group();
    spideyGroup.position.set(-1.85, -0.52, 0.9);

    const spideyTorsoGeo = new THREE.CapsuleGeometry(0.18, 0.44, 6, 10);
    const spideyHeadGeo = new THREE.SphereGeometry(0.17, 14, 14);
    const spideyLimbGeo = new THREE.CapsuleGeometry(0.075, 0.38, 6, 8);
    const bagGeo = new THREE.SphereGeometry(0.22, 10, 10);
    geometriesToDispose.push(spideyTorsoGeo, spideyHeadGeo, spideyLimbGeo, bagGeo);

    const spideyTorso = new THREE.Mesh(spideyTorsoGeo, matCapRed);
    spideyTorso.position.y = 0.88;
    spideyGroup.add(spideyTorso);

    const spideyHead = new THREE.Mesh(spideyHeadGeo, matCapRed);
    spideyHead.position.y = 1.34;
    spideyGroup.add(spideyHead);

    const spideyLeftLeg = new THREE.Mesh(spideyLimbGeo, matCapBlue);
    spideyLeftLeg.position.set(-0.12, 0.36, 0);
    spideyGroup.add(spideyLeftLeg);

    const spideyRightLeg = new THREE.Mesh(spideyLimbGeo, matCapBlue);
    spideyRightLeg.position.set(0.12, 0.36, 0);
    spideyGroup.add(spideyRightLeg);

    const spideyLeftArm = new THREE.Mesh(spideyLimbGeo, matCapRed);
    spideyLeftArm.position.set(-0.26, 0.94, 0.1);
    spideyGroup.add(spideyLeftArm);

    // Right arm pivots to throw fertilizer/seeds ("छींटा")
    const spideyThrowArm = new THREE.Mesh(spideyLimbGeo, matCapRed);
    spideyThrowArm.position.set(0.28, 0.98, 0.15);
    spideyGroup.add(spideyThrowArm);

    // Fertilizer Sling Bag on Spidey's hip
    const seedBag = new THREE.Mesh(bagGeo, matUreaSack);
    seedBag.position.set(-0.24, 0.72, 0.14);
    spideyGroup.add(seedBag);

    scene.add(spideyGroup);

    // Flying Fertilizer / Seed Broadcasting Granules (InstancedMesh for 60fps performance)
    const granuleCount = 60;
    const granuleGeo = new THREE.OctahedronGeometry(0.04, 0);
    const granuleMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    geometriesToDispose.push(granuleGeo);
    materialsToDispose.push(granuleMat);

    const granuleInstanced = new THREE.InstancedMesh(granuleGeo, granuleMat, granuleCount);
    granuleInstanced.frustumCulled = false;
    scene.add(granuleInstanced);

    // ==================== HERO 4: THOR KISAN IN THE SKY WITH MJOLNIR + RAIN & LIGHTNING ====================
    const thorGroup = new THREE.Group();
    thorGroup.position.set(2.4, 2.75, -1.6);

    const thorTorso = new THREE.Mesh(spideyTorsoGeo, matThorArmor);
    thorTorso.scale.set(1.2, 1.15, 1.15);
    thorGroup.add(thorTorso);

    const thorHead = new THREE.Mesh(spideyHeadGeo, matSkin);
    thorHead.position.y = 0.48;
    thorGroup.add(thorHead);

    // Flowing Red Cape
    const capeGeo = new THREE.PlaneGeometry(0.75, 1.15, 4, 6);
    geometriesToDispose.push(capeGeo);
    const thorCape = new THREE.Mesh(capeGeo, matThorCape);
    thorCape.position.set(0, -0.1, -0.22);
    thorCape.rotation.x = 0.35;
    thorGroup.add(thorCape);

    // Raised Right Arm holding Glowing Mjolnir Hammer!
    const thorHammerArm = new THREE.Group();
    thorHammerArm.position.set(0.28, 0.25, 0.1);
    const thorArmMesh = new THREE.Mesh(spideyLimbGeo, matSkin);
    thorArmMesh.position.y = 0.22;
    thorHammerArm.add(thorArmMesh);

    const hammerHandleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8);
    const hammerHeadGeo = new THREE.BoxGeometry(0.28, 0.18, 0.18);
    geometriesToDispose.push(hammerHandleGeo, hammerHeadGeo);

    const hammerHandle = new THREE.Mesh(hammerHandleGeo, matSoil);
    hammerHandle.position.set(0, 0.48, 0);
    thorHammerArm.add(hammerHandle);

    const hammerHead = new THREE.Mesh(hammerHeadGeo, matMjolnirGlow);
    hammerHead.position.set(0, 0.64, 0);
    thorHammerArm.add(hammerHead);

    thorGroup.add(thorHammerArm);
    scene.add(thorGroup);

    // 3D Lightning Bolt from Thor's Hammer to the Sky/Clouds
    const lightningGeo = new THREE.CylinderGeometry(0.03, 0.015, 2.6, 6);
    geometriesToDispose.push(lightningGeo);
    const lightningBolt = new THREE.Mesh(lightningGeo, matMjolnirGlow);
    lightningBolt.position.set(2.6, 3.8, -1.6);
    lightningBolt.rotation.z = -0.25;
    scene.add(lightningBolt);

    // Falling Irrigation Rain Drops under Thor (InstancedMesh)
    const rainCount = 120;
    const rainGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.32, 4);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.65,
    });
    geometriesToDispose.push(rainGeo);
    materialsToDispose.push(rainMat);
    const rainInstanced = new THREE.InstancedMesh(rainGeo, rainMat, rainCount);
    rainInstanced.frustumCulled = false;
    scene.add(rainInstanced);

    // ==================== HERO 5: IRON KISAN FLYING OVERHEAD SCANNING & SPRAYING ====================
    const ironManGroup = new THREE.Group();
    ironManGroup.position.set(-2.2, 2.85, -1.2);

    const ironTorso = new THREE.Mesh(spideyTorsoGeo, matIronRed);
    ironTorso.rotation.x = Math.PI / 2.3; // Flying horizontal posture
    ironManGroup.add(ironTorso);

    const ironHead = new THREE.Mesh(spideyHeadGeo, matIronGold);
    ironHead.position.set(0, 0.22, 0.42);
    ironManGroup.add(ironHead);

    // Glowing Cyan Arc Reactor on Chest
    const arcGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.04, 12);
    geometriesToDispose.push(arcGeo);
    const arcMesh = new THREE.Mesh(arcGeo, matArcGlow);
    arcMesh.position.set(0, -0.14, 0.08);
    ironManGroup.add(arcMesh);

    // Iron Man's Crop Scanner / Aerial Spray Cone Beam Underneath
    const scanConeGeo = new THREE.ConeGeometry(1.1, 2.8, 16, 1, true);
    const scanConeMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    geometriesToDispose.push(scanConeGeo);
    materialsToDispose.push(scanConeMat);
    const scanCone = new THREE.Mesh(scanConeGeo, scanConeMat);
    scanCone.position.set(0, -1.5, 0);
    ironManGroup.add(scanCone);

    scene.add(ironManGroup);

    // ==================== EXHAUST SMOKE PUFFS ====================
    const smokeCount = 12;
    const smokePuffs: { mesh: THREE.Mesh; life: number; speedY: number; driftX: number }[] = [];
    const smokeGeo = new THREE.DodecahedronGeometry(0.09, 0);
    geometriesToDispose.push(smokeGeo);

    for (let i = 0; i < smokeCount; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.35,
      });
      materialsToDispose.push(mat);
      const mesh = new THREE.Mesh(smokeGeo, mat);
      scene.add(mesh);
      smokePuffs.push({
        mesh,
        life: i / smokeCount,
        speedY: 1.1 + (i % 3) * 0.2,
        driftX: ((i % 2) - 0.5) * 0.25,
      });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    if (onLoadedRef.current) {
      onLoadedRef.current();
    }

    // ==================== 60FPS 3D VIDEO ANIMATION LOOP ====================
    let frameId = 0;
    let isDisposed = false;
    let lastTime = performance.now();
    let elapsedTotal = 0;

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext | null;
        if (!gl) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
        if (gl.flush) gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : null;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync && gl.deleteSync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const driveSpeed = 3.5;

    function tick() {
      if (isDisposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsedTotal += dt;

      // 1. Tractor & Captain Kisan Animation
      tractorGroup.position.y = Math.sin(elapsedTotal * 15) * 0.015;
      tractorGroup.rotation.z = Math.sin(elapsedTotal * 8) * 0.008;
      capDriverGroup.rotation.y = Math.sin(elapsedTotal * 2.5) * 0.18;

      const rearAngularDelta = (driveSpeed * dt) / rearRadius;
      const frontAngularDelta = (driveSpeed * dt) / frontRadius;
      for (let i = 0; i < rearWheels.length; i++) rearWheels[i].rotation.x += rearAngularDelta;
      for (let i = 0; i < frontWheels.length; i++) frontWheels[i].rotation.x += frontAngularDelta;

      // 2. Scroll Track & Crops
      for (let i = 0; i < trackTies.length; i++) {
        trackTies[i].position.z -= driveSpeed * dt;
        if (trackTies[i].position.z < -11) trackTies[i].position.z += 25.2;
      }
      for (let i = 0; i < wheatStalks.length; i++) {
        wheatStalks[i].position.z -= driveSpeed * dt;
        if (wheatStalks[i].position.z < -11) wheatStalks[i].position.z += 23.2;
        wheatStalks[i].rotation.z = Math.sin(elapsedTotal * 3 + i * 0.5) * 0.08;
      }

      // 3. Hulk Kisan Heavy Walking Stride with UREA & DAP Sacks
      const walkCycle = elapsedTotal * 6.5;
      hulkGroup.position.y = -0.52 + Math.abs(Math.sin(walkCycle)) * 0.09;
      hulkGroup.rotation.z = Math.sin(walkCycle) * 0.05;
      hulkLeftLeg.rotation.x = Math.sin(walkCycle) * 0.45;
      hulkRightLeg.rotation.x = -Math.sin(walkCycle) * 0.45;

      // 4. Spidey Kisan Broadcasting Fertilizer ("छींटा") Animation
      const throwCycle = elapsedTotal * 5.5;
      spideyGroup.position.y = -0.52 + Math.abs(Math.cos(throwCycle)) * 0.12;
      spideyLeftLeg.rotation.x = Math.cos(throwCycle) * 0.5;
      spideyRightLeg.rotation.x = -Math.cos(throwCycle) * 0.5;
      spideyThrowArm.rotation.z = -0.6 + Math.sin(throwCycle) * 0.9;
      spideyThrowArm.rotation.x = Math.cos(throwCycle) * 0.7;

      // Update Broadcasted Granules flying out from Spidey's hand
      for (let i = 0; i < granuleCount; i++) {
        const phase = (elapsedTotal * 1.8 + i / granuleCount) % 1;
        const spreadAngle = ((i % 12) - 6) * 0.16;
        const gx = -1.6 - Math.cos(spreadAngle) * phase * 2.4;
        const gy = 0.45 + Math.sin(phase * Math.PI) * 0.85 - phase * 0.7;
        const gz = 0.9 + Math.sin(spreadAngle) * phase * 2.2 - phase * 1.1;
        _dummyObj.position.set(gx, gy, gz);
        const gs = 1 - phase * 0.5;
        _dummyObj.scale.set(gs, gs, gs);
        _dummyObj.updateMatrix();
        granuleInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      granuleInstanced.instanceMatrix.needsUpdate = true;

      // 5. Thor Kisan Hovering + Hammer Lightning + Falling Irrigation Rain
      thorGroup.position.y = 2.75 + Math.sin(elapsedTotal * 2.8) * 0.18;
      thorHammerArm.rotation.x = -0.4 + Math.sin(elapsedTotal * 4) * 0.22;
      thorCape.rotation.x = 0.4 + Math.sin(elapsedTotal * 7) * 0.14;

      const flash = Math.sin(elapsedTotal * 19) > 0.65;
      lightningBolt.visible = flash;
      thunderLight.intensity = flash ? 3.4 : 1.3;

      for (let i = 0; i < rainCount; i++) {
        const rPhase = (elapsedTotal * 2.4 + (i * 0.17) % 1) % 1;
        const rx = 1.2 + ((i * 37) % 36) * 0.11;
        const ry = 3.6 - rPhase * 4.1;
        const rz = -4.5 + ((i * 53) % 40) * 0.18;
        _dummyObj.position.set(rx, ry, rz);
        _dummyObj.scale.set(1, 1, 1);
        _dummyObj.updateMatrix();
        rainInstanced.setMatrixAt(i, _dummyObj.matrix);
      }
      rainInstanced.instanceMatrix.needsUpdate = true;

      // 6. Iron Kisan Swooping Figure-8 Aerial Crop Scan & Spray
      const flyT = elapsedTotal * 0.95;
      ironManGroup.position.x = -2.1 + Math.sin(flyT) * 1.6;
      ironManGroup.position.z = -0.5 + Math.cos(flyT * 2) * 1.4;
      ironManGroup.position.y = 2.65 + Math.sin(flyT * 2) * 0.25;
      ironManGroup.rotation.z = -Math.cos(flyT) * 0.32;
      ironManGroup.rotation.y = Math.sin(flyT) * 0.35;

      // 7. Exhaust Smoke Puffs
      for (let i = 0; i < smokePuffs.length; i++) {
        const p = smokePuffs[i];
        p.life += dt * 0.9;
        if (p.life >= 1) p.life %= 1;
        p.mesh.position.set(
          0.42 + p.driftX * p.life,
          1.55 + p.life * p.speedY,
          0.68 - p.life * 1.4
        );
        const s = 0.8 + p.life * 2.2;
        p.mesh.scale.set(s, s, s);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.36 * (1 - p.life);
      }

      // 8. 3D Video Director Camera System (Smooth Exponential Damping)
      const shotMode = cameraShotRef.current;
      let activeShot = shotMode;
      if (shotMode === 'auto_movie') {
        // Cycle through dramatic 3D movie camera angles every 3.5 seconds!
        const cycleIdx = Math.floor(elapsedTotal / 3.5) % 4;
        activeShot = (['cap_tractor', 'hulk_urea', 'spidey_broadcast', 'sky_thor_iron'] as const)[
          cycleIdx
        ];
      }

      if (activeShot === 'cap_tractor') {
        _targetCamPos.set(
          3.4 + Math.sin(elapsedTotal * 0.6) * 0.8,
          1.85,
          4.2 + Math.cos(elapsedTotal * 0.6) * 0.6
        );
        _targetLookAt.set(0.1, 0.75, 0.3);
      } else if (activeShot === 'hulk_urea') {
        _targetCamPos.set(3.9, 1.75, 3.6);
        _targetLookAt.set(1.45, 1.1, 0.5);
      } else if (activeShot === 'spidey_broadcast') {
        _targetCamPos.set(-3.8, 1.65, 3.7);
        _targetLookAt.set(-1.55, 0.65, 0.6);
      } else {
        // Wide Heroic Pan showing Sky Heroes (Thor + Iron Man) & Ground Squad
        _targetCamPos.set(
          Math.sin(elapsedTotal * 0.45) * 5.8,
          2.65,
          6.4 + Math.cos(elapsedTotal * 0.45) * 0.8
        );
        _targetLookAt.set(0, 1.35, -0.3);
      }

      const dampFactor = 1 - Math.exp(-3.2 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
      texturesToDispose.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none"
      style={{ touchAction: 'none' }}
    />
  );
};
