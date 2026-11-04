import './styles/main.css';
import './styles/interface.css';
import './styles/responsive.css';

import * as THREE from 'three';
import { Scene } from './core/Scene.js';
import { Camera } from './core/Camera.js';
import { Renderer } from './core/Renderer.js';
import { AnimationLoop } from './core/AnimationLoop.js';
import { OrbitControls } from './core/OrbitControls.js';
import { WorldManager } from './worlds/WorldManager.js';
import { InteractionController } from './controls/InteractionController.js';

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

      // Inicializar Gestor de Universos
      this.worldManager = new WorldManager(this.scene);
      this.worldManager.activateWorld('cosmos');

      // Inicializar Controlador de Interacción
      this.interactionController = new InteractionController(this.camera, this.renderer, this.worldManager);

      // Configurar eventos de usuario
      this.setupControls();

      // Bucle de animación
      this.animationLoop = new AnimationLoop((delta, elapsedTime) => {
        this.camera.update();
        if (this.worldManager) {
          this.worldManager.update(delta, elapsedTime);
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
    // Teclas 1-4 para cambiar entre universos
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1') {
        this.worldManager.activateWorld('cosmos');
      } else if (e.code === 'Digit2') {
        this.worldManager.activateWorld('cyberspace');
      } else if (e.code === 'Digit3') {
        this.worldManager.activateWorld('solaris');
      } else if (e.code === 'Digit4') {
        this.worldManager.activateWorld('singularity');
      }
    });

    console.log('Presiona [1-4] universos | [A,R,T,G,O] interacción | [I,D] radio | [U,J] fuerza.');
  }

  onResize() {
    this.camera.resize();
    this.renderer.resize();
  }

  handleInitError(error) {
    console.error('Fallo en la inicialización del motor 3D');
    if (this.interactionController) {
      this.interactionController.destroy();
    }
    if (this.worldManager) {
      this.worldManager.destroy();
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

    this.interactionController?.destroy();
    this.worldManager?.destroy();
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
