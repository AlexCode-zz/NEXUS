import * as THREE from 'three';

export class Renderer {
  constructor(canvas, qualitySettings) {
    this.canvas = canvas;
    this.qualitySettings = qualitySettings || { qualityLevel: 'high' };

    // Configuración adaptable según calidad
    const rendererConfig = {
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      stencil: false,
      depth: true
    };

    // Ajustar pixel ratio según calidad
    const pixelRatio = this.getPixelRatio();
    rendererConfig.pixelRatio = pixelRatio;

    this.instance = new THREE.WebGLRenderer(rendererConfig);

    // Exponer el DOM element para los controladores de interacción
    this.domElement = this.instance.domElement;

    this.instance.setSize(window.innerWidth, window.innerHeight);
    this.instance.setPixelRatio(pixelRatio);

    // Sin mapeo de tonos: los colores neón del additive blending deben
    // mantener su saturación (ACES los apagaría y daría un look plano).
    this.instance.toneMapping = THREE.NoToneMapping;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;

    // Las sombras no aportan en un universo de partículas aditivas y
    // consumen rendimiento, así que se mantienen desactivadas.
    this.instance.shadowMap.enabled = false;
  }

  getPixelRatio() {
    if (this.qualitySettings.qualityLevel === 'low') return 1.0;
    if (this.qualitySettings.qualityLevel === 'medium') return Math.min(window.devicePixelRatio, 1.5);
    return Math.min(window.devicePixelRatio, 2.0);
  }

  resize() {
    const pixelRatio = this.getPixelRatio();
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
