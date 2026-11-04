import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * COSMOS — Galaxia espiral.
 *
 * Partículas distribuidas en brazos galácticos con profundidad tridimensional,
 * núcleo luminoso, colores que varían del centro hacia el borde, movimiento
 * orbital (las partículas interiores giran más rápido) y tamaño variable.
 * Toda la animación por partícula se resuelve en el vertex shader para
 * mantener un alto rendimiento con miles de partículas.
 */
export class Cosmos {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.count = 0;

    this.params = {
      particleCount: this.qualitySettings.maxParticles || 8000,
      arms: 4,
      radius: 16,
      speed: 1.0,
      glow: 1.2,
      rotation: 1.0,
      centerColor: 0xffffff,
      armColor: 0x00d2ff,
      outerColor: 0x7b2cbf
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    this._build();
  }

  _build() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }

    const count = Math.max(500, Math.floor(this.params.particleCount));
    this.count = count;

    const rng = new SeededRandom(this.seed);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const angles = new Float32Array(count);
    const radiusArr = new Float32Array(count);
    const armArr = new Float32Array(count);
    const heightArr = new Float32Array(count);

    const colorCenter = new THREE.Color(this.params.centerColor);
    const colorArm = new THREE.Color(this.params.armColor);
    const colorOuter = new THREE.Color(this.params.outerColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Radio con distribución cuadrática: más densidad cerca del núcleo
      const r = Math.pow(rng.random(), 2) * this.params.radius;
      const arm = i % this.params.arms;
      const armAngle = (arm / this.params.arms) * Math.PI * 2;
      const spin = r * this.params.rotation * 1.1;

      // Despliegue en 3D: altitud aleatoria leve para profundidad
      const height = (rng.random() - 0.5) * (1.2 + r * 0.06);

      const baseAngle = armAngle + spin;
      positions[i3] = Math.cos(baseAngle) * r;
      positions[i3 + 1] = height;
      positions[i3 + 2] = Math.sin(baseAngle) * r;

      angles[i] = baseAngle;
      radiusArr[i] = r;
      armArr[i] = arm;
      heightArr[i] = height;

      // Color: núcleo brillante → brazo cian → borde púrpura
      let mixed;
      if (r < this.params.radius * 0.25) {
        mixed = colorCenter.clone().lerp(colorArm, r / (this.params.radius * 0.25));
      } else {
        mixed = colorArm.clone().lerp(colorOuter, (r - this.params.radius * 0.25) / (this.params.radius * 0.75));
      }
      colors[i3] = mixed.r;
      colors[i3 + 1] = mixed.g;
      colors[i3 + 2] = mixed.b;

      // Tamaño variable: partículas más grandes cerca del núcleo
      scales[i] = (1.0 - r / this.params.radius) * 1.6 + rng.random() * 0.9 + 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute('aRadius', new THREE.BufferAttribute(radiusArr, 1));
    geometry.setAttribute('aArm', new THREE.BufferAttribute(armArr, 1));
    geometry.setAttribute('aHeight', new THREE.BufferAttribute(heightArr, 1));

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const baseSize = (this.qualitySettings.particleSize || 1.0) * 2.6;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uGlow: { value: this.params.glow },
        uPointSize: { value: baseSize },
        uPixelRatio: { value: pixelRatio }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uGlow;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aRadius;
        attribute float aArm;
        attribute float aHeight;

        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Movimiento orbital: más rápido cuanto más cerca del núcleo
          float orbit = uTime * uSpeed * 0.7 * (1.0 / (aRadius * 0.12 + 1.0));
          float angle = aAngle + orbit + aRadius * 0.14 * aArm;

          float ca = cos(angle);
          float sa = sin(angle);
          pos.xz = mat2(ca, -sa, sa, ca) * pos.xz;

          // Profundidad tridimensional: ondulación vertical suave
          pos.y += sin(uTime * 0.9 + aRadius * 0.45 + aArm * 1.7) * 0.18;
          pos.y += aHeight * 0.6;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDist = -mvPosition.z;
          gl_PointSize = uPointSize * aScale * (240.0 / vDist) * uPixelRatio;
          vAlpha = 1.0;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.04, dist) * vAlpha;
          float intensity = 1.0 / (1.0 + vDist * 0.05);
          gl_FragColor = vec4(vColor * intensity * uGlow, alpha * 0.95);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.scene.add(this.mesh);
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    if (this.material) {
      if (partial.speed !== undefined) this.material.uniforms.uSpeed.value = this.params.speed;
      if (partial.glow !== undefined) this.material.uniforms.uGlow.value = this.params.glow;
    }
  }

  setDensity(fraction) {
    const count = Math.max(500, Math.floor((this.qualitySettings.maxParticles || 8000) * fraction));
    this.params.particleCount = count;
    this._build();
  }

  getParticleCount() {
    return this.count;
  }

  update(delta, elapsedTime) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsedTime;
    }
    // Rotación global lenta de la galaxia
    if (this.mesh) {
      this.mesh.rotation.y = elapsedTime * 0.04 * this.params.rotation;
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.mesh = null;
    }
    this.material = null;
    this.geometry = null;
    this.count = 0;
  }
}
