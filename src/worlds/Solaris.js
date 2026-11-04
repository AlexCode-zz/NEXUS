import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';
import { PALETTES } from '../utils/Palettes.js';
import { POINTER_UNIFORMS, POINTER_FUNCTION } from '../shaders/PointerGLSL.js';

/**
 * SOLARIS — Océano de energía fluidica.
 *
 * Rejilla de partículas cuyas alturas se calculan en el vertex shader
 * superponiendo varias ondas sinusoidales. Incluye:
 *  - Múltiples ondas superpuestas (movimiento fluido y orgánico).
 *  - Partículas ascendentes ("brasas") que dan profundidad.
 *  - Interacción del cursor sobre el campo.
 *  - Colores controlados por la paleta activa.
 */
const POINTER_MODES = { attraction: 0, repulsion: 1, turbulence: 2, gravity: 3, orbit: 4 };

export class Solaris {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.name = 'solaris';

    this.group = null;
    this.material = null;
    this.emberMaterial = null;
    this.waves = null;
    this.embers = null;
    this.count = 0;
    this.paletteIndex = 0;

    this.pointer = new THREE.Vector3(0, 0, 0);
    this.pointerActive = false;
    this.pointerConfig = { mode: 0, radius: 6, strength: 2.2 };

    const gridSize = qualitySettings.maxParticles ? Math.floor(Math.sqrt(qualitySettings.maxParticles)) : 100;

    this.params = {
      gridSize: Math.min(gridSize, 120),
      spacing: 0.34,
      waveSpeed: 1.5,
      waveHeight: 1.1,
      speed: 1.0,
      glow: 1.4,
      rotation: 0.8,
      turbulence: 0.0
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    if (params.palette !== undefined) this.paletteIndex = params.palette;
    this._build();
  }

  _build() {
    this.destroy();

    const rng = new SeededRandom(this.seed);
    const palette = PALETTES[this.paletteIndex];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const baseSize = (this.qualitySettings.particleSize || 1.0) * 0.36;

    const gridSize = Math.max(8, Math.floor(this.params.gridSize));
    const count = gridSize * gridSize;
    const half = (gridSize * this.params.spacing) / 2;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);
    const cLow = new THREE.Color(palette.outer);
    const cHigh = new THREE.Color(palette.inner);
    const cCore = new THREE.Color(palette.core);
    const tmp = new THREE.Color();

    let index = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const i3 = index * 3;
        const px = x * this.params.spacing - half;
        const pz = z * this.params.spacing - half;

        positions[i3] = px;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = pz;

        const d = Math.sqrt(px * px + pz * pz) / half;
        tmp.copy(cLow).lerp(cHigh, Math.min(1, d));
        tmp.lerp(cCore, Math.max(0, 1 - d) * 0.55);
        const b = 0.55 + rng.random() * 0.45;
        colors[i3] = tmp.r * b;
        colors[i3 + 1] = tmp.g * b;
        colors[i3 + 2] = tmp.b * b;

        scales[index] = 0.55 + rng.random() * 0.9;
        randoms[index] = rng.random();
        index++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveSpeed: { value: this.params.waveSpeed },
        uWaveHeight: { value: this.params.waveHeight },
        uTurbulence: { value: this.params.turbulence },
        uSpeed: { value: this.params.speed },
        uGlow: { value: this.params.glow },
        uPointSize: { value: baseSize },
        uPixelRatio: { value: pixelRatio },
        uPointer: { value: this.pointer },
        uPointerActive: { value: 0 },
        uPointerRadius: { value: this.pointerConfig.radius },
        uPointerStrength: { value: this.pointerConfig.strength },
        uPointerMode: { value: this.pointerConfig.mode }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWaveSpeed;
        uniform float uWaveHeight;
        uniform float uTurbulence;
        uniform float uSpeed;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vHeight;
        varying float vDist;
        varying float vAlpha;

        ${POINTER_UNIFORMS}
        ${POINTER_FUNCTION}

