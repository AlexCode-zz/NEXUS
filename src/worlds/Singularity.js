import * as THREE from 'three';
import { PALETTES } from '../utils/Palettes.js';
import { POINTER_UNIFORMS, POINTER_FUNCTION } from '../shaders/PointerGLSL.js';

/**
 * SINGULARITY (VOID) — Agujero negro con disco de acreción.
 *
 *  - Núcleo negro (silueta) con horizonte de eventos.
 *  - Anillo de fotones brillante.
 *  - Disco de acreción orbital (3ª ley de Kepler en el shader).
 *  - Asimetría Doppler: un lado del disco es más brillante.
 *  - Resplandor difuso del disco.
 *  - Interacción del cursor: el disco se deforma alrededor del puntero.
 */
const POINTER_MODES = { attraction: 0, repulsion: 1, turbulence: 2, gravity: 3, orbit: 4 };

export class Singularity {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.name = 'singularity';

    this.group = null;
    this.material = null;
    this.diskMaterial = null;
    this.disk = null;
    this.core = null;
    this.photonRing = null;
    this.diskGlow = null;
    this.count = 0;
    this.paletteIndex = 0;

    this.pointer = new THREE.Vector3(0, 0, 0);
    this.pointerActive = false;
    this.pointerConfig = { mode: 3, radius: 6, strength: 2.0 };

    this.params = {
      particleCount: this.qualitySettings.maxParticles || 16000,
      eventHorizonRadius: 1.6,
      accretionDiskRadius: 12,
      speed: 1.6,
      attraction: 0.8,
      glow: 1.6,
      rotation: 1.2
    };

