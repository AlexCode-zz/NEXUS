import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  resize() {
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  render(scene, camera) {
    this.instance.render(scene.instance, camera.instance);
  }
}
