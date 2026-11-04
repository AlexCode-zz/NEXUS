import './styles/main.css';

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

const DEFAULT_SEED = 12345;

class NexusApp {
  constructor() {
    window.nexusApp = this;

    this.canvas = document.querySelector('#nexus-canvas');
    if (!this.canvas) {
      console.error('Canvas #nexus-canvas no encontrado');
      return;
    }

    this.seed = DEFAULT_SEED;
    this.qualitySettings = {};
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationLoop = null;
    this.worldManager = null;
    this.interactionController = null;
    this.proceduralEngine = null;
    this.galleryUI = null;

    this.diagnosticSphere = null;
    this.diagnosticCube = null;

    this.bounds = { width: window.innerWidth, height: window.innerHeight };

    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);

    this.init();
  }

  async init() {
    try {
      // Detectar dispositivo y preferencias de rendimiento
      this._detectQuality();

      // Inicializar componentes core 3D
      this.scene = new Scene();
      this.camera = new Camera();
      this.renderer = new Renderer(this.canvas, this.qualitySettings);

      // Controles de cámara (orbitar sobre el universo)
      this.camera.controls = new OrbitControls(this.camera, this.canvas);

      // Iluminación base
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);

      // Objetos de diagnóstico (esfera + cubo) — prueba de renderizado del motor
      this._addDiagnosticObjects();

      // Gestor de universos (inicialización perezosa: nada se añade hasta activar)
      this.worldManager = new WorldManager(this.scene, this.qualitySettings, this.seed);

      // Motor procedural
      this.proceduralEngine = new ProceduralEngine();
      this.proceduralEngine.setSeed(this.seed);

      // Galería y capturas
      this.galleryUI = new GalleryUI(this);

      // Controlador de interacción física (mouse/táctil)
      this.interactionController = new InteractionController(this.camera, this.renderer, this.worldManager);

      // Activar universo por defecto: Cosmos
      this.setWorld('cosmos', 'Cosmos');

      // Controles de la interfaz
      this._setupUIControls();
      this._setupKeyboardShortcuts();

      // Bucle de animación + contador FPS real
      let lastTime = performance.now();
      let frames = 0;

      this.animationLoop = new AnimationLoop((delta, elapsedTime) => {
        if (this.diagnosticSphere) {
          this.diagnosticSphere.rotation.y += delta * 0.4;
          this.diagnosticSphere.rotation.x += delta * 0.2;
        }
        if (this.diagnosticCube) {
          this.diagnosticCube.rotation.y += delta * 0.3;
          this.diagnosticCube.rotation.x += delta * 0.2;
        }

        this.camera.update();
        if (this.worldManager) {
          this.worldManager.update(delta, elapsedTime);
        }
        this.renderer.render(this.scene, this.camera);

        // FPS real
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

      // Pausar renderizado cuando la pestaña esté oculta
      document.addEventListener('visibilitychange', this._onVisibilityChange);

      // Resize (ventana + ResizeObserver cuando esté disponible)
      window.addEventListener('resize', this._onResize);
      if (window.ResizeObserver) {
        this._resizeObserver = new ResizeObserver(this._onResize);
        this._resizeObserver.observe(this.canvas);
      }

      // Iniciar renderizado
      this.animationLoop.start();

      console.log('NEXUS Engine v1.0.0 Inicializado Correctamente');
    } catch (error) {
      console.error('Error al inicializar NEXUS:', error);
      this.handleInitError(error);
    }
  }

  _detectQuality() {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      this.qualitySettings = { maxParticles: 1500, particleSize: 0.6, qualityLevel: 'low' };
    } else if (isMobile) {
      this.qualitySettings = { maxParticles: 3000, particleSize: 0.7, qualityLevel: 'medium' };
    } else {
      this.qualitySettings = { maxParticles: 12000, particleSize: 1.1, qualityLevel: 'high' };
    }
  }

  _addDiagnosticObjects() {
    // Esfera de diagnóstico
    const sphereGeometry = new THREE.SphereGeometry(0.7, 24, 24);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffcc,
      emissive: 0x003333,
      specular: 0x111111,
      shininess: 30
    });
    this.diagnosticSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(this.diagnosticSphere);

    // Cubo de diagnóstico (objeto geométrico adicional)
    const cubeGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const cubeMaterial = new THREE.MeshPhongMaterial({
      color: 0xff0055,
      emissive: 0x330011,
      specular: 0x111111,
      shininess: 30
    });
    this.diagnosticCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    this.diagnosticCube.position.set(1.6, 0, 0);
    this.scene.add(this.diagnosticCube);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === this.bounds.width && h === this.bounds.height) return;
    this.bounds.width = w;
    this.bounds.height = h;
    this.camera.resize();
    this.renderer.resize();
    // Actualizar densidad según dispositivo tras resize (mobile/desktop)
    this._detectQuality();
    if (this.renderer.instance) {
      this.renderer.instance.setPixelRatio(
        this.qualitySettings.qualityLevel === 'low'
          ? 1
          : this.qualitySettings.qualityLevel === 'medium'
            ? Math.min(window.devicePixelRatio, 1.5)
            : Math.min(window.devicePixelRatio, 2)
      );
    }
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this.animationLoop.stop();
      this._setStatus('SYSTEM PAUSED — TAB HIDDEN', false);
    } else {
      this.animationLoop.start();
      this._setStatus('SYSTEM ONLINE — WEBGL ACTIVE', true);
    }
  }

  /* ========================================================================
     API pública (usada desde el HTML)
     ======================================================================== */

  setWorld(worldName, displayName) {
    if (!this.worldManager) return;
    this.worldManager.activateWorld(worldName);
    this.updateActiveWorldInfo(displayName);
    this._syncControlsToWorld(worldName);
    this._setStatus('SYSTEM ONLINE — WEBGL ACTIVE', true);
    // Posicionar la cámara según el universo para que el contenido sea visible
    this._positionCameraForWorld(worldName);
  }

  _positionCameraForWorld(worldName) {
    const positions = {
      cosmos: { x: 0, y: 0, z: 30 },
      cyberspace: { x: 0, y: 8, z: 22 },
      solaris: { x: 0, y: 6, z: 24 },
      singularity: { x: 0, y: 0, z: 22 }
    };
    const p = positions[worldName] || positions.cosmos;
    const cam = this.camera.instance;
    cam.position.set(p.x, p.y, p.z);
    cam.lookAt(0, 0, 0);
    if (this.camera.controls) {
      this.camera.controls.update();
    }
  }

  generateNewComposition() {
    const world = this.worldManager && this.worldManager.currentWorld
      ? this.worldManager.worlds[this.worldManager.currentWorld]
      : null;
    if (!world) return;
    this.proceduralEngine.randomizeParams(world);
    this.seed = this.proceduralEngine.rng.seed;
    this._updateSeedDisplay();
    console.log(`Nueva composición generada (seed: ${this.seed})`);
  }

  randomizeParams() {
    const world = this.worldManager && this.worldManager.currentWorld
      ? this.worldManager.worlds[this.worldManager.currentWorld]
      : null;
    if (!world) return;
    this.proceduralEngine.randomizeParams(world);
    this.seed = this.proceduralEngine.rng.seed;
    this._updateSeedDisplay();
  }

  showSeedDialog() {
    const seed = prompt('Introduce una semilla numérica para reproducir una composición:', String(this.seed));
    if (seed === null) return;
    const parsed = parseInt(seed, 10);
    if (!isNaN(parsed)) {
      this.seed = parsed;
      this.proceduralEngine.setSeed(this.seed);
      this.generateNewComposition();
      this._updateSeedDisplay();
    }
  }

  resetSystem() {
    if (confirm('¿Reiniciar el sistema NEXUS?')) {
      location.reload();
    }
  }

  setEffect(effect) {
    if (!this.interactionController) return;
    this.interactionController.currentEffect = effect;
    // Marcar botón activo en la UI
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.effect === effect);
    });
  }

  updateActiveWorldInfo(name) {
    const el = document.getElementById('active-world');
    if (el) el.textContent = name;
  }

  _updateSeedDisplay() {
    const el = document.getElementById('current-seed');
    if (el) el.textContent = String(this.seed);
  }

  _setStatus(text, online) {
    const el = document.getElementById('status-text');
    const dot = document.getElementById('status-dot');
    if (el) el.textContent = text;
    if (dot) {
      dot.style.backgroundColor = online ? 'var(--accent-color)' : '#ff4444';
      dot.style.boxShadow = online ? '0 0 10px var(--accent-color)' : '0 0 10px #ff4444';
    }
  }

  /* ========================================================================
     Controles de la interfaz (sliders y botones)
     ======================================================================== */

  _setupUIControls() {
    // Seleccionar universo por botón (delegado)
    document.querySelectorAll('.nexus-btn[data-world]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setWorld(btn.dataset.world, btn.dataset.world.charAt(0).toUpperCase() + btn.dataset.world.slice(1));
        // Actualizar estado activo de botones de universo
        document.querySelectorAll('.nexus-btn[data-world]').forEach((b) => {
          b.classList.toggle('active', b.dataset.world === btn.dataset.world);
        });
      });
    });

    // Sliders del universo
    const readById = (id) => document.getElementById(id);
    const sliders = {
      density: { el: readById('ctrl-density'), val: readById('val-density'), apply: (v) => this._setDensity(v / 100) },
      speed: { el: readById('ctrl-speed'), val: readById('val-speed'), apply: (v) => this._setParam('speed', parseFloat(v)) },
      turbulence: { el: readById('ctrl-turbulence'), val: readById('val-turbulence'), apply: (v) => this._setParam('turbulence', parseFloat(v)) },
      attraction: { el: readById('ctrl-attraction'), val: readById('val-attraction'), apply: (v) => this._setParam('attraction', parseFloat(v)) },
      glow: { el: readById('ctrl-glow'), val: readById('val-glow'), apply: (v) => this._setParam('glow', parseFloat(v)) },
      rotation: { el: readById('ctrl-rotation'), val: readById('val-rotation'), apply: (v) => this._setParam('rotation', parseFloat(v)) }
    };

    for (const key of Object.keys(sliders)) {
      const s = sliders[key];
      if (!s.el || !s.val) continue;
      s.el.addEventListener('input', () => {
        s.val.textContent = s.el.value;
        s.apply(s.el.value);
      });
    }
  }

  _syncControlsToWorld(worldName) {
    // Valores por defecto razonables por universo
    const defaults = {
      cosmos: { density: 100, speed: 1.0, turbulence: 0.0, attraction: 0.0, glow: 1.2, rotation: 1.0 },
      cyberspace: { density: 60, speed: 1.2, turbulence: 0.4, attraction: 0.0, glow: 1.0, rotation: 0.6 },
      solaris: { density: 80, speed: 1.0, turbulence: 0.6, attraction: 0.0, glow: 1.4, rotation: 0.8 },
      singularity: { density: 100, speed: 1.6, turbulence: 0.2, attraction: 0.8, glow: 1.6, rotation: 1.2 }
    };
    const d = defaults[worldName] || defaults.cosmos;
    const setSlider = (id, value) => {
      const el = document.getElementById(id);
      const val = document.getElementById(id.replace('ctrl-', 'val-'));
      if (el) el.value = value;
      if (val) val.textContent = value;
    };
    setSlider('ctrl-density', d.density);
    setSlider('ctrl-speed', d.speed);
    setSlider('ctrl-turbulence', d.turbulence);
    setSlider('ctrl-attraction', d.attraction);
    setSlider('ctrl-glow', d.glow);
    setSlider('ctrl-rotation', d.rotation);
  }

  _setParam(name, value) {
    const world = this.worldManager && this.worldManager.currentWorld
      ? this.worldManager.worlds[this.worldManager.currentWorld]
      : null;
    if (!world || typeof world.setParams !== 'function') return;
    world.setParams({ [name]: value });
    // Reflejar en telemetría de partículas si el mundo expone count
    this._updateParticleCountDisplay();
  }

  _setDensity(fraction) {
    const world = this.worldManager && this.worldManager.currentWorld
      ? this.worldManager.worlds[this.worldManager.currentWorld]
      : null;
    if (!world) return;
    if (typeof world.setDensity === 'function') {
      world.setDensity(fraction);
    } else if (typeof world.setParams === 'function') {
      world.setParams({ density: fraction });
    }
    this._updateParticleCountDisplay();
  }

  _updateParticleCountDisplay() {
    const world = this.worldManager && this.worldManager.currentWorld
      ? this.worldManager.worlds[this.worldManager.currentWorld]
      : null;
    const el = document.getElementById('particle-count');
    if (!el) return;
    let count = 0;
    if (world) {
      if (typeof world.getParticleCount === 'function') count = world.getParticleCount();
      else if (world.mesh && world.mesh.geometry) count = world.mesh.geometry.attributes.position.count;
      else if (world.nodesMesh) count = world.nodesMesh.geometry.attributes.position.count;
    }
    el.textContent = count.toLocaleString();
  }

  _setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Universos [1-4]
      if (e.code === 'Digit1') { this.setWorld('cosmos', 'Cosmos'); NexusApp._setActiveUniverseBtn('cosmos'); }
      else if (e.code === 'Digit2') { this.setWorld('cyberspace', 'Cyberspace'); NexusApp._setActiveUniverseBtn('cyberspace'); }
      else if (e.code === 'Digit3') { this.setWorld('solaris', 'Solaris'); NexusApp._setActiveUniverseBtn('solaris'); }
      else if (e.code === 'Digit4') { this.setWorld('singularity', 'Singularity'); NexusApp._setActiveUniverseBtn('singularity'); }

      // Generación procedural
      if (e.code === 'KeyG') this.generateNewComposition();
      else if (e.code === 'KeyR') this.randomizeParams();
      else if (e.code === 'KeyS') this.showSeedDialog();
      else if (e.code === 'KeyP') this.galleryUI.toggleGallery(true);
      else if (e.code === 'KeyX') this.galleryUI.captureScreenshot();

      // Efectos de interacción (mouse)
      if (e.code === 'KeyA') this.setEffect('attraction');
      else if (e.code === 'KeyT') this.setEffect('turbulence');
      else if (e.code === 'KeyO') this.setEffect('rotation');

      // Ajuste de interacción
      if (e.code === 'KeyI') this._adjustInteraction(0.5, 0);
      if (e.code === 'KeyD') this._adjustInteraction(-0.5, 0);
      if (e.code === 'KeyU') this._adjustInteraction(0, 0.01);
      if (e.code === 'KeyJ') this._adjustInteraction(0, -0.01);
    });
  }

  static _setActiveUniverseBtn(world) {
    if (!window.nexusApp) return;
    document.querySelectorAll('.nexus-btn[data-world]').forEach((b) => {
      b.classList.toggle('active', b.dataset.world === world);
    });
  }

  _adjustInteraction(radiusDelta, strengthDelta) {
    if (!this.interactionController) return;
    if (radiusDelta) {
      this.interactionController.interactionRadius = Math.min(5, Math.max(1, this.interactionController.interactionRadius + radiusDelta));
      const el = document.getElementById('inter-radius');
      if (el) el.textContent = this.interactionController.interactionRadius.toFixed(1);
    }
    if (strengthDelta) {
      this.interactionController.interactionStrength = Math.min(0.1, Math.max(0.01, this.interactionController.interactionStrength + strengthDelta));
    }
    console.log(`Interacción: radio=${this.interactionController.interactionRadius.toFixed(1)} fuerza=${this.interactionController.interactionStrength.toFixed(2)}`);
  }

  /* ========================================================================
     Limpieza
     ======================================================================== */

  handleInitError(error) {
    this._setStatus('ERROR DE INICIALIZACIÓN', false);
    if (this.interactionController) this.interactionController.destroy();
    if (this.worldManager) this.worldManager.destroy();
    if (this.renderer) this.renderer.destroy();
    if (this.camera) this.camera.destroy();
    if (this.scene) this.scene.destroy();
    if (this.animationLoop) this.animationLoop.destroy();
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    if (this._resizeObserver) this._resizeObserver.disconnect();
    window.nexusApp = null;

    this.interactionController?.destroy();
    this.worldManager?.destroy();
    this.animationLoop?.destroy();
    this.renderer?.destroy();
    this.camera?.destroy();
    this.scene?.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NexusApp();
});

window.addEventListener('beforeunload', () => {
  if (window.nexusApp) window.nexusApp.destroy();
});