    this.baseCount = Math.floor(this.params.particleCount);
  }

  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    if (params.palette !== undefined) this.paletteIndex = params.palette;
    this._build();
  }

  _build() {
    this.destroy();

    const palette = PALETTES[this.paletteIndex];
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const baseSize = (this.qualitySettings.particleSize || 1.0) * 0.34;

    const eh = this.params.eventHorizonRadius;
    const ar = this.params.accretionDiskRadius;
    const count = Math.max(2000, Math.floor(this.params.particleCount));
    this.count = count;
    this.baseCount = count;

    this.group = new THREE.Group();
    this.group.rotation.x = -0.44; // inclinación para ver el disco

    /* ---------------- Disco de acreción ---------------- */
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const angles = new Float32Array(count);
    const distances = new Float32Array(count);
    const randoms = new Float32Array(count);

    const cInner = new THREE.Color(palette.inner);
    const cOuter = new THREE.Color(palette.outer);
    const cHot = new THREE.Color(palette.core);
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Densidad mayor cerca del horizonte
      const d = eh + Math.pow(Math.random(), 2.6) * (ar - eh);
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * (0.28 * (1 - d / ar) + 0.05);

      positions[i3] = Math.cos(angle) * d;
      positions[i3 + 1] = y;
      positions[i3 + 2] = Math.sin(angle) * d;

      angles[i] = angle;
      distances[i] = d;
      randoms[i] = Math.random();

      const t = (d - eh) / (ar - eh);
      tmp.copy(cInner).lerp(cOuter, t);
      tmp.lerp(cHot, Math.max(0, 1 - t) * 0.75);
      const b = 0.45 + Math.random() * 0.75;
      colors[i3] = tmp.r * b;
      colors[i3 + 1] = tmp.g * b;
      colors[i3 + 2] = tmp.b * b;

      scales[i] = (1.0 - t) * 1.5 + Math.pow(Math.random(), 2.2) * 0.9 + 0.3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uAttraction: { value: this.params.attraction },
        uGlow: { value: this.params.glow },
        uEventHorizon: { value: eh },
        uRadius: { value: ar },
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
        uniform float uSpeed;
        uniform float uAttraction;
        uniform float uEventHorizon;
        uniform float uRadius;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aDistance;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        ${POINTER_UNIFORMS}
        ${POINTER_FUNCTION}

        void main() {
          vColor = color;

          // 3ª ley de Kepler: interior más rápido
          float orbitSpeed = 26.0 / sqrt(aDistance + 0.6);
          float angle = aAngle + uTime * uSpeed * orbitSpeed * 0.06;

          // Atracción: la materia cae hacia el horizonte en espiral
          float fall = uTime * uSpeed * 0.035 * uAttraction / (0.4 + aDistance * 0.08);
          float r = aDistance - mod(fall + aRandom * 6.28, 6.2831) * 0.06;
          r = max(uEventHorizon * 1.05, r);

          vec3 pos = vec3(cos(angle) * r, position.y, sin(angle) * r);
          pos = applyPointer(pos, uTime, 1.0);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;

          gl_PointSize = min(uPointSize * aScale * (300.0 / max(vDist, 1.0)) * uPixelRatio, 22.0 * uPixelRatio);

          // Efecto Doppler: lado que se acerca más brillante
          vec3 viewDir = normalize(-mvPosition.xyz);
          float doppler = dot(normalize(vec3(-sin(angle), 0.0, cos(angle))), viewDir.xz);
          vAlpha = 0.5 + 0.5 * doppler * 1.6;
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
          float hot = pow(core, 3.2);
          float atten = 1.0 / (1.0 + vDist * 0.012);

          vec3 col = mix(vColor, vec3(1.0), hot * 0.35);
          col *= (0.35 + hot * 2.1) * uGlow * atten;

          gl_FragColor = vec4(col, core * clamp(vAlpha, 0.15, 1.0) * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.disk = new THREE.Points(geometry, this.material);
    this.group.add(this.disk);

    /* ---------------- Silueta del horizonte ---------------- */
    const coreGeometry = new THREE.SphereGeometry(eh, 32, 24);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.core = new THREE.Mesh(coreGeometry, coreMaterial);
    this.group.add(this.core);

    /* ---------------- Anillo de fotones ---------------- */
    const ringSegments = 240;
    const ringPoints = [];
    for (let s = 0; s <= ringSegments; s++) {
      const a = (s / ringSegments) * Math.PI * 2;
      ringPoints.push(new THREE.Vector3(Math.cos(a) * eh * 1.5, 0, Math.sin(a) * eh * 1.5));
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
    this.photonRing = new THREE.Line(
      ringGeometry,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(palette.core),
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.group.add(this.photonRing);

    /* ---------------- Resplandor del disco ---------------- */
    const glowGeometry = new THREE.PlaneGeometry(ar * 3.6, ar * 3.6, 1, 1);
    this.diskMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(palette.inner) },
        uColorOuter: { value: new THREE.Color(palette.outer) },
        uGlow: { value: this.params.glow },
        uRadius: { value: ar }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uColorOuter;
        uniform float uGlow;
        uniform float uRadius;

        varying vec2 vUv;

        void main() {
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p) * uRadius * 1.8 / max(uRadius, 0.001);
          if (d > 1.0) discard;

          float inner = smoothstep(1.0, 0.05, d);
          float band = exp(-pow((d - 0.22) * 4.2, 2.0));
          float hole = smoothstep(0.1, 0.22, d);

          vec3 col = mix(uColorOuter, uColor, inner);
          float alpha = (band * 0.55 + inner * 0.12) * hole * uGlow;
          gl_FragColor = vec4(col * alpha * 2.4, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.diskGlow = new THREE.Mesh(glowGeometry, this.diskMaterial);
    this.group.add(this.diskGlow);

    this.scene.add(this.group);
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    if (!this.material) return;
    if (partial.speed !== undefined) this.material.uniforms.uSpeed.value = this.params.speed;
    if (partial.attraction !== undefined) this.material.uniforms.uAttraction.value = this.params.attraction;
    if (partial.glow !== undefined) {
      this.material.uniforms.uGlow.value = this.params.glow;
      this.diskMaterial.uniforms.uGlow.value = this.params.glow;
    }
  }

  setDensity(fraction) {
    const base = this.qualitySettings.maxParticles || 16000;
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
    if (this.group) {
      this.group.rotation.y = elapsedTime * 0.02 * (this.params.rotation || 1);
      this.group.rotation.z = Math.sin(elapsedTime * 0.08) * 0.03;
    }
  }

  destroy() {
    if (this.group) {
      this.scene.remove(this.group);
      if (this.disk) {
        this.disk.geometry.dispose();
        if (this.material) this.material.dispose();
      }
      if (this.core) {
        this.core.geometry.dispose();
        if (this.core.material) this.core.material.dispose();
      }
      if (this.photonRing) {
        this.photonRing.geometry.dispose();
        if (this.photonRing.material) this.photonRing.material.dispose();
      }
      if (this.diskGlow) {
        this.diskGlow.geometry.dispose();
        if (this.diskMaterial) this.diskMaterial.dispose();
      }
    }
    this.group = null;
    this.disk = null;
    this.core = null;
    this.photonRing = null;
    this.diskGlow = null;
    this.material = null;
    this.diskMaterial = null;
  }
}
