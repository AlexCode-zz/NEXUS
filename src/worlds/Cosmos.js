import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';
import { PALETTES, paletteGradient } from '../utils/Palettes.js';
import { POINTER_UNIFORMS, POINTER_FUNCTION } from '../shaders/PointerGLSL.js';

/**
 * COSMOS — Galaxia espiral procedural.
 *
 * Elementos generados en el vertex/fragment shader (todo en GPU):
 *  - Brazos galácticos espirales con rotación diferencial (el centro gira
 *    más rápido que el borde, como una galaxia real).
 *  - Núcleo luminoso con halo progresivo.
 *  - Miles de estrellas de tamaños variables con titileo.
 *  - Polvo cósmico en un disco grueso.
 *  - Nebulosas tintadas por la paleta.
 *  - Disco de halo galáctico (resplandor difuso).
 *  - Cinturón de asteroides malla instanciada con iluminación real
 *    (AmbientLight + PointLight en el núcleo).
 *  - Anillos orbitales.
 *
 * El cursor perturba el campo de partículas en tiempo real.
 */
const POINTER_MODES = { attraction: 0, repulsion: 1, turbulence: 2, gravity: 3, orbit: 4 };

export class Cosmos {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.name = 'cosmos';

    this.group = null;
    this.material = null;
    this.coreMaterial = null;
    this.dustMaterial = null;
    this.nebulaMaterial = null;
    this.diskMaterial = null;
    this.galaxy = null;
    this.core = null;
    this.dust = null;
    this.nebula = null;
    this.diskGlow = null;
    this.asteroids = null;
    this.asteroidMaterial = null;
    this.asteroidData = [];
    this.orbitRings = [];
    this.lights = [];

    this.paletteIndex = 0;
    this.pointer = new THREE.Vector3(0, 0, 0);
    this.pointerActive = false;
    this.pointerConfig = { mode: 0, radius: 6, strength: 2.4 };

    this.params = {
      particleCount: this.qualitySettings.maxParticles || 24000,
      arms: 4,
      radius: 17,
      speed: 1.0,
      glow: 1.2,
      rotation: 1.0,
      turbulence: 0.0
    };

