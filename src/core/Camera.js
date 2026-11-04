import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Camera {
  constructor() {
    this.instance = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.instance.position.set(0, 0, 5);
    this.controls = null;
    this.initControls();
  }

  initControls() {
    try {
      this.controls = new OrbitControls(this.instance, null);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 1;
      this.controls.maxDistance = 20;
    } catch (error) {
      console.warn('OrbitControls no disponible:', error.message);
      this.controls = null;
    }
  }

  update() {
    if (this.controls) {
      this.controls.update();
    }
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
    if (this.controls) {
      this.controls.handleResize();
    }
  }

  destroy() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }
}
