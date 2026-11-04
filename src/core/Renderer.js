import * as THREE from 'three';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
      depth: true
    });

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 1.0;
  }

  resize() {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(pixelRatio);
  }

  render(scene, camera) {
    this.instance.render(scene.instance, camera.instance);
  }

  destroy() {
    this.instance.dispose();
    this.instance = null;
    this.canvas = null;
  }
}