        void main() {
          vColor = color;

          float t = uTime * uWaveSpeed * uSpeed;
          vec3 pos = position;

          // Ondas superpuestas: movimiento fluido
          float wave1 = sin(pos.x * 0.42 + t) * uWaveHeight;
          float wave2 = cos(pos.z * 0.34 + t * 0.85) * uWaveHeight * 0.85;
          float radial = length(pos.xz) * 0.4 - t * 1.2;
          float wave3 = sin(radial) * uWaveHeight * 0.6;
          float wave4 = sin(pos.x * 0.9 + pos.z * 0.7 + t * 1.6) * uWaveHeight * 0.25;

          pos.y = wave1 + wave2 + wave3 + wave4;

          // Turbulencia: ruido procedural suave
          if (uTurbulence > 0.001) {
            pos.y += sin(t * 2.1 + aRandom * 40.0) * uTurbulence * 0.6;
            pos.x += cos(t * 1.7 + aRandom * 40.0) * uTurbulence * 0.18;
            pos.z += sin(t * 1.5 + aRandom * 40.0) * uTurbulence * 0.18;
          }

          pos = applyPointer(pos, uTime, 1.0);

          vHeight = pos.y;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;

          gl_PointSize = min(uPointSize * aScale * (300.0 / max(vDist, 1.0)) * uPixelRatio, 20.0 * uPixelRatio);
          vAlpha = 0.55 + 0.45 * sin(uTime * 1.4 + aRandom * 12.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uGlow;

        varying vec3 vColor;
        varying float vHeight;
        varying float vDist;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;

          float core = smoothstep(0.5, 0.0, d);
          float soft = pow(core, 2.4);

          // Las crestas brillan más
          float crest = smoothstep(-1.4, 2.0, vHeight) * 0.7 + 0.35;
          float atten = 1.0 / (1.0 + vDist * 0.02);

          vec3 col = vColor * crest * (0.4 + soft * 1.5) * uGlow * atten;
          gl_FragColor = vec4(col, core * vAlpha * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.waves = new THREE.Points(geometry, this.material);

    /* ---------------- Brasas ascendentes (profundidad) ---------------- */
    const emberCount = Math.max(120, Math.floor(count * 0.04));
    const emberPos = new Float32Array(emberCount * 3);
    const emberColors = new Float32Array(emberCount * 3);
    const emberScales = new Float32Array(emberCount);
    const emberSeeds = new Float32Array(emberCount);
    const emberColor = new THREE.Color(palette.core);

    for (let i = 0; i < emberCount; i++) {
      const i3 = i * 3;
      emberPos[i3] = (rng.random() - 0.5) * half * 2.1;
      emberPos[i3 + 1] = rng.random() * 9;
      emberPos[i3 + 2] = (rng.random() - 0.5) * half * 2.1;
      const b = 0.4 + rng.random() * 0.6;
      emberColors[i3] = emberColor.r * b;
      emberColors[i3 + 1] = emberColor.g * b;
      emberColors[i3 + 2] = emberColor.b * b;
      emberScales[i] = 0.4 + rng.random() * 1.1;
      emberSeeds[i] = rng.random();
    }

    const emberGeometry = new THREE.BufferGeometry();
    emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    emberGeometry.setAttribute('color', new THREE.BufferAttribute(emberColors, 3));
    emberGeometry.setAttribute('aScale', new THREE.BufferAttribute(emberScales, 1));
    emberGeometry.setAttribute('aRandom', new THREE.BufferAttribute(emberSeeds, 1));

    this.emberMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uPointSize: { value: baseSize * 0.8 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: this.params.glow }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y = mod(pos.y + uTime * uSpeed * (0.6 + aRandom * 0.9), 11.0);
          pos.x += sin(uTime * 0.7 + aRandom * 6.28) * 0.4;
          pos.z += cos(uTime * 0.55 + aRandom * 6.28) * 0.4;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = uPointSize * aScale * (320.0 / max(-mvPosition.z, 1.0)) * uPixelRatio;

          // Desvanecido al nacer y al morir
          float life = smoothstep(0.0, 1.2, pos.y) * (1.0 - smoothstep(8.5, 11.0, pos.y));
          vAlpha = life;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uGlow;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float soft = pow(core, 2.2);
          gl_FragColor = vec4(vColor * uGlow * (0.3 + soft * 1.4), core * vAlpha * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.embers = new THREE.Points(emberGeometry, this.emberMaterial);

    this.group = new THREE.Group();
    this.group.add(this.waves);
    this.group.add(this.embers);

    // Luz ambiental (identidad del universo)
    const ambient = new THREE.AmbientLight(new THREE.Color(palette.inner), 1.0);
    this.group.add(ambient);

    this.scene.add(this.group);
    this.count = count + emberCount;
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    if (!this.material) return;
    if (partial.waveSpeed !== undefined) this.material.uniforms.uWaveSpeed.value = this.params.waveSpeed;
    if (partial.waveHeight !== undefined) this.material.uniforms.uWaveHeight.value = this.params.waveHeight;
    if (partial.turbulence !== undefined) this.material.uniforms.uTurbulence.value = this.params.turbulence;
    if (partial.speed !== undefined) {
      this.material.uniforms.uSpeed.value = this.params.speed;
      this.emberMaterial.uniforms.uSpeed.value = this.params.speed;
    }
    if (partial.glow !== undefined) {
      this.material.uniforms.uGlow.value = this.params.glow;
      this.emberMaterial.uniforms.uGlow.value = this.params.glow;
    }
  }

  setDensity(fraction) {
    const base = this.qualitySettings.maxParticles || 10000;
    const gridSize = Math.max(8, Math.floor(Math.sqrt(base) * fraction));
    // Mismo límite que el constructor: etiqueta y resultado coinciden
    this.params.gridSize = Math.min(gridSize, 120);
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
    if (!this.material) return;
    const u = this.material.uniforms;
    u.uPointer.value.copy(this.pointer);
    u.uPointerActive.value = this.pointerActive ? 1 : 0;
    u.uPointerRadius.value = this.pointerConfig.radius;
    u.uPointerStrength.value = this.pointerConfig.strength;
    u.uPointerMode.value = this.pointerConfig.mode;
  }

  getParticleCount() {
    return this.count;
  }

  update(delta, elapsedTime) {
    if (this.material) this.material.uniforms.uTime.value = elapsedTime;
    if (this.emberMaterial) this.emberMaterial.uniforms.uTime.value = elapsedTime;
    if (this.group) {
      this.group.rotation.y = Math.sin(elapsedTime * 0.006) * 0.06 * (this.params.rotation || 1);
    }
  }

  destroy() {
    if (this.group) {
      this.scene.remove(this.group);
      if (this.waves) {
        this.waves.geometry.dispose();
        if (this.material) this.material.dispose();
      }
      if (this.embers) {
        this.embers.geometry.dispose();
        if (this.emberMaterial) this.emberMaterial.dispose();
      }
    }
    this.group = null;
    this.waves = null;
    this.embers = null;
    this.material = null;
    this.emberMaterial = null;
  }
}
