import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';
import { PALETTES } from '../utils/Palettes.js';

/**
 * BACKGROUND — Profundidad espacial del universo NEXUS.
 *
 * Genera proceduralmente:
 *  - Un campo de estrellas lejanas con titileo (twinkle) en el shader.
 *  - Nebulosas de gran tamaño con desvanecido suave, tintadas según la
 *    paleta activa.
 *
 * Es independiente de los universos: se añade una sola vez a la escena y
 * sobrevive al cambio de mundo, dando la sensación de espacio profundo.
 */
export class Background {
  constructor(scene, qualitySettings, seed = 9781) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.group = null;
    this.stars = null;
    this.nebula = null;
    this.starMaterial = null;
    this.nebulaMaterial = null;
    this.paletteIndex = 0;
  }

  build() {
    this.destroy();

    const quality = this.qualitySettings.qualityLevel || 'high';
    const starCount = quality === 'low' ? 1600 : quality === 'medium' ? 3200 : 5200;
    const rng = new SeededRandom(this.seed);
    const palette = PALETTES[this.paletteIndex];

    this.group = new THREE.Group();
    this.group.renderOrder = -2;

    /* ---------------- Estrellas lejanas ---------------- */
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starScale = new Float32Array(starCount);
    const starRandom = new Float32Array(starCount);

    const tint = [new THREE.Color(0xffffff), new THREE.Color(palette.inner), new THREE.Color(palette.mid), new THREE.Color(0xdbe7ff)];
    const tmpColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      // Distribución esférica uniforme
      const u = rng.random() * 2 - 1;
      const phi = rng.random() * Math.PI * 2;
      const radius = 340 + rng.random() * 260;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      starPos[i3] = Math.cos(phi) * s * radius;
      starPos[i3 + 1] = u * radius;
      starPos[i3 + 2] = Math.sin(phi) * s * radius;

      tmpColor.copy(tint[Math.floor(rng.random() * tint.length)]);
      const b = 0.45 + rng.random() * 0.55;
      starCol[i3] = tmpColor.r * b;
      starCol[i3 + 1] = tmpColor.g * b;
      starCol[i3 + 2] = tmpColor.b * b;

      starScale[i] = 0.35 + Math.pow(rng.random(), 2.4) * 2.6;
      starRandom[i] = rng.random();
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    starGeometry.setAttribute('aScale', new THREE.BufferAttribute(starScale, 1));
    starGeometry.setAttribute('aRandom', new THREE.BufferAttribute(starRandom, 1));

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    this.starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPointSize: { value: 1.5 },
        uPixelRatio: { value: pixelRatio },
        uGlow: { value: 1.0 }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPointSize;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float dist = -mvPosition.z;
          gl_PointSize = uPointSize * aScale * uPixelRatio * (140.0 / max(dist, 1.0));

          // Titileo suave e independiente por estrella
          float twinkle = 0.62 + 0.38 * sin(uTime * (0.7 + aRandom * 2.2) + aRandom * 40.0);
          vAlpha = twinkle;
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
          float alpha = smoothstep(0.5, 0.0, d);
          alpha = pow(alpha, 1.6) * vAlpha * uGlow;
          gl_FragColor = vec4(vColor * (0.6 + alpha * 0.8), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(starGeometry, this.starMaterial);
    this.stars.renderOrder = -2;
    this.group.add(this.stars);

    /* ---------------- Nebulosas de fondo ---------------- */
    const clouds = quality === 'low' ? 8 : quality === 'medium' ? 14 : 22;
    const perCloud = quality === 'low' ? 40 : 90;
    const total = clouds * perCloud;

    const nebPos = new Float32Array(total * 3);
    const nebCol = new Float32Array(total * 3);
    const nebScale = new Float32Array(total);
    const nebRandom = new Float32Array(total);

    const cloudColors = palette.nebula.map((c) => new THREE.Color(c));
    let idx = 0;
    for (let c = 0; c < clouds; c++) {
      const u = rng.random() * 1.6 - 0.8;
      const phi = rng.random() * Math.PI * 2;
      const cloudRadius = 300 + rng.random() * 220;
      const s = Math.sqrt(Math.max(0, 1 - u * u));
      const cx = Math.cos(phi) * s * cloudRadius;
      const cy = u * cloudRadius;
      const cz = Math.sin(phi) * s * cloudRadius;
      const spread = 90 + rng.random() * 130;
      const color = cloudColors[c % cloudColors.length];

      for (let p = 0; p < perCloud; p++) {
        const i3 = idx * 3;
        // Dispersión gaussiana aproximada dentro de la nube
        const gx = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;
        const gy = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;
        const gz = (rng.random() + rng.random() + rng.random() - 1.5) / 1.5;
        nebPos[i3] = cx + gx * spread;
        nebPos[i3 + 1] = cy + gy * spread * 0.6;
        nebPos[i3 + 2] = cz + gz * spread;

        const b = 0.5 + rng.random() * 0.5;
        nebCol[i3] = color.r * b;
        nebCol[i3 + 1] = color.g * b;
        nebCol[i3 + 2] = color.b * b;

        nebScale[idx] = 120 + rng.random() * 190;
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
        uGlow: { value: 1.0 },
        uOpacity: { value: 0.085 }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uPixelRatio;

        attribute vec3 color;
        attribute float aScale;
        attribute float aRandom;

        varying vec3 vColor;
        varying float vScale;

        void main() {
          vColor = color;
          vScale = aScale;
          vec3 pos = position;
          pos.x += sin(uTime * 0.05 + aRandom * 6.28) * 4.0;
          pos.y += cos(uTime * 0.045 + aRandom * 6.28) * 4.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aScale * uPixelRatio * (300.0 / max(-mvPosition.z, 1.0));
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
          float falloff = smoothstep(0.5, 0.0, d);
          falloff = pow(falloff, 2.4);
          float alpha = falloff * uOpacity * uGlow;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.nebula = new THREE.Points(nebGeometry, this.nebulaMaterial);
    this.nebula.renderOrder = -1;
    this.group.add(this.nebula);

    this.scene.add(this.group);
  }

  setPalette(paletteIndex) {
    this.paletteIndex = paletteIndex;
    // Reconstruir es barato (son pocos puntos) y refresca los tintes
    this.build();
  }

  update(delta, elapsedTime) {
    if (this.starMaterial) this.starMaterial.uniforms.uTime.value = elapsedTime;
    if (this.nebulaMaterial) this.nebulaMaterial.uniforms.uTime.value = elapsedTime;
    if (this.group) {
      this.group.rotation.y = elapsedTime * 0.0035;
    }
  }

  destroy() {
    if (this.group) {
      this.scene.remove(this.group);
      if (this.stars) {
        this.stars.geometry.dispose();
        this.stars.material.dispose();
      }
      if (this.nebula) {
        this.nebula.geometry.dispose();
        this.nebula.material.dispose();
      }
    }
    this.group = null;
    this.stars = null;
    this.nebula = null;
    this.starMaterial = null;
    this.nebulaMaterial = null;
  }
}
