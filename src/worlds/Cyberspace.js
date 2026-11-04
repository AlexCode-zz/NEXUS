import * as THREE from 'three';

export class Cyberspace {
  constructor(scene, qualitySettings) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.qualitySettings = qualitySettings || {};

    this.params = {
      nodeCount: qualitySettings.maxParticles || 150,
      connectDistance: 3.5,
      bounds: 12,
      nodeColor: 0x00ffcc,
      lineColor: 0x0066ff
    };
    this.nodes = [];
    this.lineGeometry = null;
    this.lineMesh = null;
    this.nodesMesh = null;
  }

  init(params = {}) {
    Object.assign(this.params, params);

    // Crear nodos distribuidos aleatoriamente
    const positions = new Float32Array(this.params.nodeCount * 3);
    const velocities = [];

    for (let i = 0; i < this.params.nodeCount; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * this.params.bounds;
      const y = (Math.random() - 0.5) * this.params.bounds;
      const z = (Math.random() - 0.5) * this.params.bounds;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      this.nodes.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02
        )
      });
    }

    // Geometry para Nodos
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const nodeMaterial = new THREE.PointsMaterial({
      color: this.params.nodeColor,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.nodesMesh = new THREE.Points(nodeGeometry, nodeMaterial);
    this.group.add(this.nodesMesh);

    // Geometry para Líneas de Conexión
    const maxConnections = this.params.nodeCount * this.params.nodeCount;
    this.linePositions = new Float32Array(maxConnections * 6); // 2 puntos por línea
    this.lineColors = new Float32Array(maxConnections * 6);

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });

    this.lineMesh = new THREE.LineSegments(this.lineGeometry, lineMaterial);
    this.group.add(this.lineMesh);

    this.scene.add(this.group);
  }

  update(delta, elapsedTime) {
    if (!this.nodes.length) return;

    const nodePosAttr = this.nodesMesh.geometry.getAttribute('position');
    const nodePositions = nodePosAttr.array;

    // Mover nodos
    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.position.add(node.velocity);

      // Rebotar en límites
      ['x', 'y', 'z'].forEach(axis => {
        if (Math.abs(node.position[axis]) > this.params.bounds / 2) {
          node.velocity[axis] *= -1;
        }
      });

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

        if (dist < this.params.connectDistance) {
          // Posiciones de la línea
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.x;
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.y;
          this.linePositions[lineVertexIndex++] = this.nodes[i].position.z;

          this.linePositions[lineVertexIndex++] = this.nodes[j].position.x;
          this.linePositions[lineVertexIndex++] = this.nodes[j].position.y;
          this.linePositions[lineVertexIndex++] = this.nodes[j].position.z;

          // Color/Pulso basado en distancia y tiempo
          const alpha = 1 - dist / this.params.connectDistance;
          const pulse = Math.sin(elapsedTime * 3 + dist * 2) * 0.5 + 0.5;
          const c = baseColor.clone().lerp(activeColor, pulse * alpha);

          this.lineColors[colorVertexIndex++] = c.r * alpha;
          this.lineColors[colorVertexIndex++] = c.g * alpha;
          this.lineColors[colorVertexIndex++] = c.b * alpha;

          this.lineColors[colorVertexIndex++] = c.r * alpha;
          this.lineColors[colorVertexIndex++] = c.g * alpha;
          this.lineColors[colorVertexIndex++] = c.b * alpha;
        }
      }
    }

    this.lineGeometry.setDrawRange(0, lineVertexIndex / 3);
    this.lineGeometry.getAttribute('position').needsUpdate = true;
    this.lineGeometry.getAttribute('color').needsUpdate = true;

    // Rotación suave del universo
    this.group.rotation.y = elapsedTime * 0.03;
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
    }
  }
}
