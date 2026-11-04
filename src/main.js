import './styles/main.css';
import './styles/interface.css';
import './styles/responsive.css';

import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { AnimationLoop } from './core/AnimationLoop.js';

class NexusApp {
  constructor() {
    this.canvas = document.querySelector('#nexus-canvas');
    if (!this.canvas) {
      console.error('Canvas #nexus-canvas no encontrado');
      return;
    }

    this.init();
  }

  init() {
    // Inicializar componentes core 3D
    this.scene = new Scene();
    this.camera = new Camera();
    this.renderer = new Renderer(this.canvas);

    // Bucle de animación
    this.animationLoop = new AnimationLoop(() => {
      this.renderer.render(this.scene, this.camera);
    });

    // Manejar redimensionamiento
    window.addEventListener('resize', () => this.onResize());

    // Iniciar renderizado
    this.animationLoop.start();

    console.log('NEXUS Engine v1.0.0 Inicializado Correctamente');
  }

  onResize() {
    this.camera.resize();
    this.renderer.resize();
  }
}

// Arrancar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  new NexusApp();
});
