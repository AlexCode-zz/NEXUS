import * as THREE from 'three';

export class Singularity {
  constructor(scene, qualitySettings) {
    this.scene = scene;
    this.mesh = null;
    this.material = null;
    this.qualitySettings = qualitySettings || {};

    this.params = {
      particleCount: qualitySettings.maxParticles || 10000,
      eventHorizonRadius: 1.5,
      accretionDiskRadius: 10,
      coreColor: 0x000000,
      innerGlowColor: 0xff0055,
      diskColor: 0x7a00ff
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);

    const count = this.params.particleCount;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const angles = new Float32Array(count);
    const distances = new Float32Array(count);

    const colorInner = new THREE.Color(this.params.innerGlowColor);
    const colorDisk = new THREE.Color(this.params.diskColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Distancia cuadrática para concentrar partículas cerca del horizonte de eventos
      const dist = this.params.eventHorizonRadius + Math.pow(Math.random(), 2) * (this.params.accretionDiskRadius - this.params.eventHorizonRadius);
      const angle = Math.random() * Math.PI * 2;

      // Inclinación leve del disco de acreción
      const tilt = (Math.random() - 0.5) * 0.2;

      positions[i3] = Math.cos(angle) * dist;
      positions[i3 + 1] = tilt * (dist / this.params.accretionDiskRadius);
      positions[i3 + 2] = Math.sin(angle) * dist;

      angles[i] = angle;
      distances[i] = dist;

      // Color degradado: ardiente en el interior, violeta/oscuro en el exterior
      const mixRatio = (dist - this.params.eventHorizonRadius) / (this.params.accretionDiskRadius - this.params.eventHorizonRadius);
      const c = colorInner.clone().lerp(colorDisk, mixRatio);

      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      // Partículas más pequeñas y densas cerca del centro
      scales[i] = (1 - mixRatio) * 1.5 + 0.3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geometry.setAttribute('aDistance', new THREE.BufferAttribute(distances, 1));

    // Material de Agujero Negro con deformación gravitacional
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uEventHorizon: { value: this.params.eventHorizonRadius }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uEventHorizon;

        attribute float aScale;
        attribute float aAngle;
        attribute float aDistance;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vDist;

        void main() {
          vColor = color;

          // Velocidad orbital mayor mientras más cerca del centro (3ª Ley de Kepler)
          float orbitSpeed = 3.0 / sqrt(aDistance);
          float currentAngle = aAngle + uTime * orbitSpeed;

          // Espiral de atracción hacia el centro
          float pull = sin(uTime * 0.5 + aDistance) * 0.2;
          float r = max(uEventHorizon, aDistance + pull);

          vec3 pos;
          pos.x = cos(currentAngle) * r;
          pos.y = position.y + sin(currentAngle * 2.0) * 0.1;
          pos.z = sin(currentAngle) * r;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDist = -mvPosition.z;
          gl_PointSize = aScale * (220.0 / vDist) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.05, dist);

          // Intensidad con efecto de distorsión gravitacional
          gl_FragColor = vec4(vColor * 1.8, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.scene.add(this.mesh);
  }

  update(delta, elapsedTime) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsedTime;
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}
