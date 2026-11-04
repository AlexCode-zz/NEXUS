import * as THREE from 'three';

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
  }

  update() {
    if (this.controls) {
      this.controls.update();
    }
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }

  destroy() {
    if (this.controls) {
      if (typeof this.controls.dispose === 'function') {
        this.controls.dispose();
      }
      this.controls = null;
    }
  }
}
