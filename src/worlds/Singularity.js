import * as THREE from 'three';

/**
 * SINGULARITY (VOID) — Agujero negro con disco de acreción.
 *
 * Partículas que orbitan el centro (velocidad mayor cuanto más cerca,
 * 3ª Ley de Kepler) y son atraídas espiralmente hacia el horizonte de
 * eventos. Núcleo oscuro, brillo intenso en el interior y degradación
 * de color hacia el exterior.
 */
export class Singularity {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.count = 0;

    this.params = {
      particleCount: this.qualitySettings.maxParticles || 10000,
      eventHorizonRadius: 1.5,
      accretionDiskRadius: 11,
      speed: 1.6,
      attraction: 0.8,
      glow: 1.6,
      rotation: 1.2,
      coreColor: 0x000000,
      innerGlowColor: 0xff0055,
      diskColor: 0x7a00ff
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

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const angles = new Float32Array(count);
    const distances = new Float32Array(count);

    const colorInner = new THREE.Color(this.params.innerGlowColor);
    const colorDisk = new THREE.Color(this.params.diskColor);

    const eh = this.params.eventHorizonRadius;
    const ar = this.params.accretionDiskRadius;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const dist = eh + Math.pow(Math.random(), 2) * (ar - eh);
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.25;

      positions[i3] = Math.cos(angle) * dist;
      positions[i3 + 1] = tilt * (dist / ar);
      positions[i3 + 2] = Math.sin(angle) * dist;

      angles[i] = angle;
      distances[i] = dist;

      const mixRatio = (dist - eh) / (ar - eh);
      const c = colorInner.clone().lerp(colorDisk, mixRatio);
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      scales[i] = (1.0 - mixRatio) * 1.6 + 0.35;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));

    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    const baseSize = (this.qualitySettings.particleSize || 1.0) * 2.4;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: this.params.speed },
        uAttraction: { value: this.params.attraction },
        uGlow: { value: this.params.glow },
        uEventHorizon: { value: eh },
        uPointSize: { value: baseSize },
        uPixelRatio: { value: pixelRatio }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSpeed;
        uniform float uAttraction;
        uniform float uGlow;
        uniform float uEventHorizon;
        uniform float uPointSize;
        uniform float uPixelRatio;
        attribute vec3 color;
        attribute float aScale;
        attribute float aAngle;
        attribute float aDistance;
        varying vec3 vColor;
        varying float vDist;
        void main() {
          vColor = color;
          // Velocidad orbital mayor cuanto más cerca (3ª Ley de Kepler)
          float orbitSpeed = 2.6 / sqrt(aDistance);
          float currentAngle = aAngle + uTime * uSpeed * orbitSpeed * 0.5;
          // Espiral de atracción hacia el centro
          float pull = sin(uTime * 0.6 + aDistance) * 0.15 * uAttraction;
          float r = max(uEventHorizon, aDistance + pull);
          vec3 pos;
          pos.x = cos(currentAngle) * r;
          pos.y = position.y + sin(currentAngle * 2.0) * 0.08;
          pos.z = sin(currentAngle) * r;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vDist = -mvPosition.z;
          gl_PointSize = uPointSize * aScale * (200.0 / vDist) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.03, dist);
          float intensity = 1.0 / (1.0 + vDist * 0.04);
          gl_FragColor = vec4(vColor * intensity * uGlow * 1.4, alpha * 0.95);
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
      if (partial.attraction !== undefined) this.material.uniforms.uAttraction.value = this.params.attraction;
      if (partial.glow !== undefined) this.material.uniforms.uGlow.value = this.params.glow;
    }
  }

  setDensity(fraction) {
    const count = Math.max(500, Math.floor((this.qualitySettings.maxParticles || 10000) * fraction));
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
    if (this.mesh) {
      this.mesh.rotation.y = elapsedTime * 0.025 * this.params.rotation;
    }
    // Espiral de atracción hacia el centro (CPU)
    const positionAttr = this.mesh && this.mesh.geometry.getAttribute('position');
    if (!positionAttr) return;
    const positions = positionAttr.array;
    const angles = this.mesh.geometry.getAttribute('aAngle').array;
    const distances = this.mesh.geometry.getAttribute('aDistance').array;
    const count = Math.min(this.params.particleCount, distances.length);
    const eh = this.params.eventHorizonRadius;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const orbitSpeed = 2.8 / Math.sqrt(distances[i]);
      angles[i] += delta * orbitSpeed * this.params.speed;
      const pull = Math.sin(elapsedTime * 0.5 + distances[i]) * 0.18 * this.params.attraction;
      const r = Math.max(eh, distances[i] + pull);
      positions[i3] = Math.cos(angles[i]) * r;
      positions[i3 + 2] = Math.sin(angles[i]) * r;
    }
    positionAttr.needsUpdate = true;
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
