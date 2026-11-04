import * as THREE from 'three';
import { ParticleMaterial } from './ParticleMaterial.js';
import { ParticleGenerator } from './ParticleGenerator.js';
import { ParticlePhysics } from './ParticlePhysics.js';

export class ParticleSystem {
  constructor(scene, count = 5000) {
    this.scene = scene;
    this.count = count;
    this.mesh = null;
    this.material = null;
    this.generator = new ParticleGenerator(this.count, 15);
    this.physics = null;
    this.currentDistribution = 'sphere';

    this.init();
  }

  init() {
    this.material = new ParticleMaterial();
    this.buildDistribution(this.currentDistribution);
  }

  buildDistribution(type) {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }

    let data;
    if (type === 'galaxy') {
      data = this.generator.generateGalaxyDistribution();
    } else {
      data = this.generator.generateSphereDistribution();
    }

    this.mesh = new THREE.Points(data.geometry, this.material.instance);
    this.scene.add(this.mesh);

    if (this.physics) {
      this.physics.destroy();
    }
    this.physics = new ParticlePhysics(data.velocities);
    this.currentDistribution = type;
  }

  regenerate() {
    const nextType = this.currentDistribution === 'sphere' ? 'galaxy' : 'sphere';
    this.buildDistribution(nextType);
    console.log(`Sistema de partículas regenerado con distribución: ${nextType}`);
  }

  update(delta, elapsedTime) {
    if (this.material) {
      this.material.updateTime(elapsedTime);
    }

    if (this.mesh && this.physics) {
      const positionAttr = this.mesh.geometry.getAttribute('position');
      this.physics.update(positionAttr, delta, elapsedTime);

      // Rotación global lenta del sistema
      this.mesh.rotation.y = elapsedTime * 0.05;
    }
  }

  destroy() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh = null;
    }

    if (this.material) {
      this.material.destroy();
      this.material = null;
    }

    if (this.physics) {
      this.physics.destroy();
      this.physics = null;
    }
  }
}
