import * as THREE from 'three';

export class ParticleGenerator {
  constructor(count = 5000, spread = 15) {
    this.count = count;
    this.spread = spread;
  }

  generateSphereDistribution() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const scales = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);
    const velocities = new Float32Array(this.count * 3);

    const colorInside = new THREE.Color(0x00ffcc);
    const colorOutside = new THREE.Color(0x7b2cbf);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      // Distribución esférica procedural
      const radius = Math.cbrt(Math.random()) * this.spread;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Escala variable
      scales[i] = Math.random() * 1.5 + 0.5;

      // Colores interpolados basados en distancia al centro
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / this.spread);

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      // Velocidades individuales para física
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aCustomColor', new THREE.BufferAttribute(colors, 3));

    return { geometry, velocities };
  }

  generateGalaxyDistribution() {
    const geometry = new THREE.BufferGeometry();
    const count = this.count;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const colorCenter = new THREE.Color(0xffffff);
    const colorArm = new THREE.Color(0x00d2ff);
    const colorEdge = new THREE.Color(0x3a0ca3);

    const branches = 3;
    const radius = 12;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const r = Math.random() * radius;
      const spinAngle = r * 0.5;
      const branchAngle = ((i % branches) / branches) * Math.PI * 2;

      const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
      const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;
      const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.5;

      positions[i3] = Math.cos(branchAngle + spinAngle) * r + randomX;
      positions[i3 + 1] = randomY;
      positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + randomZ;

      scales[i] = Math.random() * 1.8 + 0.3;

      const mixedColor = colorCenter.clone();
      if (r < radius * 0.3) {
        mixedColor.lerp(colorArm, r / (radius * 0.3));
      } else {
        mixedColor.copy(colorArm).lerp(colorEdge, (r - radius * 0.3) / (radius * 0.7));
      }

      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;

      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aCustomColor', new THREE.BufferAttribute(colors, 3));

    return { geometry, velocities };
  }
}
