import './styles/main.css';
import './styles/interface.css';
import './styles/responsive.css';

import * as THREE from 'three';
import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { OrbitControls } from './core/OrbitControls.js';
import { ParticleSystem } from './systems/ParticleSystem.js';

class NexusApp {
  constructor() {
    window.nexusApp = this;

    this.canvas = document.querySelector('#nexus-canvas');
    if (!this.canvas) {
      console.error('Canvas #nexus-canvas no encontrado');
      return;
    }

    this.init();
  }

  init() {
    try {
      // Inicializar componentes core 3D
      this.scene = new Scene();
      this.camera = new Camera();
      this.renderer = new Renderer(this.canvas);

      // Configurar controles de cámara
      this.camera.controls = new OrbitControls(this.camera, this.canvas);

      // Inicializar Sistema de Partículas (5,000 partículas)
      this.particleSystem = new ParticleSystem(this.scene, 5000);

      // Configurar eventos de usuario para regeneración
      this.setupControls();

      // Bucle de animación
      this.animationLoop = new AnimationLoop((delta, elapsedTime) => {
        this.camera.update();
        if (this.particleSystem) {
          this.particleSystem.update(delta, elapsedTime);
        }
        this.renderer.render(this.scene, this.camera);
      });

      // Manejar redimensionamiento
      window.addEventListener('resize', () => this.onResize());

      // Iniciar renderizado
      this.animationLoop.start();

      console.log('NEXUS Engine v1.0.0 Inicializado Correctamente');
    } catch (error) {
      console.error('Error al inicializar NEXUS:', error);
      this.handleInitError(error);
    }
  }

  setupControls() {
    // Tecla Espacio para regenerar distribución de partículas
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.particleSystem) {
          this.particleSystem.regenerate();
        }
      }
    });

    // Añadir instruccion en la consola o HUD si se desea
    console.log('Presiona [ESPACIO] para cambiar la distribución del universo de partículas.');
  }

  onResize() {
    this.camera.resize();
    this.renderer.resize();
  }

  handleInitError(error) {
    console.error('Fallo en la inicialización del motor 3D');
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    if (this.renderer) {
      this.renderer.destroy();
    }
    if (this.camera) {
      this.camera.destroy();
    }
    if (this.scene) {
      this.scene.destroy();
    }
    if (this.animationLoop) {
      this.animationLoop.destroy();
    }
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    window.nexusApp = null;

    this.particleSystem?.destroy();
    this.animationLoop?.destroy();
    this.renderer?.destroy();
    this.camera?.destroy();
    this.scene?.destroy();
  }
}

// Arrancar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  new NexusApp();
});

// Cleanup al cerrar página
window.addEventListener('beforeunload', () => {
  if (window.nexusApp) {
    window.nexusApp.destroy();
  }
});
