import * as THREE from 'three';

/**
 * SOLARIS — Campo de partículas con ondas fluidas y tonalidades doradas.
 *
 * Rejilla de partículas cuyas alturas se calculan en el vertex shader
 * superponiendo varias ondas sinusoidales, creando un océano de energía
 * que se mueve de forma fluida y orgánica.
 */
export class Solaris {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.count = 0;

    const gridSize = qualitySettings.maxParticles ? Math.floor(Math.sqrt(qualitySettings.maxParticles)) : 100;

    this.params = {
      gridSize: Math.min(gridSize, 120),
      spacing: 0.22,
      waveSpeed: 1.5,
      waveHeight: 1.2,
      speed: 1.0,
      glow: 1.4,
      rotation: 0.8,
      goldColor: 0xffaa00,
      amberColor: 0xff4400
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);
    this._build();
  }

  _build() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }

    const gridSize = Math.max(8, Math.floor(this.params.gridSize));
    const count = gridSize * gridSize;
    this.count = count;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const colorGold = new THREE.Color(this.params.goldColor);
    const colorAmber = new THREE.Color(this.params.amberColor);

    const halfGrid = (gridSize * this.params.spacing) / 2;

    let index = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const i3 = index * 3;
        const posX = x * this.params.spacing - halfGrid;
        const posZ = z * this.params.spacing - halfGrid;

        positions[i3] = posX;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = posZ;

        const mixRatio = (x + z) / (gridSize * 2);
        const c = colorGold.clone().lerp(colorAmber, mixRatio);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        scales[index] = Math.random() * 0.7 + 0.5;
        index++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const baseSize = (this.qualitySettings.particleSize || 1.0) * 2.2;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveSpeed: { value: this.params.waveSpeed },
        uWaveHeight: { value: this.params.waveHeight },
        uGlow: { value: this.params.glow },
        uPointSize: { value: baseSize },
        uPixelRatio: { value: pixelRatio }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveSpeed;
        uniform float uWaveHeight;
        uniform float uPointSize;
        uniform float uPixelRatio;
        attribute vec3 color;
        attribute float aScale;
        varying vec3 vColor;
        varying float vHeight;
        varying float vDist;
        void main() {
          vColor = color;
          vec3 pos = position;
          // Múltiples ondas superpuestas para movimiento fluido
          float wave1 = sin(pos.x * 0.6 + uTime * uWaveSpeed) * uWaveHeight;
          float wave2 = cos(pos.z * 0.45 + uTime * uWaveSpeed * 0.9) * uWaveHeight * 0.8;
          float wave3 = sin(length(pos.xz) * 0.5 - uTime * uWaveSpeed * 1.1) * uWaveHeight * 0.5;
          pos.y = wave1 + wave2 + wave3;
          vHeight = pos.y;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;
          gl_PointSize = uPointSize * aScale * (200.0 / vDist) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vHeight;
        varying float vDist;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.08, dist);
          // Las crestas de la onda brillan más
          float glow = smoothstep(-1.2, 1.6, vHeight) * 0.6 + 0.4;
          float intensity = 1.0 / (1.0 + vDist * 0.06);
          gl_FragColor = vec4(vColor * glow * uGlow * intensity, alpha * 0.9);
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
      if (partial.waveSpeed !== undefined) this.material.uniforms.uWaveSpeed.value = this.params.waveSpeed;
      if (partial.waveHeight !== undefined) this.material.uniforms.uWaveHeight.value = this.params.waveHeight;
      if (partial.glow !== undefined) this.material.uniforms.uGlow.value = this.params.glow;
    }
  }

  setDensity(fraction) {
    const base = this.qualitySettings.maxParticles || 10000;
    const gridSize = Math.max(8, Math.floor(Math.sqrt(base) * fraction));
    this.params.gridSize = Math.min(gridSize, 140);
    this._build();
  }

  getParticleCount() {
    return this.count;
  }

  update(delta, elapsedTime) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsedTime;
    }
    if (this.mesh) {
      this.mesh.rotation.y = elapsedTime * 0.035 * this.params.rotation;
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
