import * as THREE from 'three';
import { SeededRandom } from '../utils/SeededRandom.js';

/**
 * CYBER — Red tridimensional de nodos y conexiones dinámicas.
 *
 * Nodos que se mueven dentro de un volumen, conectados por líneas cuando
 * están cerca. El brillo de cada conexión pulsa según la distancia y el
 * tiempo. Soporte para densidad, velocidad, turbulencia, atracción y rotación.
 */
export class Cyberspace {
  constructor(scene, qualitySettings, seed = 12345) {
    this.scene = scene;
    this.qualitySettings = qualitySettings || {};
    this.seed = seed;
    this.group = null;
    this.nodesMesh = null;
    this.lineMesh = null;
    this.lineGeometry = null;
    this.nodes = [];
    this.count = 0;

    this.params = {
      nodeCount: Math.min((qualitySettings.maxParticles || 150), 200),
      connectDistance: 3.5,
      bounds: 12,
      nodeColor: 0x00ffcc,
      lineColor: 0x0066ff,
      speed: 1.0,
      turbulence: 0.0,
      glow: 1.0,
      rotation: 0.6
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);
    if (params.seed !== undefined) this.seed = params.seed;
    this._build();
  }

  _build() {
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

    const count = Math.max(8, Math.floor(this.params.nodeCount));
    this.count = count;

    const rng = new SeededRandom(this.seed);
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
          (rng.random() - 0.5) * 0.02,
          (rng.random() - 0.5) * 0.02,
          (rng.random() - 0.5) * 0.02
        )
      });
    }

    const group = new THREE.Group();

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      color: this.params.nodeColor,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.nodesMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    group.add(this.nodesMesh);

    const maxConnections = count * count;
    this.linePositions = new Float32Array(maxConnections * 6);
    this.lineColors = new Float32Array(maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    this.lineMesh = new THREE.LineSegments(this.lineGeometry, lineMaterial);
    group.add(this.lineMesh);

    this.group = group;
    this.scene.add(this.group);
  }

  setParams(partial) {
    Object.assign(this.params, partial);
    if (this.nodesMesh) {
      if (partial.glow !== undefined) {
        this.nodesMesh.material.opacity = 0.6 + 0.4 * this.params.glow;
      }
    }
    if (this.lineMesh) {
      if (partial.glow !== undefined) {
        this.lineMesh.material.opacity = 0.25 + 0.35 * this.params.glow;
      }
    }
  }

  setDensity(fraction) {
    const count = Math.max(8, Math.floor(Math.min((this.qualitySettings.maxParticles || 150), 200) * fraction));
    this.params.nodeCount = count;
    this._build();
  }

  getParticleCount() {
    return this.count;
  }

  update(delta, elapsedTime) {
    if (!this.nodes.length || !this.nodesMesh) return;

    const speed = this.params.speed;
    const turbulence = this.params.turbulence;
    const bounds = this.params.bounds;
    const connectDistance = this.params.connectDistance;

    const nodePosAttr = this.nodesMesh.geometry.getAttribute('position');
    const nodePositions = nodePosAttr.array;

    // Mover nodos
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      // Movimiento base + turbulencia opcional
      node.position.x += node.velocity.x * speed * 6;
      node.position.y += node.velocity.y * speed * 6;
      node.position.z += node.velocity.z * speed * 6;

      if (turbulence > 0) {
        node.position.x += (Math.random() - 0.5) * turbulence * 0.04;
        node.position.y += (Math.random() - 0.5) * turbulence * 0.04;
        node.position.z += (Math.random() - 0.5) * turbulence * 0.04;
      }

      // Rebotar en límites
      const half = bounds / 2;
      if (node.position.x > half || node.position.x < -half) node.velocity.x *= -1;
      if (node.position.y > half || node.position.y < -half) node.velocity.y *= -1;
      if (node.position.z > half || node.position.z < -half) node.velocity.z *= -1;

      const i3 = i * 3;
      nodePositions[i3] = node.position.x;
      nodePositions[i3 + 1] = node.position.y;
      nodePositions[i3 + 2] = node.position.z;
    }
    nodePosAttr.needsUpdate = true;

    // Actualizar conexiones
    let lineVertexIndex = 0;
    let colorVertexIndex = 0;
    const baseColor = new THREE.Color(this.params.lineColor);
    const activeColor = new THREE.Color(this.params.nodeColor);

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dist = this.nodes[i].position.distanceTo(this.nodes[j].position);
        if (dist < connectDistance) {
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.x;
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.y;
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.z;

          this.linePositions[lineVertexIndex++] = this.nodes[j].position.x;
          this.linePositions[lineVertexIndex++] = this.nodes[j].position.y;
          this.linePositions[lineVertexIndex++] = this.nodes[j].position.z;

          const alpha = (1.0 - dist / connectDistance) * this.params.glow;
          const pulse = Math.sin(elapsedTime * 3 + dist * 2) * 0.5 + 0.5;
          const c = baseColor.clone().lerp(activeColor, pulse * alpha);
          const ca = c.r * alpha;
          const cb = c.g * alpha;
          const cc = c.b * alpha;

          this.lineColors[colorVertexIndex++] = ca;
          this.lineColors[colorVertexIndex++] = cb;
          this.lineColors[colorVertexIndex++] = cc;
          this.lineColors[colorVertexIndex++] = ca;
          this.lineColors[colorVertexIndex++] = cb;
          this.lineColors[colorVertexIndex++] = cc;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, lineVertexIndex / 3);
    this.lineGeometry.getAttribute('position').needsUpdate = true;
    this.lineGeometry.getAttribute('color').needsUpdate = true;

    // Rotación suave del universo
    if (this.group) {
      this.group.rotation.y = elapsedTime * 0.03 * this.params.rotation;
    }
  }

  destroy() {
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
      this.nodes = [];
      this.group = null;
      this.nodesMesh = null;
      this.lineMesh = null;
      this.lineGeometry = null;
    }
    this.count = 0;
  }
}
