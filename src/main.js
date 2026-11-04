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
import { ProceduralEngine } from './utils/ProceduralEngine.js';
import { GalleryUI } from './utils/GalleryUI.js';

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

  async init() {
    try {
      // Cargar interfaz si existe
      await this.loadInterface();

      // Detectar preferencias de rendimiento
      this.qualitySettings = {
        maxParticles: 10000,
        particleSize: 1.0,
        qualityLevel: 'high'
      };

      // Detectar dispositivo y ajustar calidad
      if (window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        this.qualitySettings.maxParticles = 3000;
        this.qualitySettings.particleSize = 0.7;
        this.qualitySettings.qualityLevel = 'medium';
      }

      // Respetar prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.qualitySettings.qualityLevel = 'low';
        this.qualitySettings.maxParticles = 1500;
      }

      // Inicializar componentes core 3D
      this.scene = new Scene();
      this.camera = new Camera();
      this.renderer = new Renderer(this.canvas, this.qualitySettings);

      // Configurar controles de cámara
      this.camera.controls = new OrbitControls(this.camera, this.canvas);

      // Añadir luz ambiental
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      // Añadir luz direccional
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);

      // Crear esfera de diagnóstico
      const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffcc,
        emissive: 0x003333,
        specular: 0x111111,
        shininess: 30
      });
      this.diagnosticSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      this.scene.add(this.diagnosticSphere);

      // Crear cubo de diagnóstico
      const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
      const cubeMaterial = new THREE.MeshPhongMaterial({
        color: 0xff0055,
        emissive: 0x330011,
        specular: 0x111111,
        shininess: 30
      });
      this.diagnosticCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      this.diagnosticCube.position.set(2, 0, 0);
      this.scene.add(this.diagnosticCube);

      // Inicializar Gestor de Universos
      this.worldManager = new WorldManager(this.scene, this.qualitySettings);
      this.worldManager.activateWorld('cosmos');

      // Inicializar Controlador de Interacción
      this.interactionController = new InteractionController(this.camera, this.renderer, this.worldManager);

      // Inicializar Motor Procedural
      this.proceduralEngine = new ProceduralEngine();

      // Inicializar UI de Galería
      this.galleryUI = new GalleryUI(this);

      // Configurar eventos de usuario
      this.setupControls();

      // Bucle de animación con FPS Counter y optimización
      let lastTime = performance.now();
      let frames = 0;

      this.animationLoop = new AnimationLoop((delta, elapsedTime) => {
        // Rotar objetos de diagnóstico
        this.diagnosticSphere.rotation.y += delta * 0.5;
        this.diagnosticCube.rotation.x += delta * 0.3;
        this.diagnosticCube.rotation.y += delta * 0.2;

        this.camera.update();
        if (this.worldManager) {
          this.worldManager.update(delta, elapsedTime);
        }
        this.renderer.render(this.scene, this.camera);

        // Actualizar FPS
        frames++;
        const now = performance.now();
        if (now >= lastTime + 1000) {
          const fpsElement = document.getElementById('fps');
          if (fpsElement) {
            fpsElement.textContent = `FPS: ${frames}`;
          }
          frames = 0;
          lastTime = now;
        }
      });

      // Pausar render cuando la pestaña esté oculta (Page Visibility API)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.animationLoop.stop();
          console.log('NEXUS pausado (pestaña oculta)');
        } else {
          this.animationLoop.start();
          console.log('NEXUS reanudado');
        }
      });

      // Iniciar renderizado
      this.animationLoop.start();

      console.log('NEXUS Engine v1.0.0 Inicializado Correctamente');
    } catch (error) {
      console.error('Error al inicializar NEXUS:', error);
      this.handleInitError(error);
    }
  }

  async loadInterface() {
    try {
      const response = await fetch('/interface.html');
      if (response.ok) {
        const interfaceHTML = await response.text();
        const appContainer = document.getElementById('app');
        if (appContainer) {
          appContainer.insertAdjacentHTML('beforeend', interfaceHTML);
        }
      }
    } catch (e) {
      console.warn('No se pudo cargar la interfaz HTML externa:', e);
    }
  }

  setupControls() {
    // Teclas 1-4 para cambiar entre universos
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Digit1') {
        this.worldManager.activateWorld('cosmos');
        this.updateActiveWorldInfo('Cosmos');
      } else if (e.code === 'Digit2') {
        this.worldManager.activateWorld('cyberspace');
        this.updateActiveWorldInfo('Cyberspace');
      } else if (e.code === 'Digit3') {
        this.worldManager.activateWorld('solaris');
        this.updateActiveWorldInfo('Solaris');
      } else if (e.code === 'Digit4') {
        this.worldManager.activateWorld('singularity');
        this.updateActiveWorldInfo('Singularity');
      }

      // Generación procedural
      if (e.code === 'KeyG') {
        this.generateNewComposition();
      } else if (e.code === 'KeyR') {
        this.randomizeParams();
      } else if (e.code === 'KeyS') {
        this.showSeedDialog();
      }

      // Galería y capturas
      if (e.code === 'KeyP') {
        this.galleryUI.toggleGallery(true);
      } else if (e.code === 'KeyX') {
        this.galleryUI.captureScreenshot();
      }
    });

    console.log('Presiona [1-4] universos | [G] GENERATE | [R] RANDOMIZE | [S] SEED | [P] GALLERY | [X] SCREENSHOT | [A,R,T,G,O] interacción | [I,D] radio | [U,J] fuerza.');
  }

  updateActiveWorldInfo(name) {
    const infoElement = document.getElementById('active-world');
    if (infoElement) {
      infoElement.textContent = `Universe: ${name}`;
    }
  }

  generateNewComposition() {
    const currentWorld = this.worldManager.currentWorld;
    if (currentWorld && this.worldManager.worlds[currentWorld]) {
      this.proceduralEngine.randomizeParams(this.worldManager.worlds[currentWorld]);
    }
  }

  randomizeParams() {
    const currentWorld = this.worldManager.currentWorld;
    if (currentWorld && this.worldManager.worlds[currentWorld]) {
      this.proceduralEngine.randomizeParams(this.worldManager.worlds[currentWorld]);
    }
  }

  showSeedDialog() {
    const seed = prompt('Introduce una semilla numérica para reproducir una composición:');
    if (seed && !isNaN(seed)) {
      this.proceduralEngine.setSeed(parseInt(seed));
      this.generateNewComposition();
    }
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
