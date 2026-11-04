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
  }

  resize() {
    this.instance.aspect = window.innerWidth / window.innerHeight;
    this.instance.updateProjectionMatrix();
  }
}
