import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';
import { PALETTES } from '../utils/Palettes.js';

/**
 * CYBERSPACE — Red tridimensional de nodos y conexiones dinámicas.
 *
 *  - Nodos que se derivan dentro de un volumen cúbico.
 *  - Conexiones luminosas que aparecen cuando dos nodos se aproximan.
 *    El brillo pulsa según distancia y tiempo.
 *  - Colores controlados por la paleta activa.
 *  - Soporta densidad, velocidad, turbulencia, brillo y rotación.
 */
export class Cyberspace {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.name = 'cyberspace';

    this.group = null;
    this.nodesMesh = null;
    this.lineMesh = null;
    this.lineGeometry = null;
    this.nodes = [];
    this.count = 0;
    this.paletteIndex = 0;

    this.params = {
      nodeCount: Math.min(qualitySettings.maxParticles ? Math.floor(qualitySettings.maxParticles / 90) : 130, 200),
      connectDistance: 4.6,
      bounds: 15,
      speed: 1.2,
      turbulence: 0.4,
      glow: 1.0,
      rotation: 0.6
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    if (params.palette !== undefined) this.paletteIndex = params.palette;
    this._build();
  }

  _build() {
    // Limpieza segura antes de reconstruir
    if (this.group) {
      this.scene.remove(this.group);
      if (this.nodesMesh) {
        this.nodesMesh.geometry.dispose();
        this.nodesMesh.material.dispose();
      }
      if (this.lineMesh) {
        this.lineMesh.geometry.dispose();
        this.lineMesh.material.dispose();
      }
      this.group = null;
      this.nodesMesh = null;
      this.lineMesh = null;
      this.lineGeometry = null;
      this.nodes = [];
    }

    const rng = new SeededRandom(this.seed);
    const palette = PALETTES[this.paletteIndex];
    const count = Math.max(8, Math.floor(this.params.nodeCount));
    this.count = count;
    const bounds = this.params.bounds;

    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (rng.random() - 0.5) * bounds;
      const y = (rng.random() - 0.5) * bounds;
      const z = (rng.random() - 0.5) * bounds;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      this.nodes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (rng.random() - 0.5) * 0.9,
          (rng.random() - 0.5) * 0.9,
          (rng.random() - 0.5) * 0.9
        )
      });
    }

    this.group = new THREE.Group();

    /* ---------------- Nodos ---------------- */
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(palette.inner),
      size: 0.42,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this._createGlowTexture()
    });

    this.nodesMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    this.group.add(this.nodesMesh);

    /* ---------------- Conexiones ---------------- */
    const maxConnections = count * count;
    const linePositions = new Float32Array(maxConnections * 6);
    const lineColors = new Float32Array(maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lineMesh = new THREE.LineSegments(this.lineGeometry, lineMaterial);
    this.group.add(this.lineMesh);

    this.scene.add(this.group);
  }

  /**
   * Textura de resplandor generada proceduralmente (canvas local,
   * sin recursos externos) para los nodos.
   */
  _createGlowTexture() {
    if (this._glowTexture) return this._glowTexture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    this._glowTexture = new THREE.CanvasTexture(canvas);
    return this._glowTexture;
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    if (this.nodesMesh && partial.glow !== undefined) {
      this.nodesMesh.material.opacity = Math.min(1, 0.45 + 0.5 * this.params.glow);
    }
    if (this.lineMesh && partial.glow !== undefined) {
      this.lineMesh.material.opacity = Math.min(1, 0.15 + 0.45 * this.params.glow);
    }
  }

  setDensity(fraction) {
    const base = Math.min(this.qualitySettings.maxParticles || 12000, 12000);
    this.params.nodeCount = Math.max(12, Math.min(200, Math.floor((base / 90) * fraction)));
    this._build();
  }

  setPalette(paletteIndex) {
    if (paletteIndex === this.paletteIndex) return;
    this.paletteIndex = paletteIndex;
    const palette = PALETTES[paletteIndex];
    if (this.nodesMesh) this.nodesMesh.material.color.set(palette.inner);
    if (this.lineMesh) {
      // Los vértices se recalculan en update() con los colores nuevos
      this.lineMesh.material.needsUpdate = true;
    }
    this._lineBaseColor = new THREE.Color(palette.outer);
    this._lineActiveColor = new THREE.Color(palette.inner);
  }

  setPointer() {
    // Este universo no usa shaders; la interacción del cursor se resuelve
    // por CPU en update() si se activa.
  }

  setPointerConfig() {}

  getParticleCount() {
    return this.count;
  }

  update(delta, elapsedTime) {
    if (!this.nodes.length || !this.nodesMesh) return;

    const speed = this.params.speed;
    const turbulence = this.params.turbulence;
    const bounds = this.params.bounds;
    const half = bounds / 2;
    const connectDistance = this.params.connectDistance;

    const nodePosAttr = this.nodesMesh.geometry.getAttribute('position');
    const nodePositions = nodePosAttr.array;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.position.x += node.velocity.x * speed * delta * 6;
      node.position.y += node.velocity.y * speed * delta * 6;
      node.position.z += node.velocity.z * speed * delta * 6;

      if (turbulence > 0) {
        node.position.x += (Math.random() - 0.5) * turbulence * 0.05;
        node.position.y += (Math.random() - 0.5) * turbulence * 0.05;
        node.position.z += (Math.random() - 0.5) * turbulence * 0.05;
      }

      // Rebote en los límites
      if (node.position.x > half || node.position.x < -half) node.velocity.x *= -1;
      if (node.position.y > half || node.position.y < -half) node.velocity.y *= -1;
      if (node.position.z > half || node.position.z < -half) node.velocity.z *= -1;

      const i3 = i * 3;
      nodePositions[i3] = node.position.x;
      nodePositions[i3 + 1] = node.position.y;
      nodePositions[i3 + 2] = node.position.z;
    }
    nodePosAttr.needsUpdate = true;

    /* ---------------- Conexiones ---------------- */
    let vIndex = 0;
    let cIndex = 0;
    const arr = this.lineGeometry.getAttribute('position').array;
    const col = this.lineGeometry.getAttribute('color').array;

    const palette = PALETTES[this.paletteIndex];
    const baseColor = this._lineBaseColor || new THREE.Color(palette.outer);
    const activeColor = this._lineActiveColor || new THREE.Color(palette.inner);
    const mix = new THREE.Color();

    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i].position;
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j].position;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < connectDistance * connectDistance) {
          const dist = Math.sqrt(d2);
          const strength = 1 - dist / connectDistance;
          const pulse = 0.55 + 0.45 * Math.sin(elapsedTime * 2.4 + dist * 1.6);
          const alpha = strength * pulse * (0.35 + this.params.glow * 0.65);

          arr[vIndex++] = a.x; arr[vIndex++] = a.y; arr[vIndex++] = a.z;
          arr[vIndex++] = b.x; arr[vIndex++] = b.y; arr[vIndex++] = b.z;

          mix.copy(baseColor).lerp(activeColor, pulse * strength);
          const r = mix.r * alpha;
          const g = mix.g * alpha;
          const bl = mix.b * alpha;
          col[cIndex++] = r; col[cIndex++] = g; col[cIndex++] = bl;
          col[cIndex++] = r; col[cIndex++] = g; col[cIndex++] = bl;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, vIndex / 3);
    if (vIndex > 0) {
      this.lineGeometry.getAttribute('position').needsUpdate = true;
      this.lineGeometry.getAttribute('color').needsUpdate = true;
    }

    this.group.rotation.y = elapsedTime * 0.02 * this.params.rotation;
    this.group.rotation.x = Math.sin(elapsedTime * 0.05) * 0.05;
  }

  destroy() {
    if (this.group) {
      this.scene.remove(this.group);
      if (this.nodesMesh) {
        this.nodesMesh.geometry.dispose();
        if (this.nodesMesh.material) this.nodesMesh.material.dispose();
      }
      if (this.lineMesh) {
        this.lineMesh.geometry.dispose();
        if (this.lineMesh.material) this.lineMesh.material.dispose();
      }
      this.nodes = [];
      this.group = null;
      this.nodesMesh = null;
      this.lineMesh = null;
      this.lineGeometry = null;
    }
    this.count = 0;
  }
}