    this.count = 0;
  }

  /* ------------------------------------------------------------------ */
  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    if (params.palette !== undefined) this.paletteIndex = params.palette;
    this._build();
  }

  /* ------------------------------------------------------------------ */
  _build() {
    this.destroy();

    const rng = new SeededRandom(this.seed);
    const palette = PALETTES[this.paletteIndex];
    const q = this.qualitySettings;

    const total = Math.max(2000, Math.floor(this.params.particleCount));
    const starCount = Math.floor(total * 0.62);
    const coreCount = Math.floor(total * 0.13);
    const dustCount = Math.floor(total * 0.22);
    const nebulaCount = Math.floor(total * 0.03);
    const asteroidCount = (q.qualityLevel === 'low' ? 60 : q.qualityLevel === 'medium' ? 120 : 200);

    this.count = total + asteroidCount;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const baseSize = (q.particleSize || 1.0) * 0.42;

    this.group = new THREE.Group();

    /* ================================================================
       1. GALAXIA — brazos espirales + rotación diferencial
       ================================================================ */
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starScale = new Float32Array(starCount);
    const starAngle = new Float32Array(starCount);
    const starRadius = new Float32Array(starCount);
    const starRandom = new Float32Array(starCount);

    const R = this.params.radius;
    const arms = this.params.arms;
    const twist = 2.5; // factor de enrollado del espiral

    const cTmp = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Distribución radial: densidad alta hacia el núcleo
      const r = Math.pow(rng.random(), 1.9) * R;

      // Ángulo del brazo + enrollado logarítmico
      const arm = i % arms;
      const armPhase = (arm / arms) * Math.PI * 2;
      const spiral = Math.log(1 + r * 0.55) * twist;
      const scatter = (rng.random() + rng.random() + rng.random() - 1.5) * (0.42 + r * 0.055);

      const angle = armPhase + spiral + scatter;
      const thickness = (1.5 - (r / R) * 1.15) * (0.35 + rng.random() * 0.65);
      const y = scatter * thickness * 0.55;

      starPos[i3] = Math.cos(angle) * r;
      starPos[i3 + 1] = y;
      starPos[i3 + 2] = Math.sin(angle) * r;

      starAngle[i] = angle;
      starRadius[i] = r + scatter * 0.32;

      const t = r / R;
      const rgb = paletteGradient(palette, t);
      const b = 0.72 + rng.random() * 0.5;
      starCol[i3] = rgb[0] * b;
      starCol[i3 + 1] = rgb[1] * b;
      starCol[i3 + 2] = rgb[2] * b;

      // Partículas más grandes y brillantes cerca del núcleo
      starScale[i] = (1.0 - t) * 1.7 + Math.pow(rng.random(), 2.2) * 1.35 + 0.32;
      starRandom[i] = rng.random();
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeometry.setAttribute('aScale', new THREE.BufferAttribute(starScale, 1));
    starGeometry.setAttribute('aAngle', new THREE.BufferAttribute(starAngle, 1));
    starGeometry.setAttribute('aRadius', new THREE.BufferAttribute(starRadius, 1));
    starGeometry.setAttribute('aRandom', new THREE.BufferAttribute(starRandom, 1));
    starGeometry.computeBoundingSphere();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uRotation: { value: this.params.rotation },
        uPointSize: { value: baseSize },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: this.params.glow },
        uPointer: { value: this.pointer },
        uPointerActive: { value: 0 },
        uPointerRadius: { value: this.pointerConfig.radius },
        uPointerStrength: { value: this.pointerConfig.strength },
        uPointerMode: { value: this.pointerConfig.mode }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uRotation;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        ${POINTER_UNIFORMS}
        ${POINTER_FUNCTION}

        void main() {
          vColor = color;

          // Rotación diferencial: el centro gira más rápido que el borde
          float orbit = uTime * uSpeed * uRotation * 0.08 / (0.55 + aRadius * 0.24);
          float angle = aAngle + orbit;

          vec3 pos = vec3(cos(angle) * aRadius, position.y, sin(angle) * aRadius);

          // Interacción del cursor (en GPU)
          pos = applyPointer(pos, uTime, 1.0);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDist = -mvPosition.z;

          float sizeAtten = 320.0 / max(vDist, 1.0);
          gl_PointSize = min(uPointSize * aScale * sizeAtten * uPixelRatio, 24.0 * uPixelRatio);

          float twinkle = 0.72 + 0.28 * sin(uTime * 1.7 + aRandom * 31.4);
          vAlpha = twinkle * clamp(1.0 - (vDist - 46.0) / 200.0, 0.10, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uGlow;

        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;

          float core = smoothstep(0.5, 0.0, d);
          float soft = pow(core, 3.0);
          float atten = 1.0 / (1.0 + vDist * 0.011);

          vec3 col = vColor * (0.34 + soft * 1.65) * uGlow * atten;
          float alpha = core * vAlpha * 0.92;

          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.galaxy = new THREE.Points(starGeometry, this.material);
    this.group.add(this.galaxy);

    /* ================================================================
       2. NÚCLEO LUMINOSO — cúmulo denso de alto brillo
       ================================================================ */
    const corePos = new Float32Array(coreCount * 3);
    const coreCol = new Float32Array(coreCount * 3);
    const coreScale = new Float32Array(coreCount);
    const coreAngle = new Float32Array(coreCount);
    const coreRadius = new Float32Array(coreCount);
    const coreRandom = new Float32Array(coreCount);
    const coreColor = new THREE.Color(palette.core);
    const innerColor = new THREE.Color(palette.inner);

    for (let i = 0; i < coreCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(rng.random(), 2.4) * (R * 0.16);
      const angle = rng.random() * Math.PI * 2;
      const y = (rng.random() - 0.5) * (0.5 + r * 0.05);

      corePos[i3] = Math.cos(angle) * r;
      corePos[i3 + 1] = y;
      corePos[i3 + 2] = Math.sin(angle) * r;
      coreAngle[i] = angle;
      coreRadius[i] = r;
      coreRandom[i] = rng.random();

      const mix = Math.min(1, r / (R * 0.16)) * 0.7;
      cTmp.copy(coreColor).lerp(innerColor, mix);
      coreCol[i3] = cTmp.r;
      coreCol[i3 + 1] = cTmp.g;
      coreCol[i3 + 2] = cTmp.b;
      coreScale[i] = 0.5 + Math.pow(rng.random(), 1.6) * 1.5;
    }

    const coreGeometry = new THREE.BufferGeometry();
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeometry.setAttribute('color', new THREE.BufferAttribute(coreCol, 3));
    coreGeometry.setAttribute('aScale', new THREE.BufferAttribute(coreScale, 1));
    coreGeometry.setAttribute('aAngle', new THREE.BufferAttribute(coreAngle, 1));
    coreGeometry.setAttribute('aRadius', new THREE.BufferAttribute(coreRadius, 1));
    coreGeometry.setAttribute('aRandom', new THREE.BufferAttribute(coreRandom, 1));

    this.coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed * 1.4 },
        uPointSize: { value: baseSize * 1.25 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: this.params.glow * 1.35 },
        uPointer: { value: this.pointer },
        uPointerActive: { value: 0 },
        uPointerRadius: { value: this.pointerConfig.radius },
        uPointerStrength: { value: this.pointerConfig.strength },
        uPointerMode: { value: this.pointerConfig.mode }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vDist;

        ${POINTER_UNIFORMS}
        ${POINTER_FUNCTION}

        void main() {
          vColor = color;
          float orbit = uTime * uSpeed * 0.35 / (0.25 + aRadius * 0.5);
          float angle = aAngle + orbit;

          vec3 pos = vec3(cos(angle) * aRadius, position.y, sin(angle) * aRadius);
          pos = applyPointer(pos, uTime, 0.7);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;
          gl_PointSize = min(uPointSize * aScale * (400.0 / max(vDist, 1.0)) * uPixelRatio, 30.0 * uPixelRatio);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uGlow;
        varying vec3 vColor;
        varying float vDist;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float hot = pow(core, 4.0);
          vec3 col = mix(vColor, vec3(1.0), hot * 0.55) * (0.5 + hot * 2.0) * uGlow;
          gl_FragColor = vec4(col, core * (0.35 + hot * 0.55));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.core = new THREE.Points(coreGeometry, this.coreMaterial);
    this.group.add(this.core);

    /* ================================================================
       3. POLVO CÓSMICO — disco grueso y tenue
       ================================================================ */
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const dustScale = new Float32Array(dustCount);
    const dustAngle = new Float32Array(dustCount);
    const dustRadius = new Float32Array(dustCount);
    const dustRandom = new Float32Array(dustCount);
    const dustColor = new THREE.Color(palette.dust);
    const outerColor = new THREE.Color(palette.outer);

    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const r = 1.5 + Math.pow(rng.random(), 1.4) * (R * 1.16);
      const angle = rng.random() * Math.PI * 2;
      const thickness = (2.0 - (r / R) * 1.5) * (0.4 + rng.random() * 0.6);
      const y = (rng.random() - 0.5) * thickness;

      dustPos[i3] = Math.cos(angle) * r;
      dustPos[i3 + 1] = y;
      dustPos[i3 + 2] = Math.sin(angle) * r;
      dustAngle[i] = angle;
      dustRadius[i] = r;
      dustRandom[i] = rng.random();

      cTmp.copy(dustColor).lerp(outerColor, Math.min(1, r / (R * 1.2)) * 0.45);
      const b = 0.35 + rng.random() * 0.4;
      dustCol[i3] = cTmp.r * b;
      dustCol[i3 + 1] = cTmp.g * b;
      dustCol[i3 + 2] = cTmp.b * b;
      dustScale[i] = 0.5 + rng.random() * 1.4;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
    dustGeometry.setAttribute('aScale', new THREE.BufferAttribute(dustScale, 1));
    dustGeometry.setAttribute('aAngle', new THREE.BufferAttribute(dustAngle, 1));
    dustGeometry.setAttribute('aRadius', new THREE.BufferAttribute(dustRadius, 1));
    dustGeometry.setAttribute('aRandom', new THREE.BufferAttribute(dustRandom, 1));

    this.dustMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uRotation: { value: this.params.rotation },
        uPointSize: { value: baseSize * 1.1 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: this.params.glow * 0.6 },
        uPointer: { value: this.pointer },
        uPointerActive: { value: 0 },
        uPointerRadius: { value: this.pointerConfig.radius },
        uPointerStrength: { value: this.pointerConfig.strength },
        uPointerMode: { value: this.pointerConfig.mode }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uRotation;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        ${POINTER_UNIFORMS}
        ${POINTER_FUNCTION}

        void main() {
          vColor = color;
          float orbit = uTime * uSpeed * uRotation * 0.055 / (0.5 + aRadius * 0.16);
          float angle = aAngle + orbit;

          vec3 pos = vec3(cos(angle) * aRadius, position.y, sin(angle) * aRadius);
          pos = applyPointer(pos, uTime, 1.6);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;

          gl_PointSize = min(uPointSize * aScale * (300.0 / max(vDist, 1.0)) * uPixelRatio, 20.0 * uPixelRatio);
          vAlpha = 0.18 + 0.2 * sin(uTime * 0.7 + aRandom * 12.0) + 0.1;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uGlow;
        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float soft = pow(smoothstep(0.5, 0.0, d), 2.6);
          float atten = 1.0 / (1.0 + vDist * 0.014);
          gl_FragColor = vec4(vColor * uGlow * atten, soft * vAlpha * 0.5);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.dust = new THREE.Points(dustGeometry, this.dustMaterial);
    this.group.add(this.dust);

    /* ================================================================
       4. NEBULOSAS — nubes grandes y suaves sobre los brazos
       ================================================================ */
    const clouds = 7;
    const perCloud = Math.max(8, Math.floor(nebulaCount / clouds) || 20);
    const nebulaColors = palette.nebula.map((c) => new THREE.Color(c));
    const nebTotal = clouds * perCloud;

    const nebPos = new Float32Array(nebTotal * 3);
    const nebCol = new Float32Array(nebTotal * 3);
    const nebScale = new Float32Array(nebTotal);
    const nebRandom = new Float32Array(nebTotal);

    let idx = 0;
    for (let c = 0; c < clouds; c++) {
      const arm = c % arms;
      const r = R * (0.32 + (c / clouds) * 0.72);
      const angle = (arm / arms) * Math.PI * 2 + Math.log(1 + r * 0.55) * twist;
      const cx = Math.cos(angle) * r;
      const cz = Math.sin(angle) * r;
      const cy = (rng.random() - 0.5) * 1.4;
      const spread = 2.4 + rng.random() * 3.6;
      const color = nebulaColors[c % nebulaColors.length];

      for (let p = 0; p < perCloud; p++) {
        const i3 = idx * 3;
        const gx = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;
        const gy = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;
        const gz = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;

        nebPos[i3] = cx + gx * spread;
        nebPos[i3 + 1] = cy + gy * spread * 0.7;
        nebPos[i3 + 2] = cz + gz * spread;

        const b = 0.6 + rng.random() * 0.5;
        nebCol[i3] = color.r * b;
        nebCol[i3 + 1] = color.g * b;
        nebCol[i3 + 2] = color.b * b;

        nebScale[idx] = 90 + rng.random() * 150;
        nebRandom[idx] = rng.random();
        idx++;
      }
    }

    const nebGeometry = new THREE.BufferGeometry();
    nebGeometry.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
    nebGeometry.setAttribute('color', new THREE.BufferAttribute(nebCol, 3));
    nebGeometry.setAttribute('aScale', new THREE.BufferAttribute(nebScale, 1));
    nebGeometry.setAttribute('aRandom', new THREE.BufferAttribute(nebRandom, 1));

    this.nebulaMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: this.params.glow },
        uOpacity: { value: 0.075 }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aRandom;

        varying vec3 vColor;

        void main() {
          vColor = color;
          vec3 pos = position;
          pos.x += sin(uTime * 0.07 + aRandom * 6.28) * 0.6;
          pos.z += cos(uTime * 0.06 + aRandom * 6.28) * 0.6;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = min(aScale * uPixelRatio * (320.0 / max(-mvPosition.z, 1.0)), 420.0 * uPixelRatio);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uGlow;

        varying vec3 vColor;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float falloff = pow(smoothstep(0.5, 0.0, d), 2.6);
          gl_FragColor = vec4(vColor, falloff * uOpacity * uGlow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.nebula = new THREE.Points(nebGeometry, this.nebulaMaterial);
    this.group.add(this.nebula);

    /* ================================================================
       5. HALO DEL DISCO GALÁCTICO — resplandor difuso en el plano
       ================================================================ */
    const diskGeometry = new THREE.PlaneGeometry(R * 3.4, R * 3.4, 1, 1);
    this.diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorInner: { value: new THREE.Color(palette.inner) },
        uColorMid: { value: new THREE.Color(palette.mid) },
        uOuter: { value: new THREE.Color(palette.outer) },
        uGlow: { value: this.params.glow },
        uRadius: { value: R }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColorInner;
        uniform vec3 uColorMid;
        uniform vec3 uColorOuter;
        uniform float uGlow;
        uniform float uRadius;

        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p) * uRadius * 1.7 / max(uRadius, 0.001);
          if (d > 1.0) discard;

          float core = smoothstep(1.0, 0.0, d);
          float mid = pow(core, 2.2);

          vec3 col = mix(uColorOuter, uColorMid, mid);
          col = mix(col, uColorInner, pow(core, 5.0));

          float alpha = core * core * 0.32 * uGlow;
          gl_FragColor = vec4(col * alpha * 3.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.diskGlow = new THREE.Mesh(diskGeometry, this.diskMaterial);
    this.diskGlow.rotation.x = -Math.PI / 2;
    this.diskGlow.renderOrder = -1;
    this.group.add(this.diskGlow);

    /* ================================================================
       6. CINTURÓN DE ASTEROIDES — malla instanciada + iluminación real
       ================================================================ */
    const rockGeometry = new THREE.IcosahedronGeometry(1, 0);
    this.asteroidMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.rock),
      roughness: 0.92,
      metalness: 0.08,
      flatShading: true
    });

    this.asteroids = new THREE.InstancedMesh(rockGeometry, this.asteroidMaterial, asteroidCount);
    this.asteroids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.asteroidData = [];

    const dummy = new THREE.Object3D();
    const beltInner = R * 1.28;
    const beltOuter = R * 1.72;
    const beltTilt = 0.14;

    for (let i = 0; i < asteroidCount; i++) {
      const r = beltInner + rng.random() * (beltOuter - beltInner);
      const angle = rng.random() * Math.PI * 2;
      const speed = 0.55 / Math.sqrt(r);
      const size = 0.06 + Math.pow(rng.random(), 2.6) * 0.42;
      const spinAxis = new THREE.Vector3(rng.random() - 0.5, rng.random() - 0.5, rng.random() - 0.5).normalize();
      const spinSpeed = (rng.random() - 0.5) * 1.6;
      const inclination = (rng.random() - 0.5) * beltTilt * 2;

      this.asteroidData.push({
        r, angle, speed, size, spinAxis, spinSpeed, inclination,
        y: (rng.random() - 0.5) * 1.6,
        spinPhase: rng.random() * Math.PI * 2
      });

      dummy.position.set(Math.cos(angle) * r, this.asteroidData[i].y, Math.sin(angle) * r);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      this.asteroids.setMatrixAt(i, dummy.matrix);
    }
    this.asteroids.instanceMatrix.needsUpdate = true;
    this.group.add(this.asteroids);

    /* --------- Luces del universo (iluminan los asteroides) --------- */
    const ambient = new THREE.AmbientLight(new THREE.Color(palette.inner), 0.75);
    const coreLight = new THREE.PointLight(new THREE.Color(palette.core), 2.6, 220, 2);
    coreLight.position.set(0, 0, 0);
    const rim = new THREE.DirectionalLight(new THREE.Color(palette.outer), 0.6);
    rim.position.set(-1, 0.6, -1);
    this.lights = [ambient, coreLight, rim];
    this.lights.forEach((l) => this.group.add(l));

    /* ================================================================
       7. ANILLOS ORBITALES — órbitas trazadas sobre el cinturón
       ================================================================ */
    const ringMaterial = (opacity) =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.orbit),
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

    [beltInner + 1.6, (beltInner + beltOuter) / 2, beltOuter - 1.2].forEach((ringRadius, i) => {
      const segments = 200;
      const points = [];
      for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(a) * ringRadius, 0, Math.sin(a) * ringRadius));
      }
      const ringGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const ring = new THREE.Line(ringGeometry, ringMaterial(0.13 + i * 0.035));
      ring.rotation.x = -Math.PI / 2 + (i - 1) * 0.05;
      ring.rotation.y = (i - 1) * 0.04;
      this.orbitRings.push(ring);
      this.group.add(ring);
    });

    this.scene.add(this.group);
  }

  /* ------------------------------------------------------------------ */
  /* API común a todos los universos                                     */
  /* ------------------------------------------------------------------ */

  setParams(partial) {
    Object.assign(this.params, partial);
    if (!this.material) return;

    const u = this.material.uniforms;
    if (partial.speed !== undefined) {
      u.uSpeed.value = this.params.speed;
      this.coreMaterial.uniforms.uSpeed.value = this.params.speed * 1.4;
      this.dustMaterial.uniforms.uSpeed.value = this.params.speed;
    }
    if (partial.glow !== undefined) {
      u.uGlow.value = this.params.glow;
      this.coreMaterial.uniforms.uGlow.value = this.params.glow * 1.35;
      this.dustMaterial.uniforms.uGlow.value = this.params.glow * 0.6;
      this.nebulaMaterial.uniforms.uGlow.value = this.params.glow;
      this.diskMaterial.uniforms.uGlow.value = this.params.glow;
    }
    if (partial.rotation !== undefined) {
      u.uRotation.value = this.params.rotation;
      this.dustMaterial.uniforms.uRotation.value = this.params.rotation;
    }
  }

  setDensity(fraction) {
    const base = this.qualitySettings.maxParticles || 24000;
    this.params.particleCount = Math.max(2000, Math.floor(base * fraction));
    this._build();
  }

  setPalette(paletteIndex) {
    if (paletteIndex === this.paletteIndex) return;
    this.paletteIndex = paletteIndex;
    this._build();
  }

  setPointer(point, active = true) {
    this.pointerActive = !!active && !!point;
    if (point) this.pointer.copy(point);
    this._applyPointerUniforms();
  }

  setPointerConfig(config = {}) {
    if (config.mode !== undefined) this.pointerConfig.mode = POINTER_MODES[config.mode] ?? config.mode;
    if (config.radius !== undefined) this.pointerConfig.radius = config.radius;
    if (config.strength !== undefined) this.pointerConfig.strength = config.strength;
    this._applyPointerUniforms();
  }

  _applyPointerUniforms() {
    const materials = [this.material, this.coreMaterial, this.dustMaterial];
    for (const m of materials) {
      if (!m) continue;
      m.uniforms.uPointer.value.copy(this.pointer);
      m.uniforms.uPointerActive.value = this.pointerActive ? 1 : 0;
      m.uniforms.uPointerRadius.value = this.pointerConfig.radius;
      m.uniforms.uPointerStrength.value = this.pointerConfig.strength;
      m.uniforms.uPointerMode.value = this.pointerConfig.mode;
    }
  }

  getParticleCount() {
    return this.count;
  }

  /* ------------------------------------------------------------------ */
  update(delta, elapsedTime) {
    if (this.material) this.material.uniforms.uTime.value = elapsedTime;
    if (this.coreMaterial) this.coreMaterial.uniforms.uTime.value = elapsedTime;
    if (this.dustMaterial) this.dustMaterial.uniforms.uTime.value = elapsedTime;
    if (this.nebulaMaterial) this.nebulaMaterial.uniforms.uTime.value = elapsedTime;

    if (this.group) {
      this.group.rotation.y = Math.sin(elapsedTime * 0.01) * 0.04 * (this.params.rotation || 1);
    }

    // Cinturón de asteroides: órbitas + giro sobre su eje
    if (this.asteroids && this.asteroidData.length) {
      const dummy = this._asteroidDummy || (this._asteroidDummy = new THREE.Object3D());

      for (let i = 0; i < this.asteroidData.length; i++) {
        const a = this.asteroidData[i];
        a.angle += delta * a.speed * (this.params.speed || 1);
        const x = Math.cos(a.angle) * a.r;
        const z = Math.sin(a.angle) * a.r;
        const y = a.y + Math.sin(a.angle + a.spinPhase) * a.inclination;

        dummy.position.set(x, y, z);
        dummy.quaternion.setFromAxisAngle(a.spinAxis, elapsedTime * a.spinSpeed + a.spinPhase);
        dummy.scale.setScalar(a.size);
        dummy.updateMatrix();
        this.asteroids.setMatrixAt(i, dummy.matrix);
      }
      this.asteroids.instanceMatrix.needsUpdate = true;
      this.asteroids.rotation.y += delta * 0.004 * (this.params.rotation || 1);
    }
  }

  destroy() {
    const disposeMaterial = (m) => {
      if (!m) return;
      m.dispose();
    };

    if (this.group) {
      this.scene.remove(this.group);

      const disposables = [this.galaxy, this.core, this.dust, this.nebula, this.diskGlow];
      for (const obj of disposables) {
        if (!obj) continue;
        if (obj.geometry) obj.geometry.dispose();
        disposeMaterial(obj.material);
      }

      if (this.asteroids) {
        this.asteroids.geometry.dispose();
        if (this.asteroidMaterial) this.asteroidMaterial.dispose();
        this.asteroids.dispose?.();
      }

      for (const ring of this.orbitRings) {
        ring.geometry.dispose();
        if (ring.material) ring.material.dispose();
      }

      for (const light of this.lights) {
        light.dispose?.();
      }
    }

    this.group = null;
    this.galaxy = null;
    this.core = null;
    this.dust = null;
    this.nebula = null;
    this.diskGlow = null;
    this.asteroids = null;
    this.asteroidMaterial = null;
    this.asteroidData = [];
    this.orbitRings = [];
    this.lights = [];
    this.material = null;
    this.coreMaterial = null;
    this.dustMaterial = null;
    this.nebulaMaterial = null;
    this.diskMaterial = null;
  }
}
