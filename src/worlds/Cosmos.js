import * as THREE from 'three';

export class Cosmos {
  constructor(scene, qualitySettings) {
    this.scene = scene;
    this.mesh = null;
    this.material = null;
    this.qualitySettings = qualitySettings || {};

    this.params = {
      particleCount: qualitySettings.maxParticles || 8000,
      arms: 4,
      radius: 15,
      spin: 1,
      centerColor: 0xffffff,
      armColor: 0x00d2ff,
      outerColor: 0x7b2cbf
    };
  }

  init(params = {}) {
    Object.assign(this.params, params);

    const geometry = new THREE.BufferGeometry();
    const count = this.params.particleCount;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const colorCenter = new THREE.Color(this.params.centerColor);
    const colorArm = new THREE.Color(this.params.armColor);
    const colorOuter = new THREE.Color(this.params.outerColor);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Distribución espiral con brazos galácticos
      const r = Math.pow(Math.random(), 2) * this.params.radius;
      const spinAngle = r * this.params.spin;
      const branchAngle = ((i % this.params.arms) / this.params.arms) * Math.PI * 2;

      // Dispersión procedural
      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.8;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.4;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.8;

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      // Interpolación de colores por distancia al centro
      const mixedColor = colorCenter.clone();
      if (r < this.params.radius * 0.2) {
        mixedColor.lerp(colorArm, r / (this.params.radius * 0.2));
      } else {
        mixedColor.copy(colorArm).lerp(colorOuter, (r - this.params.radius * 0.2) / (this.params.radius * 0.8));
      }

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // Escalas variables con centro más grande
      scales[i] = (1 - r / this.params.radius) * 2.0 + Math.random() * 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    // Material personalizado para la galaxia
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aScale;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vDist;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Rotación orbital dependiente de la distancia
          float dist = length(pos.xz);
          float angle = uTime * (2.0 / (dist + 1.0)) * 0.1;
          float cosA = cos(angle);
          float sinA = sin(angle);

          mat2 rot = mat2(cosA, -sinA, sinA, cosA);
          pos.xz = rot * pos.xz;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          vDist = -mvPosition.z;
          gl_PointSize = aScale * (250.0 / vDist) * uPixelRatio;
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
          float intensity = 1.0 / (1.0 + vDist * 0.03);

          gl_FragColor = vec4(vColor * intensity * 1.2, alpha * 0.85);
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
