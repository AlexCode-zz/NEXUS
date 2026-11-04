import * as THREE from 'three';

export class Solaris {
  constructor(scene, qualitySettings) {
    this.scene = scene;
    this.mesh = null;
    this.material = null;
    this.qualitySettings = qualitySettings || {};

    const gridSize = qualitySettings.maxParticles ? Math.floor(Math.sqrt(qualitySettings.maxParticles)) : 100;

    this.params = {
      gridSize: gridSize,
      spacing: 0.25,
      goldColor: 0xffaa00,
      amberColor: 0xff4400,
      waveSpeed: 1.5,
      waveHeight: 1.2
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);

    const count = this.params.gridSize * this.params.gridSize;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const colorGold = new THREE.Color(this.params.goldColor);
    const colorAmber = new THREE.Color(this.params.amberColor);

    const halfGrid = (this.params.gridSize * this.params.spacing) / 2;

    let index = 0;
    for (let x = 0; x < this.params.gridSize; x++) {
      for (let z = 0; z < this.params.gridSize; z++) {
        const i3 = index * 3;

        const posX = x * this.params.spacing - halfGrid;
        const posZ = z * this.params.spacing - halfGrid;

        positions[i3] = posX;
        positions[i3 + 1] = 0; // Se alterará en el shader
        positions[i3 + 2] = posZ;

        // Color dorado/ámbar con variaciones
        const mixRatio = Math.random();
        const c = colorGold.clone().lerp(colorAmber, mixRatio);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;

        scales[index] = Math.random() * 0.8 + 0.6;
        index++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    // Shader personalizado para ondas fluidas de energía
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uWaveSpeed: { value: this.params.waveSpeed },
        uWaveHeight: { value: this.params.waveHeight }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uWaveSpeed;
        uniform float uWaveHeight;

        attribute float aScale;
        attribute vec3 color;

        varying vec3 vColor;
        varying float vHeight;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Cálculo de múltiples ondas superpuestas
          float wave1 = sin(pos.x * 0.5 + uTime * uWaveSpeed) * uWaveHeight;
          float wave2 = cos(pos.z * 0.3 + uTime * uWaveSpeed * 0.8) * uWaveHeight * 0.8;
          float wave3 = sin(length(pos.xz) * 0.4 - uTime * uWaveSpeed * 1.2) * uWaveHeight * 0.5;

          pos.y = wave1 + wave2 + wave3;
          vHeight = pos.y;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distance = -mvPosition.z;
          gl_PointSize = aScale * (200.0 / distance) * uPixelRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vHeight;

        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.1, dist);

          // Intensidad basada en la altura de la onda (crestas más brillantes)
          float glow = smoothstep(-1.0, 2.0, vHeight) * 0.5 + 0.5;

          gl_FragColor = vec4(vColor * glow * 1.5, alpha * 0.8);
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
